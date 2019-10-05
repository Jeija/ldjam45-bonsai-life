import * as THREE from "three";

const OVERLAP = 0.1;
const SPAWNTIME = 0.3;

let renderer;
let scene;
let camera;

let clock = new THREE.Clock();

let plant;
let nutrients = [];

class Plant {
	constructor() {
		this.spheres = []

		this.seed = new BodySphere(new THREE.Vector3(0, 0, 0), 0.2, null)
		this.spheres.push(this.seed)
	}

	addBodySphere(sphere) {
		this.spheres.push(sphere)
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
		for (let i = 0; i < this.spheres.length; i++) {
			if (this.spheres[i].checkCollision(nutrient))
				return true;
		}
	}

	step(dtime) {
		for (let n = 0; n < this.spheres.length; n++) {
			let sphere = this.spheres[n];
			sphere.step(dtime);
		}
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
		let geometry = new THREE.SphereGeometry(this.radius, 10, 10);
		let material = new THREE.MeshBasicMaterial({ color: 0xf0b010 });
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
		this.age = 0;

		this.addToScene();

		this.mesh.position.copy(position);
	}

	addToScene() {
		let geometry = new THREE.SphereGeometry(this.radius, 10, 10);
		let material = new THREE.MeshNormalMaterial();
		this.mesh = new THREE.Mesh(geometry, material);

		if (this.parent !== null)
			this.parent.mesh.add(this.mesh);
		else
			scene.add(this.mesh);
	}

	checkCollision(nutrient) {
		//scene.updateMatrixWorld();
		let distance = nutrient.mesh.position.distanceTo(this.mesh.getWorldPosition(new THREE.Vector3()));
		if (distance < nutrient.radius + this.radius - OVERLAP) {
			plant.addBodySphere(new BodySphere(this.mesh.worldToLocal(nutrient.mesh.position), 0.2, this));
			return true;
		}

		return false;
	}

	step(dtime) {
		this.age += dtime;

		if (this.age < SPAWNTIME) {
			let size = this.age / SPAWNTIME;
			this.mesh.scale.set(size, size, size);
		} else {
			this.mesh.scale.set(1, 1, 1);
		}
	}
}

window.addEventListener("resize", onWindowResize, false);

init();
globalStep();

function init() {
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
	camera.position.z = 2;

	scene = new THREE.Scene();

	plant = new Plant()
	let leaf1 = new BodySphere(new THREE.Vector3(0.3, 0, 0), 0.2, plant.seed)
	let leaf2 = new BodySphere(new THREE.Vector3(0, 0.3, 0), 0.2, plant.seed)
	let leaf3 = new BodySphere(new THREE.Vector3(0, 0.3, 0), 0.2, leaf2)
	plant.addBodySphere(leaf1);
	plant.addBodySphere(leaf2);
	plant.addBodySphere(leaf3);

	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);
}

setInterval(function() {
	nutrients.push(new Nutrient(
		new THREE.Vector3(-2.0, 0, 0),
		new THREE.Vector3(1, 0, 0),
		0.2
	));
}, 2000);

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