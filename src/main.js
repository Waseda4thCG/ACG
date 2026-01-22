import * as THREE from 'three';
import { EnvironmentManager } from './manager/EnvironmentManager.js';
import { KeyboardControls } from './controllers/KeyboardControls.js';
import { MovementUI } from './ui/MovementUI.js';
import { MinimapUI } from './ui/MinimapUI.js';

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

const envManager = new EnvironmentManager();

const controls = new KeyboardControls(camera, renderer.domElement);
const movementUI = new MovementUI(envManager); // EnvironmentManagerを渡す（SSOT）
const minimapUI = new MinimapUI(scene, camera);

// キーボードでのモード変更時のコールバック（GキーでUI更新）
controls.onModeChange = (grounded) => {
    movementUI.setMode(grounded);
};

// UIのFlight Modeボタンクリック時のコールバック（コントロール更新）
movementUI.onFlightModeChange = (grounded) => {
    controls.grounded = grounded;
    if (grounded) {
        controls.camera.position.y = controls.floorLevel + controls.eyeHeight;
    }
};

// UIのControl Modeボタンクリック時のコールバック
movementUI.onControlModeChange = (controlMode) => {
    const mouseOnly = controlMode === 'mouseOnly';
    controls.setMouseOnlyMode(mouseOnly);
};

// 環境変更時のコールバックを設定
movementUI.onEnvironmentChange = (env) => {
    envManager.switchMode(env);
    setupCollisions();
};

const clock = new THREE.Clock();

// 非同期で初期化
envManager.init(scene, renderer, camera).then(() => {
    envManager.switchMode('Urban');
    // UIを初期環境に同期（SSOT）
    movementUI.setEnvironment('Urban');
    setupCollisions();
});

function setupCollisions() {
    // EnvironmentManagerから衝突オブジェクトを取得
    const collisionObjects = envManager.getCollisionObjects();
    controls.setCollisionObjects(collisionObjects);
}

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    envManager.update(elapsedTime);

    controls.update();
    minimapUI.update();
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});