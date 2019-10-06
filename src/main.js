import * as THREE from "three";
import * as fx from 'wafxr';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

import seed from "../assets/seed.png";
import leaves from "../assets/plant_texture.png";
import tutule from "../assets/tutule_morph.gltf";
//import tutuleArms from "../assets/tutuleArms.fbx";
//import tutuleKopf from "../assets/tutuleKopf.fbx";

const OVERLAP = 0.3;
const SPAWNTIME = 0.6;
const NUTRIENTS_PER_SECOND = 0.8;
const TUTULES_PER_SECOND = 0.2;
const MAXRADIUS = 2.3;
const CAMERA_DISTANCE = 4;
const LOOSEBRANCH_MAX_AGE = 2;
const GRAVITY = new THREE.Vector3(0, -10, 0);
const INITIAL_TIME = 120;

const clock = new THREE.Clock();
const gltfloader = new GLTFLoader();
const fbxloader = new FBXLoader();

let renderer;
let scene;
let camera;

let plant;
let nutrients;
let tutules;
let looseBranches;
let gameTime;

let gameRunning = false;


const soundArray = {
	changeNightDay: {
		volume: -10,
		sustain: 0.0798,
		release: 0.1687,
		frequency: 831,
		sweep: 0.63,
		repeat: 16.47,
		source: 'sine',
	},
	addNutrient: {
		volume: -10,
		sustain: 0.0867,
		release: 0.3075,
		frequency: 248.4,
		jumpAt1: 0.1072,
		jumpBy1: 0.321,
		source: 'sine',
	},
	explode: {
		volume: -10,
		sustain: 0.064,
		release: 0.3215,
		source: 'brown noise',
		bandpass: 302.8,
		bandpassQ: 1.12,
		bandpassSweep: -468.2,
		compressorThreshold: -39.03,
	},
};

const gradientArray = ['#4b301f', '#163427', '#e66465', '#9198e5'];

class Plant {
	constructor() {
		this.seed = new BodySphere(new THREE.Vector3(0, 0, 0), 0.8, null)
	}

	rotate(x, y, z) {
		let xaxis = new THREE.Vector3(1, 0, 0);
		let yaxis = new THREE.Vector3(0, 1, 0);
		let zaxis = new THREE.Vector3(0, 0, 1);

		this.seed.mesh.rotateOnWorldAxis(xaxis, x);
		this.seed.mesh.rotateOnWorldAxis(yaxis, y);
		this.seed.mesh.rotateOnWorldAxis(zaxis, z);
	}

	checkCollision(foreignBody) {
		return this.seed.checkCollision(foreignBody);
	}

	step(dtime) {
		this.seed.step(dtime);
	}
}

class Nutrient {
	constructor(position, velocity, radius) {
		this.velocity = velocity;
		this.radius = radius;
		this.addToScene();
		this.mesh.position.copy(position);
		this.markedForRemoval = false;
	}

	addToScene() {
		let geometry = new THREE.SphereGeometry(this.radius, this.radius, this.radius);
		let material = new THREE.MeshBasicMaterial({
			color: 0xf0b010,
			map : new THREE.TextureLoader().load(seed),
			side : THREE.DoubleSide
		});
		this.mesh = new THREE.Mesh(geometry, material);
		scene.add(this.mesh)
	}

	removeFromScene() {
		scene.remove(this.mesh)
	}

	step(dtime) {
		this.mesh.position.add(this.velocity.clone().multiplyScalar(dtime));
		let collisionTarget = plant.checkCollision(this);
		if (collisionTarget) {
			this.markedForRemoval = true;
			collisionTarget.spawnChild(this.mesh.position);
			playSound(soundArray.addNutrient);
			displaymessage( "+10", 1000);
		}
	}
}

class LooseBranch {
	constructor(mesh, velocity) {
		this.velocity = velocity;
		this.mesh = mesh;
		this.age = 0;
		this.markedForRemoval = false;

		scene.attach(mesh);
	}

