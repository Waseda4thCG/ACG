import * as THREE from 'three';
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Boid } from './boid.js';

import vertexShader from './shaders/shader.vert';
import fragmentShader from './shaders/shader_nature.frag';

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

function setupMaterial() {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        vertexColors: true, // not used
        side: THREE.FrontSide,
        uniforms: {
            // Lighting
            // uLightDirection: { value: new THREE.Vector3(1.0, 0.4, 1.0).normalize() },
            // uSpecularColor: { value: new THREE.Color('#ffffff') },
            // uShininess: { value: 32.0 },

            // uWindowSize: { value: 20.0 },
            // uWallColor: { value: new THREE.Color('#c5c5c5') },
            // uWindowColor: { value: new THREE.Color('#cfecf6') },
            // uRoofColor: { value: new THREE.Color('#a9a9a9') },
            // uStyleState: { value: 0.0 },
            // uTime: { value: 0.0 }

            uLightDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
            uSpecularColor: { value: new THREE.Color('#ffffee') },
            uShininess: { value: 10.0 },
            uBaseColor: { value: new THREE.Color('#5a5a5a') },
            uMossLightColor: { value: new THREE.Color('#8a9a5b') },
            uMossDarkColor: { value: new THREE.Color('#374a25') },
            uVineColor: { value: new THREE.Color('#223311') },
            uScale: { value: 15.0 },
            uTime: { value: 0.0 },

            uDeepWaterColor: { value: new THREE.Color('#001e33') }, // 深海の暗い青
            uShallowWaterColor: { value: new THREE.Color('#0036be') }, // 浅瀬の明るい青
            uCausticColor: { value: new THREE.Color('#ffffff') } // 光の模様の色
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