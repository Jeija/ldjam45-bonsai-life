import * as THREE from "three";
import * as fx from 'wafxr';
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import seed from "../assets/seed_texture.png";
import seed_map from "../assets/seed_map.png";
import seed_shiny from "../assets/seed_shiny.png";

import leaves_1 from "../assets/plant_1_texture.png";
import leaves_1_map from "../assets/plant_1_map.png";
import leaves_1_shiny from "../assets/plant_1_shiny.png";

import leaves_2 from "../assets/plant_2_texture.png";
import leaves_2_map from "../assets/plant_2_map.png";
import leaves_2_shiny from "../assets/plant_2_shiny.png";

import leaves_3 from "../assets/plant_3_texture.png";
import leaves_3_map from "../assets/plant_3_map.png";
import leaves_3_shiny from "../assets/plant_3_shiny.png";

import leaves_4 from "../assets/plant_4_texture.png";
import leaves_4_map from "../assets/plant_4_map.png";
import leaves_4_shiny from "../assets/plant_4_shiny.png";

import vertexShader from './vertex.glsl';
import fragmentShader from './fragment.glsl';

var leaves_0_array = [seed, seed_map, seed_shiny];
var leaves_1_array = [leaves_1, leaves_1_map, leaves_1_shiny];
var leaves_2_array = [leaves_2, leaves_2_map, leaves_2_shiny];
var leaves_3_array = [leaves_3, leaves_3_map, leaves_3_shiny];
var leaves_4_array = [leaves_4, leaves_4_map, leaves_4_shiny];
var leavesArray = [leaves_1_array, leaves_2_array,leaves_3_array,leaves_4_array];

import tutule from "../assets/tutule.obj";
import flowerFruit from "../assets/FlowerFruit.obj";
import flowerPetals from "../assets/FlowerPetals.obj";


const OVERLAP = 0.3;
const SPAWNTIME = 0.6;
const FLOWER_GROWTIME = 5.0;
const FRUIT_GROWTIME = 5.0;
const FLOWER_MAXSCALE = 0.001;
const FRUIT_MAXSCALE = 0.003;
const NUTRIENTS_PER_SECOND = 0.8;
const TUTULES_PER_SECOND = 0.3;
const MAXRADIUS = 2.3;
const CAMERA_DISTANCE = 4;
const LOOSEBRANCH_MAX_AGE = 2;
const GRAVITY = new THREE.Vector3(0, -10, 0);
const RISING_GRAVITY = new THREE.Vector3(0, 8, 0);
const INITIAL_TIME = 120;

const FRUIT_GAIN = 30;
const TUTULE_LOSS = 10;

const clock = new THREE.Clock();
const objloader = new OBJLoader();

const PHASE = {
	GROW : 1,
	FIGHT : 2
};

let renderer;
let scene;
let camera;

let plant;
let nutrients;
let tutules;
let looseBranches;
let risingFruits;
let gameTime;
let globaleGameTime;
let gamePhase;
let gamePoints;

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

