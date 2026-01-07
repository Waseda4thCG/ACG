import * as THREE from 'three';

import vertexShader from './shaders/shader.vert';
import fragmentShader from './shaders/shader.frag';

// Scene setup
// -----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x808080);

// Camera setup
// ------------
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 2;

// Renderer setup
// --------------
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Geometry (VBO) setup
// --------------------
const geometry = new THREE.BoxGeometry(1, 1, 1);

// Material (Shader) setup
// -----------------------
const material = new THREE.ShaderMaterial({
    uniforms: {
        uLightDirection: { value: new THREE.Vector3(1.0, 1.0, 1.0).normalize() },
        uColor: { value: new THREE.Color(0x00aaff) },
        uSpecularColor: { value: new THREE.Color(0xffffff) },
        uShininess: { value: 32.0 }
    },

    vertexShader: vertexShader,
    fragmentShader: fragmentShader
});

// Mesh (VBO + Shader) setup
// -------------------------
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Rendering loop
// --------------
function animate(){
    requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);
}

animate();

// Handle window resize
// --------------------
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});