	removeFromScene() {
		scene.remove(this.mesh)
	}

	step(dtime) {
		this.velocity.add(GRAVITY.clone().multiplyScalar(dtime));
		this.mesh.position.add(this.velocity.clone().multiplyScalar(dtime));
		this.age += dtime;

		if (this.age > LOOSEBRANCH_MAX_AGE) {
			this.markedForRemoval = true;
		}
	}
}

class Tutule {
	constructor(position, velocity, angularVelocity) {
		this.velocity = velocity;
		this.radius = 0.4;
		this.addToScene(position);
		this.markedForRemoval = false;
		this.angularVelocity = angularVelocity;
	}

	addToScene(position) {
		gltfloader.load(tutule, (gltf) => {
			this.mesh = gltf.scene;
			this.mesh.scale.set(0.003, 0.003, 0.003);

			this.animationmixer = new THREE.AnimationMixer(this.mesh);
			gltf.animations.forEach((clip) => {
				this.animationmixer.clipAction(clip).play();
			});

			scene.add(this.mesh);
			this.mesh.position.copy(position);
		});

		/*fbxloader.load(tutuleKopf, (fbx) => {
			this.animationmixer = new THREE.AnimationMixer(fbx);
			fbx.animations.forEach((clip) => {
				this.animationmixer.clipAction(clip).play();
			});

			scene.add(fbx);
			this.mesh.scale.set(0.003, 0.003, 0.003);
			this.mesh.position.copy(position);
		});*/

		/*let geometry = new THREE.SphereGeometry(0.2, 10, 10);
		let material = new THREE.MeshBasicMaterial({
			color: 0xffa000,
			side : THREE.DoubleSide
		});
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.scale.set(0.1, 0.1, 0.1);
		scene.add(this.mesh)*/
	}

	removeFromScene() {
		scene.remove(this.mesh)
	}

	step(dtime) {
		if (this.mesh) {
			this.mesh.position.add(this.velocity.clone().multiplyScalar(dtime));
			this.mesh.rotateOnAxis(this.angularVelocity.clone().normalize(), this.angularVelocity.length());

			let collisionTarget = plant.checkCollision(this);
			if (collisionTarget) {
				this.markedForRemoval = true;
				if (collisionTarget.detachFromParent()) {
					let branchVelocity = this.velocity
						.clone()
						.multiplyScalar(1.2)
						.add(new THREE.Vector3(0, 0, 3));
					looseBranches.push(new LooseBranch(collisionTarget.mesh, branchVelocity));
				}
			}

			this.animationmixer.update(dtime);
		}
	}
}

class BodySphere {
	constructor(position, radius, parent) {
		this.radius = radius;
		this.parent = parent;
		this.children = [];
		this.age = 0;
		this.depth = parent != null ? (parent.depth + 1) : 0;

		this.addToScene();

		this.mesh.rotateX(Math.random(Math.PI));
		this.mesh.rotateY(Math.random(Math.PI));
		this.mesh.rotateZ(Math.random(Math.PI));
		this.mesh.position.copy(position);
	}

	addToScene() {
		let geometry = new THREE.SphereGeometry(this.radius, 50 * this.radius, 50 * this.radius);
		let material = new THREE.MeshBasicMaterial({
			map : new THREE.TextureLoader().load(seed),
			side : THREE.DoubleSide,
			transparent : true
		});
		this.mesh = new THREE.Mesh(geometry, material);

		if (this.parent !== null)
			this.parent.mesh.add(this.mesh);
		else
			scene.add(this.mesh);
	}

	checkCollision(foreignBody) {
		scene.updateMatrixWorld();
		let distance = foreignBody.mesh.position.distanceTo(this.mesh.getWorldPosition(new THREE.Vector3()));
		if (distance < (foreignBody.radius + this.radius) * (1 - OVERLAP) * this.mesh.scale.x) {
			return this;
		}

		for (let i = 0; i < this.children.length; i++) {
			let childCollision = this.children[i].checkCollision(foreignBody);
			if (childCollision !== false)
				return childCollision;
		}

		return false;
	}

