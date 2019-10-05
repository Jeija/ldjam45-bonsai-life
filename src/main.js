import * as THREE from 'three'
import * as fx from 'wafxr'

let renderer
let scene
let camera

let clock = new THREE.Clock()

let plant
let nutrients = []

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
}

const gradientArray = ['#4b301f', '#163427', '#e66465', '#9198e5']

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
    let xaxis = new THREE.Vector3(1, 0, 0)
    let yaxis = new THREE.Vector3(0, 1, 0)
    let zaxis = new THREE.Vector3(0, 0, 1)

    this.seed.mesh.rotateOnWorldAxis(xaxis, x)
    this.seed.mesh.rotateOnWorldAxis(yaxis, y)
    this.seed.mesh.rotateOnWorldAxis(zaxis, z)
  }

  checkCollision(nutrient) {
    // TODO
  }
}

class Nutrient {
  constructor(position, velocity, radius) {
    this.velocity = velocity
    this.radius = radius
    this.addToScene()
    this.mesh.position.copy(position)
  }

  addToScene() {
    let geometry = new THREE.SphereGeometry(this.radius, 10, 10)
    let material = new THREE.MeshNormalMaterial()
    this.mesh = new THREE.Mesh(geometry, material)
    scene.add(this.mesh)
  }

  step(dtime) {
    this.mesh.position.add(this.velocity.clone().multiplyScalar(dtime))
  }
}

class BodySphere {
  constructor(position, radius, parent) {
    this.position = position
    this.radius = radius
    this.parent = parent

    this.addToScene()

    this.mesh.position.copy(position)
  }

  addToScene() {
    let geometry = new THREE.SphereGeometry(this.radius, 10, 10)
    let material = new THREE.MeshNormalMaterial()
    this.mesh = new THREE.Mesh(geometry, material)

    if (this.parent !== null) this.parent.mesh.add(this.mesh)
    else scene.add(this.mesh)
  }
}

window.addEventListener('resize', onWindowResize, false)

init()
step()

function init() {
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  )
  camera.position.z = 2

  scene = new THREE.Scene()

  plant = new Plant()
  let leaf1 = new BodySphere(new THREE.Vector3(0.3, 0, 0), 0.2, plant.seed)
  let leaf2 = new BodySphere(new THREE.Vector3(0, 0.3, 0), 0.2, plant.seed)
  let leaf3 = new BodySphere(new THREE.Vector3(0, 0.3, 0), 0.2, leaf2)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

	// should be changed upon changing "level"
  setInterval(() => {
		setRandomBackground()
  }, 10000)
}

function setRandomBackground() {
	document.documentElement.style.setProperty(
		'--back-grad1',
		gradientArray[Math.floor(Math.random() * gradientArray.length)]
	)
	document.documentElement.style.setProperty(
		'--back-grad2',
		gradientArray[Math.floor(Math.random() * gradientArray.length)]
	)
}

function spawnRandomNutrient(dist, speed, axis, size) {
  let spawnVec = new THREE.Vector3(dist, 0, 0)

  spawnVec.x = Math.random() * dist
  spawnVec.applyAxisAngle(axis, Math.random() * 2 * Math.PI)

  let toCenter = spawnVec
    .clone()
    .negate()
    .normalize()
    .multiplyScalar(speed)

  let newNu = new Nutrient(spawnVec, toCenter, size)

  nutrients.push(newNu)
}

function playSound(opt) {
  fx.play(opt)
}

function step() {
  requestAnimationFrame(step)

  let dtime = clock.getDelta()
  for (let n = 0; n < nutrients.length; n++) {
    let nutrient = nutrients[n]
    nutrient.step(dtime)
  }


	// test call for spawning
  if (Math.random() < 0.01) {
    spawnRandomNutrient(10, 0.5, new THREE.Vector3(0, 0, 1), 0.05)
  }

	// test call for message
  if (Math.random() < 0.001) {
    displaymessage('a testmessage', 2000)
  }

  renderer.render(scene, camera)
}

function displaymessage(message, timeout) {
  const el = document.getElementById('message')
  el.textContent = message

  el.classList.add('visible')
  el.classList.remove('hidden')

  setTimeout(() => {
    el.classList.add('hidden')
    el.classList.remove('visible')
  }, timeout)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

/**** Mouse Control ****/
let mouseDown = false
renderer.domElement.addEventListener('mousemove', function() {
  if (mouseDown) plant.rotate(event.movementY * 0.01, event.movementX * 0.01, 0)
})

renderer.domElement.addEventListener('mousedown', function() {
  mouseDown = true
})

renderer.domElement.addEventListener('mouseup', function() {
  mouseDown = false
})
