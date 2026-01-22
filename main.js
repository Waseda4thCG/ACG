import * as THREE from 'three';
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Boid } from './boid.js';

import vertexShader from './shaders/shader.vert';
import windowFragmentShader from './shaders/window.frag';
import roofFragmentShader from './shaders/roof.frag';
import wallFragmentShader from './shaders/wall.frag';

// Scene setup
// -----------
const scene = new THREE.Scene();
const deepWaterColor = new THREE.Color('#001e33');
scene.background = deepWaterColor;

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

const clock = new THREE.Clock();

function setupWindowMaterial() {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        side: THREE.FrontSide,
        uniforms: {
            uLightDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
            uSpecularColor: { value: new THREE.Color('#ffffff') },
            uShininess: { value: 32.0 },
            uWindowSize: { value: 20.0 },
            uWindowColor: { value: new THREE.Color('#cfecf6') },
            uTime: { value: 0.0 },
        },
        vertexShader: vertexShader,
        fragmentShader: windowFragmentShader
    });
}

function setupRoofMaterial() {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        side: THREE.FrontSide,
        uniforms: {
            uLightDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
            uSpecularColor: { value: new THREE.Color('#ffffff') },
            uShininess: { value: 32.0 },
            uRoofColor: { value: new THREE.Color('#a9a9a9') },
            uTime: { value: 0.0 },
        },
        vertexShader: vertexShader,
        fragmentShader: roofFragmentShader
    });
}

function setupWallMaterial() {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        side: THREE.FrontSide,
        uniforms: {
            uLightDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
            uSpecularColor: { value: new THREE.Color('#ffffff') },
            uShininess: { value: 32.0 },
            uWallColor: { value: new THREE.Color('#c5c5c5') },
            uTime: { value: 0.0 },
        },
        vertexShader: vertexShader,
        fragmentShader: wallFragmentShader
    });
}

// Load 3D Model
// -------------
new GLTFLoader().load('/rikocamtexv2.glb', (gltf) => {
    const obj = gltf.scene;

    obj.traverse((child) => {
        if (child.isMesh) {
            const materialName = child.material.name ? child.material.name.toLowerCase() : '';

            if (materialName.includes('window')) {
                child.material = setupWindowMaterial();
            } else if (materialName.includes('roof')) {
                child.material = setupRoofMaterial();
            } else {
                // Default to wall material
                child.material = setupWallMaterial();
            }
        }
    });

    obj.position.set(0, 0, 0);
    obj.scale.set(0.01, 0.01, 0.01);

    scene.add(obj);
});

// Rendering loop
// --------------
function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    scene.traverse((child) => {
        if (child.isMesh && child.material.uniforms) {
            child.material.uniforms.uTime.value = elapsedTime;
        }
    });


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