	detachChild(child) {
		this.children.splice(this.children.indexOf(child), 1);
	}

	detachFromParent() {
		if (this.parent !== null) {
			this.parent.detachChild(this);
			return true;
		} else {
			return false;
		}
	}

	spawnChild(position) {
		let distanceFromOrigin = position.length();

		/* Determine type and size of child here */
		let radius = (MAXRADIUS - distanceFromOrigin) * 0.3;

		let child = new BodySphere(this.mesh.worldToLocal(position), radius, this);
		this.children.push(child);
	}

	step(dtime) {
		this.age += dtime;

		if (this.age < SPAWNTIME) {
			let size = 1 - Math.pow(this.age / SPAWNTIME - 1, 2);
			this.mesh.scale.set(size, size, size);
		} else {
			this.mesh.scale.set(1, 1, 1);
		}

		for (let i = 0; i < this.children.length; i++) {
			this.children[i].step(dtime);
		}
	}
}

window.addEventListener("resize", onWindowResize, false);


document.getElementById("startbutton").onclick = function() {
	document.querySelector("#startpage").style.display = "none";
	document.querySelector("#gamepage").classList.remove("hidden");
	document.querySelector("#gamepage").classList.add("visible");

	initGame();
}

function finishgame(){
	/* Stop three.js */
	gameRunning = false;
	document.body.removeChild(renderer.domElement);
	renderer = null;
	scene.dispose();
	camera = null;

	/* Show start screen */
	document.querySelector("#startpage").style.display = "block";
	document.querySelector("#gamepage").classList.add("hidden");
	document.querySelector("#gamepage").classList.remove("visible");
}

function initGame() {
	/* Start three.js */
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
	camera.position.z = CAMERA_DISTANCE;

	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer({
		antialias: true,
		alpha: true
	});
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	/* Reset game */
	nutrients = [];
	tutules = [];
	looseBranches = [];
	gameTime = INITIAL_TIME;
	gameRunning = true;
	plant = new Plant();

	/* Start game */
	addInputListeners();
	globalStep();
}

function displaymessage(message, timeout) {
	const el = document.getElementById('message');
	el.textContent = message;

	el.classList.add('visible');
	el.classList.remove('hidden');

	setTimeout(() => {
		el.classList.add('hidden');
		el.classList.remove('visible');
	}, timeout);
}

function setRandomBackground() {
	let innerColor = gradientArray[Math.floor(Math.random() * gradientArray.length)];
	let outerColor = gradientArray[Math.floor(Math.random() * gradientArray.length)];

	document.documentElement.style.setProperty(
		'--back-grad1',
		innerColor
	);

	document.documentElement.style.setProperty(
		'--back-grad2',
		outerColor
	);

	scene.fog = new THREE.Fog(new THREE.Color(innerColor), CAMERA_DISTANCE, CAMERA_DISTANCE * 1.03);
}

function playSound(opt) {
	fx.play(opt)
}

function spawnRandomNutrient(dist, speed, axis, size) {
	let spawnVec = new THREE.Vector3(dist, 0, 0);

	spawnVec.x = dist;
	spawnVec.applyAxisAngle(axis, Math.random() * 2 * Math.PI);

	let toCenter = spawnVec
		.clone()
		.negate()
		.normalize()
		.multiplyScalar(speed);

	nutrients.push(new Nutrient(spawnVec, toCenter, size));
}

