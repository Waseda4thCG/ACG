import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { EnvironmentManager } from './manager/EnvironmentManager.js';

const CAMERA_FOV = 75;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000.0;
const CAMERA_POSITION = new THREE.Vector3(120, 50, 80);  // スケール1.0に対応

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, CAMERA_NEAR, CAMERA_FAR);
camera.position.copy(CAMERA_POSITION);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
};

const clock = new THREE.Clock();

const envManager = new EnvironmentManager();

// 非同期で初期化
envManager.init(scene, renderer, camera).then(() => {
    envManager.switchMode('Urban');
    setupGUI();
});

function setupGUI() {
    const gui = new GUI();
    const params = { mode: 'Urban' };

    gui.add(params, 'mode', ['Urban', 'Nature', 'Underwater']).onChange((value) => {
        envManager.switchMode(value);
    });
}

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    envManager.update(elapsedTime);

    controls.update();
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});