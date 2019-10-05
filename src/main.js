import * as THREE from "three";

let renderer;
let scene;
let camera;
let plant;

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
		var xaxis = new THREE.Vector3(1, 0, 0);
		var yaxis = new THREE.Vector3(0, 1, 0);
		var zaxis = new THREE.Vector3(0, 0, 1);

		this.seed.mesh.rotateOnWorldAxis(xaxis, x);
		this.seed.mesh.rotateOnWorldAxis(yaxis, y);
		this.seed.mesh.rotateOnWorldAxis(zaxis, z);
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
		let geometry = new THREE.SphereGeometry(this.radius, 20, 20);
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
animate();

function init() {
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
	camera.position.z = 2;

	scene = new THREE.Scene();

	plant = new Plant()
	let leaf1 = new BodySphere(new THREE.Vector3(0.3, 0, 0), 0.2, plant.seed)
	let leaf2 = new BodySphere(new THREE.Vector3(0, 0.3, 0), 0.2, plant.seed)
	let leaf3 = new BodySphere(new THREE.Vector3(0, 0.3, 0), 0.2, leaf2)


	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);
}

function animate() {
	requestAnimationFrame(animate);

	// TODO: nothing here yet...

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