class Plant {
	constructor() {
		this.seed = new BodySphere(new THREE.Vector3(0, 0, 0), 0.8, null);
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

		let material = new THREE.ShaderMaterial({
			uniforms: {
				colorB: { type: 'vec3', value: new THREE.Color(0xFFFF00) },
				colorA: { type: 'vec3', value: new THREE.Color(0xCCCCCC) },
				quot: { type: 'float', value: this.radius },
			},
			vertexShader,
			fragmentShader,
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
			collisionTarget.nutrientCollided(this.mesh.position);
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

class RisingFruit {
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
		this.velocity.add(RISING_GRAVITY.clone().multiplyScalar(dtime));
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
		objloader.load(tutule, obj => {
			this.mesh = obj
			this.mesh.scale.set(0.003, 0.003, 0.003)

			this.mesh.traverse(function(child) {
				if (child instanceof THREE.Mesh) {
					child.material = new THREE.ShaderMaterial({
						uniforms: {
							colorB: { type: 'vec3', value: new THREE.Color(0xC7101B) },
							colorA: { type: 'vec3', value: new THREE.Color(0x000000) },
							quot: { type: 'float', value: 50.0 },
						},
						vertexShader,
						fragmentShader,
					});
				}
			});

			scene.add(this.mesh)
			this.mesh.position.copy(position)
		});
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

				// Is not seed
				if (collisionTarget.detachFromParent()) {
					let branchVelocity = this.velocity
						.clone()
						.multiplyScalar(1.2)
						.add(new THREE.Vector3(0, 0, 3));
					looseBranches.push(new LooseBranch(collisionTarget.mesh, branchVelocity));
				} else {
					looseTime(10);
				}
			}
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
		const rndIdx = Math.floor(Math.random()*leavesArray.length)

		let material = null;
		if (this.parent === null) {
			material = new THREE.MeshPhongMaterial({
				map : new THREE.TextureLoader().load(leaves_0_array[0]),
				bumpMap: new THREE.TextureLoader().load(leaves_0_array[1]),

				bumpScale: 0.5,
				side : THREE.DoubleSide,
				transparent : true,

				specularMap : THREE.ImageUtils.loadTexture(leaves_0_array[2]),
				specular : new THREE.Color(0x55855e)
			});
		} else {
			material = new THREE.MeshPhongMaterial({
				map : new THREE.TextureLoader().load(leavesArray[rndIdx][0]),
				bumpMap: new THREE.TextureLoader().load(leavesArray[rndIdx][1]),

				bumpScale: 0.5,
				side : THREE.DoubleSide,
				transparent : true,

				specularMap : THREE.ImageUtils.loadTexture(leavesArray[rndIdx][2]),
				specular : new THREE.Color(0x55855e)
			});
		}

		this.mesh = new THREE.Mesh(geometry, material);

		if (this.parent !== null)
			this.parent.mesh.add(this.mesh);
		else
			scene.add(this.mesh);	}

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

	nutrientCollided(position) {
		/* Spawn Child */
		let distanceFromOrigin = position.length();

		/* Determine type and size of child here */
		let radius = (MAXRADIUS - distanceFromOrigin) * 0.3;

		let child;
		if (this.depth >= 4) {
			child = new Flower(this.mesh.worldToLocal(position), radius, this);
		} else {
			child = new BodySphere(this.mesh.worldToLocal(position), radius, this);
		}

		this.children.push(child);

		playSound(soundArray.addNutrient);
		gainPoints(5);
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

class Flower {
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

		/* No fruit yet */
		this.hasFruit = false;
		this.fruitmesh = null;
		this.fruitAge = 0;

	}

	addToScene() {
		/* Sphere */
		let geometry = new THREE.SphereGeometry(this.radius, 100 * this.radius, 100 * this.radius);
		let material = new THREE.MeshPhongMaterial({
			map : new THREE.TextureLoader().load(leaves_4_array[0]),
			bumpMap: new THREE.TextureLoader().load(leaves_4_array[1]),

			bumpScale: 0.5,
			side : THREE.DoubleSide,
			transparent : true,

			specularMap : THREE.ImageUtils.loadTexture(leaves_4_array[2]),
			specular : new THREE.Color(0x55855e)
		});
		this.mesh = new THREE.Mesh(geometry, material);

		if (this.parent !== null)
			this.parent.mesh.add(this.mesh);
		else
			scene.add(this.mesh);

		/* Flower */
		this.flowermesh = null;
		objloader.load(flowerPetals, (obj) => {
			this.flowermesh = obj;
			this.flowermesh.scale.set(0.0, 0.0, 0.0);


			this.flowermesh.traverse(function(child) {
				if (child instanceof THREE.Mesh) {
					child.material = new THREE.ShaderMaterial({
						uniforms: {
							colorB: { type: 'vec3', value: new THREE.Color(0x9272d3) },
							colorA: { type: 'vec3', value: new THREE.Color(0x19ac92) },
							quot: { type: 'float', value: 50.0 },
						},
						vertexShader,
						fragmentShader,
					});
				}
			});

			this.mesh.add(this.flowermesh);
			this.flowermesh.lookAt(new THREE.Vector3().multiplyScalar(2));
			this.flowermesh.rotateX(-Math.PI / 2);
			this.flowermesh.translateY(this.radius);
		});
	}

	addFruit() {
		objloader.load(flowerFruit, (obj) => {
			this.fruitmesh = obj;
			this.fruitmesh.scale.set(0.003, 0.003, 0.003);

			this.fruitmesh.traverse(function(child) {
				if (child instanceof THREE.Mesh) {
					child.material = new THREE.ShaderMaterial({
						uniforms: {
							colorB: { type: 'vec3', value: new THREE.Color(0x670003) },
							colorA: { type: 'vec3', value: new THREE.Color(0xFF7F50) },
							quot: { type: 'float', value: 50.0 },
						},
						vertexShader,
						fragmentShader,
					});
				}
			});

			this.mesh.add(this.fruitmesh);
			this.fruitmesh.lookAt(new THREE.Vector3().multiplyScalar(2));
			this.fruitmesh.rotateX(Math.PI / 2);
			this.fruitmesh.translateY(-2 * this.radius);
			this.hasFruit = true;
		});
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

	nutrientCollided(position) {
		if (this.hasFruit) {
			if (this.fruitAge > FRUIT_GROWTIME) {
				this.hasFruit = false;
				this.fruitAge = 0;
				gainTime(20);
				gainPoints(50);

				risingFruits.push(new RisingFruit(this.fruitmesh, new THREE.Vector3()));
			}
		} else if (this.age > FLOWER_GROWTIME) {
			this.addFruit();
			gainPoints(20);
		}
	}

	detachFromParent() {
		if (this.parent !== null) {
			this.parent.detachChild(this);
			return true;
		} else {
			return false;
		}
	}

	step(dtime) {
		this.age += dtime;

		/* Spawn flower sphere */
		if (this.age < SPAWNTIME) {
			let size = 1 - Math.pow(this.age / SPAWNTIME - 1, 2);
			this.mesh.scale.set(size, size, size);
		} else {
			this.mesh.scale.set(1, 1, 1);
		}

		/* Grow flower */
		if (this.flowermesh) {
			let size = this.age < FLOWER_GROWTIME ?
				(1 - Math.pow(this.age / FLOWER_GROWTIME - 1, 2)) * FLOWER_MAXSCALE :
				FLOWER_MAXSCALE;
			this.flowermesh.scale.set(size, size, size);
		}

		/* Grow fruit */
		if (this.hasFruit) {
			this.fruitAge += dtime;
			let size = this.fruitAge < FRUIT_GROWTIME ?
				(1 - Math.pow(this.fruitAge / FRUIT_GROWTIME - 1, 2)) * FRUIT_MAXSCALE :
				FRUIT_MAXSCALE;
			this.fruitmesh.scale.set(size, size, size);
		}


		if (this.hasFruit) {
			this.fruitmesh.rotateY(Math.PI * dtime);
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

	/* Initialize light */
	scene.add(new THREE.AmbientLight(0x888888));

	let dirLight = new THREE.DirectionalLight('white', 1);
	dirLight.position.set(15, 15, 15);
	dirLight.target.position.set(10, 10, 10);
	dirLight.castShadow = true;

	// Set up shadow properties for the light
	dirLight.shadow.mapSize.width = 512;	// default
	dirLight.shadow.mapSize.height = 512; // default
	dirLight.shadow.camera.near = 0.5;		// default
	dirLight.shadow.camera.far = 500;		 // default
	scene.add(dirLight);

	let light = new THREE.DirectionalLight(0xcccccc, 1);
	light.position.set(5, 3, 5);
	scene.add(light);

	/* Reset game */
	nutrients = [];
	tutules = [];
	looseBranches = [];
	risingFruits = [];
	gameTime = INITIAL_TIME;
	globaleGameTime = 0;
	gamePhase = PHASE.GROW;
	gamePoints = 0;
	gameRunning = true;
	plant = new Plant();

	/* Start game */
	addInputListeners();
	globalStep();
	enterGrowPhase();
}

function displaymessage(message, timeout) {
	const el = document.getElementById('message');
	el.textContent = message;

	el.classList.add("visible");
	el.classList.remove("hidden");

	setTimeout(() => {
		el.classList.add("hidden");
		el.classList.remove("visible");
	}, timeout);
}

function setGrowBackground() {
	setBackground("#9198e5", "#163427");
}

function setFightBackground() {
	setBackground("#4b301f", "#163427");
}

function setBackground(innerColor, outerColor) {
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

function enterGrowPhase() {
	gamePhase = PHASE.GROW;
	displaymessage("Grow!", 2000);
	setGrowBackground();
}

function enterFightPhase() {
	gamePhase = PHASE.FIGHT;
	displaymessage("Fight!", 2000);
	setFightBackground();
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

	/* Execute all rising fruit step functions */
	for (let n = 0; n < risingFruits.length; n++) {
		let risingFruit = risingFruits[n];
		risingFruit.step(dtime);
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

	/* Remove all rising fruits that are marked for removal */
	for (let n = risingFruits.length - 1; n >= 0; n--) {
		if (risingFruits[n].markedForRemoval) {
			risingFruits[n].removeFromScene()
			risingFruits.splice(n, 1)
		}
	}

	/* Randomly spawn nutrients */
	if (gamePhase === PHASE.GROW && Math.random() < NUTRIENTS_PER_SECOND * dtime){
		spawnRandomNutrient(7, 1.5, new THREE.Vector3(0, 0, 1), 0.2);
	}

	/* Randomly spawn tutules */
	if (gamePhase === PHASE.FIGHT && Math.random() < TUTULES_PER_SECOND * dtime){
		spawnRandomTutule(7, 1.5, new THREE.Vector3(0, 0, 1));
	}

	gameTime -= dtime;
	globaleGameTime += dtime;

	document.querySelector("#timeEl").textContent = gameTime.toFixed(1) + "s";

	renderer.render(scene, camera);

	/* Handle remaining game time */
	const lifebar = document.querySelector(".Lifetime");
	lifebar.style.setProperty("width", Math.round((gameTime / INITIAL_TIME) * 76.0) + "vw");

	if (gameTime < 30){
		document.documentElement.style.setProperty(
			'--stripe-col',
			"#e66465"
		);
	} else {
		document.documentElement.style.setProperty(
			'--stripe-col',
			"#465298"
		);
	}


	/* Grow / Fight Logic */
	let decider = Math.round(globaleGameTime / 10);
	decider = decider % 5;

	if (decider >= 3 && gamePhase !== PHASE.FIGHT)
		enterFightPhase();
	else if (decider < 3 && gamePhase !== PHASE.GROW)
		enterGrowPhase();

	if (gameTime <= 0) {
		finishgame()
	}
}

function onWindowResize() {
	if (camera) {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}
}

function gainTime(time) {
	let newGameTime = Math.min(INITIAL_TIME, gameTime + time);
	let increase = newGameTime - gameTime;
	displaymessage("+" + increase.toFixed(1) + "s", 2000);
	gameTime += increase;
}

function gainPoints(points) {
	gamePoints += points;
	document.querySelector("#points").textContent = gamePoints.toFixed(0).padStart(3, '0');
}

function looseTime(time) {
	displaymessage("-" + time + "s", 2000);
	gameTime -= time;
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