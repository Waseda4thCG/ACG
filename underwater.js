import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Boid } from './boid.js';

import vertexShader from './shaders/shader.vert';
import underwaterFragmentShader from './shaders/shader.frag'; // 修正したファイルを読み込む

// Scene setup
const scene = new THREE.Scene();
const deepWaterColor = new THREE.Color('#001e33');
scene.background = deepWaterColor;

// Camera setup
// ★修正: Farクリップを伸ばして、奥まで描画されるようにする
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 10, 30); // 少し高い位置から見下ろす

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const clock = new THREE.Clock();

// --- Setup Materials ---
function setupMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uLightDirection: { value: new THREE.Vector3(1.0, 1.0, 1.0).normalize() },
            uDeepWaterColor: { value: deepWaterColor },
            uShallowWaterColor: { value: new THREE.Color('#006699') },
            uCausticColor: { value: new THREE.Color('#ffffff') },
            uTime: { value: 0.0 },
            uScale: { value: 2.0 }, // 建物の模様サイズ
        },
        vertexShader: vertexShader,
        fragmentShader: underwaterFragmentShader
    });
}

// --- Load Model & Obstacles ---
let obstacles = [];
new GLTFLoader().load('/rikocam.glb', (gltf) => {
    const obj = gltf.scene;
    obj.traverse((child) => {
        if (child.isMesh) {
            child.material = setupMaterial();
            obstacles.push(child);
        }
    });
    // ★重要: モデルが小さすぎる場合があるのでスケールを確認
    // 魚が巨大に見える場合、ここを大きくするか魚を小さくする
    obj.scale.set(1, 1, 1);
    scene.add(obj);
});

// --- Setup Boids (Fish) ---
const fishCount = 100;
const boids = [];
// 魚が泳ぐ範囲 (Width, Height, Depth)
const boundSize = { w: 60, h: 30, d: 60 };

for (let i = 0; i < fishCount; i++) {
    boids.push(new Boid(boundSize.w, boundSize.h, boundSize.d, i));
}

// --- Setup InstancedMesh ---
const fishGeometry = new THREE.ConeGeometry(0.3, 1.2, 8); // サイズ調整
fishGeometry.rotateX(Math.PI / 2);

// ★重要: 魚用シェーダーの修正
const fishMaterial = new THREE.ShaderMaterial({
    vertexShader: `
        uniform float uTime;
        attribute float aSpeed;
        attribute float aOffset;
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vec3 pos = position;

            // くねくねアニメーション
            float wiggle = sin(uTime * 10.0 * aSpeed + aOffset + pos.z * 5.0) * 0.1;
            pos.x += wiggle * pos.z;

            // ★【ここが直りました】instanceMatrixを掛けることで、個々の位置に移動させる
            vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);

            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        void main() {
            // シンプルなライティング
            vec3 light = vec3(0.5, 1.0, 0.5);
            float d = max(0.0, dot(vNormal, normalize(light)));

            // 魚の色 (背中が青、腹が白)
            vec3 col = mix(vec3(0.1, 0.3, 0.6), vec3(0.8, 0.9, 1.0), d);
            gl_FragColor = vec4(col, 1.0);
        }
    `,
    uniforms: { uTime: { value: 0.0 } },
    side: THREE.DoubleSide
});

const fishMesh = new THREE.InstancedMesh(fishGeometry, fishMaterial, fishCount);
scene.add(fishMesh);

// インスタンスデータ準備
const speeds = new Float32Array(fishCount);
const offsets = new Float32Array(fishCount);
const scales = new Float32Array(fishCount);
const dummy = new THREE.Object3D();

for (let i = 0; i < fishCount; i++) {
    speeds[i] = 0.5 + Math.random() * 0.5;
    offsets[i] = Math.random() * Math.PI * 2;
    scales[i] = 1.0 + Math.random() * 1.2;

    // 初期位置セット（チラつき防止）
    dummy.position.copy(boids[i].position);
    dummy.scale.setScalar(scales[i]);
    dummy.updateMatrix();
    fishMesh.setMatrixAt(i, dummy.matrix);
}

fishGeometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds, 1));
fishGeometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 1));


// --- Animation Loop ---
const raycaster = new THREE.Raycaster();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // シェーダー時間更新
    fishMaterial.uniforms.uTime.value = elapsedTime;
    scene.traverse((child) => {
        if (child.isMesh && child.material.uniforms && child.material.uniforms.uTime) {
            child.material.uniforms.uTime.value = elapsedTime;
        }
    });

    // Boid更新
    const hasObstacles = obstacles.length > 0;

    // 全フレームで判定すると重い場合があるので、カウンターなどで間引くのも手ですが
    // いったんそのまま回します
    for (let i = 0; i < fishCount; i++) {
        const boid = boids[i];

        boid.flock(boids);
        if (hasObstacles) {
            boid.avoidObstacles(raycaster, obstacles);
        }
        boid.update();

        // 位置更新
        dummy.position.copy(boid.position);

        // 向き更新
        const velocity = boid.velocity;
        if (velocity.lengthSq() > 0.0001) {
            dummy.lookAt(dummy.position.clone().add(velocity));
        }

        dummy.scale.setScalar(scales[i]);
        dummy.updateMatrix();
        fishMesh.setMatrixAt(i, dummy.matrix);
    }

    fishMesh.instanceMatrix.needsUpdate = true;

    controls.update();
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});