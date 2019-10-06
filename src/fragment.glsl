uniform vec3 colorA; 
uniform vec3 colorB; 
uniform float quot;
varying vec3 vUv;

void main() {
  gl_FragColor = vec4(mix(colorA, colorB, vUv.y/quot), 1);
}