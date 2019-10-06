import * as THREE from "three";
import seed from "../assets/seed.png";
import leaves from "../assets/plant_texture.png";

const OVERLAP = 0.1;
const SPAWNTIME = 0.6;
const NUTRIENTS_PER_SECOND = 0.5;
const MAXRADIUS = 2.3;
const CAMERA_DISTANCE = 4;

let renderer;
let scene;
let camera;

let clock = new THREE.Clock();

let plant;
let nutrients = [];

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

	checkCollision(nutrient) {
		return this.seed.checkCollision(nutrient);
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
		if (plant.checkCollision(this))
			this.markedForRemoval = true;
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

	checkCollision(nutrient) {
		scene.updateMatrixWorld();
		let distance = nutrient.mesh.position.distanceTo(this.mesh.getWorldPosition(new THREE.Vector3()));
		if (distance < (nutrient.radius + this.radius - OVERLAP) * this.mesh.scale.x) {
			this.spawnChild(nutrient.mesh.position);
			return true;
		}

		for (let i = 0; i < this.children.length; i++) {
			if (this.children[i].checkCollision(nutrient))
				return true;
		}

		return false;
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

init();
globalStep();

function init() {
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
	camera.position.z = CAMERA_DISTANCE;

	scene = new THREE.Scene();
	scene.fog = new THREE.Fog(0x000000, CAMERA_DISTANCE, CAMERA_DISTANCE * 1.03);

	plant = new Plant();

	renderer = new THREE.WebGLRenderer({
		antialias: true,
		alpha: true
	});
	renderer.setSize(window.innerWidth, window.innerHeight);

	document.body.appendChild(renderer.domElement);


	setInterval(() => {
		const gradientpool = ['#4b301f', '#163427', '#e66465', '#9198e5'];
	
		document.documentElement.style.setProperty(
			'--back-grad1',
			gradientpool[Math.floor(Math.random() * gradientpool.length)]
		);

		document.documentElement.style.setProperty(
			'--back-grad2',
			gradientpool[Math.floor(Math.random() * gradientpool.length)]
		);
	}, 5000);
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

function spawnRandomNutrient(dist, speed, axis, size) {
	let spawnVec = new THREE.Vector3(dist, 0, 0)

	spawnVec.x = dist;
	spawnVec.applyAxisAngle(axis, Math.random() * 2 * Math.PI);

	let toCenter = spawnVec
		.clone()
		.negate()
		.normalize()
		.multiplyScalar(speed);

	nutrients.push(new Nutrient(spawnVec, toCenter, size));
}

function globalStep() {
	requestAnimationFrame(globalStep);

	let dtime = clock.getDelta();

	/* Execute all plant step functions */
	plant.step(dtime);

	/* Execute all nutrient step functions */
	for (let n = 0; n < nutrients.length; n++) {
		let nutrient = nutrients[n];
		nutrient.step(dtime);
	}

	/* Remove all nutrients that are marked for removal */
	for (let n = nutrients.length - 1; n >= 0; n--) {
		if (nutrients[n].markedForRemoval) {
			nutrients[n].removeFromScene()
			nutrients.splice(n, 1)
		}
	}

	/* Randomly spawn nutrients */
	if (Math.random() < NUTRIENTS_PER_SECOND * dtime){
		spawnRandomNutrient(10, 1.5, new THREE.Vector3(0,0,1), 0.2);
	}

	if (Math.random() < 0.1 * dtime) {
		displaymessage("a testmessage", 2000);
	}

	renderer.render(scene, camera);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}


/**** Mouse Control ****/
let mouseDown = false;
renderer.domElement.addEventListener("mousemove", function() {
	if (mouseDown)
		plant.rotate(event.movementY * 0.01, event.movementX * 0.01, 0);
});

renderer.domElement.addEventListener("mousedown", function() {
	mouseDown = true;
});

renderer.domElement.addEventListener("mouseup", function() {
	mouseDown = false;
});