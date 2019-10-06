import * as THREE from "three";
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


var leaves_0_array = [seed, seed_map, seed_shiny];
var leaves_1_array = [leaves_1, leaves_1_map, leaves_1_shiny];
var leaves_2_array = [leaves_2, leaves_2_map, leaves_2_shiny];
var leaves_3_array = [leaves_3, leaves_3_map, leaves_3_shiny];
var leaves_4_array = [leaves_4, leaves_4_map, leaves_4_shiny];

var leavesArray = [leaves_1_array, leaves_2_array,leaves_3_array,leaves_4_array];

leavesArray.push();

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
		this.seed = new BodySphere(new THREE.Vector3(0, 0, 0), 0.8, null, true)
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
	constructor(position, radius, parent, first) {
		this.radius = radius;
		this.parent = parent;
		this.children = [];
		this.age = 0;
		this.depth = parent != null ? (parent.depth + 1) : 0;

		this.addToScene(first);

		this.mesh.rotateX(Math.random(Math.PI));
		this.mesh.rotateY(Math.random(Math.PI));
		this.mesh.rotateZ(Math.random(Math.PI));
		this.mesh.position.copy(position);
	}

	addToScene(first) {
		let geometry = new THREE.SphereGeometry(this.radius, 50 * this.radius, 50 * this.radius);
		
			console.log("FIRST")


		const rndIdx = Math.floor(Math.random()*leavesArray.length)
		
		let material = null;
		if (first){
				 material = new THREE.MeshPhongMaterial({
			

			map : new THREE.TextureLoader().load(leaves_0_array[0]),
			bumpMap: new THREE.TextureLoader().load(leaves_0_array[1]),

			bumpScale: 0.5,
			side : THREE.DoubleSide,
			transparent : true,

			specularMap : THREE.ImageUtils.loadTexture(leaves_0_array[2]),
			specular : new THREE.Color(0x55855e)


		});
		}

		else{ 
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
		antialias: true
	});
	renderer.setSize(window.innerWidth, window.innerHeight);

	var light	= new THREE.AmbientLight( 0x888888 )
	scene.add( light )
	var light	= new THREE.DirectionalLight( 'white', 1)
	light.position.set(15,15,15)
	light.target.position.set( 10, 10, 10 )
	light.castShadow = true;   

	//Set up shadow properties for the light
	light.shadow.mapSize.width = 512;  // default
	light.shadow.mapSize.height = 512; // default
	light.shadow.camera.near = 0.5;    // default
	light.shadow.camera.far = 500;     // default
	scene.add( light )

	var light	= new THREE.DirectionalLight( 0xcccccc, 1 )
	light.position.set(5,3,5)
	scene.add( light )

	document.body.appendChild(renderer.domElement);
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