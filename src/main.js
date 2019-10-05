import * as THREE from "three";

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
		this.spheres.push(this.seed)
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
		// TODO
	}
}

class Nutrient {
	constructor(position, velocity, radius) {
		this.velocity = velocity;
		this.radius = radius;
		this.addToScene();
		this.mesh.position.copy(position);
	}

	addToScene() {
		let geometry = new THREE.SphereGeometry(this.radius, 10, 10);
		let material = new THREE.MeshNormalMaterial();
		this.mesh = new THREE.Mesh(geometry, material);
		scene.add(this.mesh)
	}

	step(dtime) {
		//console.log(this.velocity.clone());
		this.mesh.position.add(this.velocity.clone().multiplyScalar(dtime));
	}
}

class BodySphere {
	constructor(position, radius, parent) {
		this.position = position;
		this.radius = radius;
		this.parent = parent;

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
}

window.addEventListener("resize", onWindowResize, false);

init();
step();

function init() {
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
	camera.position.z = 2;

	scene = new THREE.Scene();

	plant = new Plant()
	let leaf1 = new BodySphere(new THREE.Vector3(0.3, 0, 0), 0.2, plant.seed)
	let leaf2 = new BodySphere(new THREE.Vector3(0, 0.3, 0), 0.2, plant.seed)
	let leaf3 = new BodySphere(new THREE.Vector3(0, 0.3, 0), 0.2, leaf2)

	nutrients.push(new Nutrient(
		new THREE.Vector3(-2.0, 0, 0),
		new THREE.Vector3(1, 0, 0),
		0.2
	));

	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);
}

function step() {
	requestAnimationFrame(step);

	let dtime = clock.getDelta();
	for (let n = 0; n < nutrients.length; n++) {
		let nutrient = nutrients[n];
		nutrient.step(dtime);
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