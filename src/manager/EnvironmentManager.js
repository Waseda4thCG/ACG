import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { WorldConfig } from '../config/WorldConfig.js';

// 環境を管理するシングルトンクラス
export class EnvironmentManager {
    static instance = null;

    constructor() {
        if (EnvironmentManager.instance) return EnvironmentManager.instance;
        EnvironmentManager.instance = this;

        this.scene = null;
        this.currentEnvironment = null;
        this.currentModeName = null; // 現在の環境名（SSOT）

        this.sharedAssets = {
            buildingRoot: null,
            floorMesh: null
        };

        // ハンドラのバインド
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onPointerLockChange = this._onPointerLockChange.bind(this);

        this.floorMesh = null;
        this.gridHelper = null;
        this.lights = [];

        this.listeners = []; // 監視者のリスト
    }

    async init(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;

        await this.loadSharedAssets();

        // グローバルイベントの登録
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
    }

    loadSharedAssets() {
        return new Promise((resolve) => {
            new GLTFLoader().load('/rikocamtex.glb', (gltf) => {
                this.sharedAssets.buildingRoot = gltf.scene;

                // マテリアル名を保存
                this.sharedAssets.buildingRoot.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.userData.originalMatName = child.material.name ? child.material.name.toLowerCase() : '';
                    }
                });

                resolve();
            });
        });
    }

    createFloor(config) {
        // 既存の床を削除
        if (this.floorMesh) {
            this.scene.remove(this.floorMesh);
            this.floorMesh.geometry.dispose();
            this.floorMesh.material.dispose();
            this.floorMesh = null;
        }
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.geometry.dispose();
            this.gridHelper.material.dispose();
            this.gridHelper = null;
        }

        const floorSize = config?.floorSize ?? 500;
        const floorColor = config?.floorColor ?? '#4a4a4a';
        const gridColor1 = config?.gridColor1 ?? '#ffff00';
        const gridColor2 = config?.gridColor2 ?? '#666666';
        const showGrid = config?.showGrid ?? true;

        // 床のジオメトリ
        const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);

        // 床のマテリアル
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: floorColor,
            roughness: 0.9,
            metalness: 0.1,
        });

        this.floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floorMesh.rotation.x = -Math.PI / 2;
        this.floorMesh.position.y = 0;
        this.floorMesh.receiveShadow = true;
        this.floorMesh.userData.excludeFromMinimap = true; // ミニマップに表示しない
        this.scene.add(this.floorMesh);

        this.sharedAssets.floorMesh = this.floorMesh;

        // グリッド（オプション）
        if (showGrid) {
            this.gridHelper = new THREE.GridHelper(floorSize, 25, gridColor1, gridColor2);
            this.gridHelper.position.y = 0.02;
            this.scene.add(this.gridHelper);
        }
    }

    hideFloor() {
        // delete floor
        if (this.floorMesh) {
            this.scene.remove(this.floorMesh);
            this.floorMesh.geometry.dispose();
            this.floorMesh.material.dispose();
            this.floorMesh = null;
            this.sharedAssets.floorMesh = null;
        }
        // delete grid
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.geometry.dispose();
            this.gridHelper.material.dispose();
            this.gridHelper = null;
        }
    }

    createLights() {
        // 既存のライトを削除
        this.lights.forEach(light => {
            this.scene.remove(light);
        });
        this.lights = [];

        // 環境光
        const ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);

        // 指向性ライト
        const directionalLight = new THREE.DirectionalLight('#ffffff', 0.8);
        directionalLight.position.set(50, 100, 50);
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
    }

    getCollisionObjects() {
        const collisionObjects = [];

        // 床を追加
        if (this.floorMesh) {
            collisionObjects.push(this.floorMesh);
        }

        // 現在の環境が個別のbuildingRootを持っている場合はそれを使う
        const targetRoot = (this.currentEnvironment && this.currentEnvironment.buildingRoot)
            ? this.currentEnvironment.buildingRoot
            : this.sharedAssets.buildingRoot;

        // 建物のメッシュを追加
        if (targetRoot) {
            targetRoot.traverse((child) => {
                if (child.isMesh) {
                    collisionObjects.push(child);
                }
            });
        }

        return collisionObjects;
    }

    switchMode(modeName) {
        // 既存環境の破棄
        if (this.currentEnvironment) {
            // 現在の環境が個別のbuildingRootを持っている場合はそれを削除
            if (this.currentEnvironment.buildingRoot) {
                this.scene.remove(this.currentEnvironment.buildingRoot);
            }

            // 共有のbuildingRootもシーンから削除
            if (this.sharedAssets.buildingRoot) {
                this.scene.remove(this.sharedAssets.buildingRoot);
            }
            this.currentEnvironment.dispose();
        }

        // 環境名を保存（SSOT）
        this.currentModeName = modeName;

        // 環境定義をWorldConfigから取得
        const envDef = WorldConfig.Environments.find(e => e.id === modeName);

        if (!envDef || !envDef.class) {
            console.error(`Environment definition for ${modeName} not found or missing class.`);
            return;
        }

        const config = envDef.config || {};
        this.currentEnvironment = new envDef.class(
            this.scene, this.renderer, this.camera, config
        );

        // 床とライトを作成
        if (config) {
            // showFloor: false の場合は床を非表示
            if (config.floor?.showFloor === false) {
                this.hideFloor();
            } else {
                this.createFloor(config.floor);
            }
            // 共通ライトを使用する環境のみライトを作成
            if (config.useSharedLights !== false) {
                this.createLights();
            }
        }

        // 新しい環境のセットアップ
        if (this.currentEnvironment) {
            this.currentEnvironment.init(this.sharedAssets);
        }

        // 状態変更を通知
        this.notifyEnvironmentChange(modeName);
    }

    // 監視者（UIなど）を登録
    subscribe(callback) {
        this.listeners.push(callback);
    }

    // 通知を実行
    notifyEnvironmentChange(modeName) {
        this.listeners.forEach(callback => callback(modeName));
    }

    // --- 入力イベントの委譲（Delegation） ---

    _onKeyDown(event) {
        if (this.currentEnvironment) {
            this.currentEnvironment.onKeyDown(event);
        }
    }

    _onMouseMove(event) {
        if (this.currentEnvironment) {
            // スクリーン座標を正規化して渡す（共通化）
            const mousePos = {
                x: (event.clientX / window.innerWidth) * 2 - 1,
                y: -(event.clientY / window.innerHeight) * 2 + 1,
                clientX: event.clientX,
                clientY: event.clientY
            };
            this.currentEnvironment.onMouseMove(event, mousePos);
        }
    }

    _onPointerLockChange() {
        if (this.currentEnvironment) {
            this.currentEnvironment.onPointerLockChange(!!document.pointerLockElement);
        }
    }

    getCurrentEnvironment() {
        return this.currentModeName;
    }

    getAvailableEnvironments() {
        return WorldConfig.Environments;
    }

    update(elapsedTime) {
        if (this.currentEnvironment) {
            this.currentEnvironment.update(elapsedTime);
        }
    }
}