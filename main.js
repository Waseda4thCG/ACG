import * as THREE from 'three';
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import vertexShader from './shaders/shader.vert';
import fragmentShader from './shaders/shader.frag';

// Scene setup
// -----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x808080);

// Camera setup
// ------------
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 1);

// Renderer setup
// --------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OrbitControls setup
// -------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
// debug Sphere (this shows the current target position of the controls)
const debugGeometry = new THREE.SphereGeometry(0.01, 16, 16);
const debugMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
const debugSphere = new THREE.Mesh(debugGeometry, debugMaterial);
scene.add(debugSphere);

function setupMaterial() {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        vertexColors: true, // not used
        side: THREE.FrontSide,
        uniforms: {
            uLightDirection: { value: new THREE.Vector3(1.0, 1.0, 1.0).normalize() },
            uColor: { value: new THREE.Color(0xba55d3) },
            uSpecularColor: { value: new THREE.Color(0xffffff) },
            uShininess: { value: 32.0 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    });
}

// Load 3D Model
// -------------
new GLTFLoader().load('/rikocam.glb', (gltf) => {
    const obj = gltf.scene;

    obj.traverse((child) => {
        if (child.isMesh)
        {
            child.material = setupMaterial();
        }
    });

    obj.position.set(0, 0, 0);
    obj.scale.set(0.01, 0.01, 0.01);

    scene.add(obj);
});


// Rendering loop
// --------------
function animate(){
    requestAnimationFrame(animate);
    controls.update();
    debugSphere.position.copy(controls.target);
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