function spawnRandomTutule(dist, speed, axis) {
	let spawnVec = new THREE.Vector3(dist, 0, 0);

	spawnVec.x = dist;
	spawnVec.applyAxisAngle(axis, Math.random() * 2 * Math.PI);

	let toCenter = spawnVec
		.clone()
		.negate()
		.normalize()
		.multiplyScalar(speed);

	let angularVelocity = new THREE.Vector3(1, 0, 0)
		.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.random() * 2 * Math.PI)
		.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 2 * Math.PI)
		.multiplyScalar(0.1);

	tutules.push(new Tutule(spawnVec, toCenter, angularVelocity));
}

function globalStep() {
	if (gameRunning !== true)
		return;

	requestAnimationFrame(globalStep);

	let dtime = clock.getDelta();

	/* Execute all plant step functions */
	plant.step(dtime);

	/* Execute all nutrient step functions */
	for (let n = 0; n < nutrients.length; n++) {
		let nutrient = nutrients[n];
		nutrient.step(dtime);
	}

	/* Execute all tutule step functions */
	for (let n = 0; n < tutules.length; n++) {
		let tutule = tutules[n];
		tutule.step(dtime);
	}

	/* Execute all loose branch step functions */
	for (let n = 0; n < looseBranches.length; n++) {
		let looseBranch = looseBranches[n];
		looseBranch.step(dtime);
	}


	/* Remove all nutrients that are marked for removal */
	for (let n = nutrients.length - 1; n >= 0; n--) {
		if (nutrients[n].markedForRemoval) {
			nutrients[n].removeFromScene()
			nutrients.splice(n, 1)
		}
	}

	/* Remove all tutules that are marked for removal */
	for (let n = tutules.length - 1; n >= 0; n--) {
		if (tutules[n].markedForRemoval) {
			tutules[n].removeFromScene()
			tutules.splice(n, 1)
		}
	}

	/* Remove all loose branches that are marked for removal */
	for (let n = looseBranches.length - 1; n >= 0; n--) {
		if (looseBranches[n].markedForRemoval) {
			looseBranches[n].removeFromScene()
			looseBranches.splice(n, 1)
		}
	}

	/* Randomly spawn nutrients */
	if (Math.random() < NUTRIENTS_PER_SECOND * dtime){
		spawnRandomNutrient(10, 1.5, new THREE.Vector3(0, 0, 1), 0.2);
	}

	/* Randomly spawn tutules */
	if (Math.random() < TUTULES_PER_SECOND * dtime){
		spawnRandomTutule(10, 1.5, new THREE.Vector3(0, 0, 1));
	}

	/* TODO: Randomly display messages */
	if (Math.random() < 0.1 * dtime) {
		displaymessage("a testmessage", 2000);
	}

	gameTime -= dtime;
	document.querySelector("#timeEl").textContent = gameTime.toFixed(2);

	renderer.render(scene, camera);

	if (gameTime <= 0) {
		finishgame()
	}
}

/* TODO: Randomly change background gradient */
//setInterval(() => {
//	setRandomBackground()
//}, 10000);

function onWindowResize() {
	if (camera) {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}
}


/**** Mouse + Touch Control ****/
function addInputListeners() {
	let mouseDown = false;
	let touchtrack = {x: 0, y: 0};
	renderer.domElement.addEventListener("mousemove", function() {
		if (mouseDown)
			plant.rotate(event.movementY * 0.005, event.movementX * 0.005, 0);
	});

	renderer.domElement.addEventListener("touchmove", function() {
		const movX = event.touches[0].clientX - touchtrack.x;
		const movY = event.touches[0].clientY - touchtrack.y;
		plant.rotate(movY * 0.01, movX * 0.01, 0);

		touchtrack.x = event.touches[0].clientX;
		touchtrack.y = event.touches[0].clientY;
	});

	renderer.domElement.addEventListener("mousedown", function() {
		mouseDown = true;
	});

	renderer.domElement.addEventListener("mouseup", function() {
		mouseDown = false;
	});

	renderer.domElement.addEventListener("touchdown", function() {
		touchtrack.x = event.touches[0].clientX;
		touchtrack.y = event.touches[0].clientY;
	});
}