import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 各環境クラスをimport
import { UrbanEnvironment } from '../environments/UrbanEnvironment.js';
import { NatureEnvironment } from '../environments/NatureEnvironment.js';
import { CyberPunkEnvironment } from '../environments/CyberPunkEnvironment.js';
import { UnderwaterEnvironment } from '../environments/UnderwaterEnvironment.js';

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
            buildingRoot: null
        };

        // 床とライト
        this.floorMesh = null;
        this.gridHelper = null;
        this.lights = [];
    }

    async init(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;

        await this.loadSharedAssets();
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
        this.scene.add(this.floorMesh);

        // グリッド（オプション）
        if (showGrid) {
            this.gridHelper = new THREE.GridHelper(floorSize, 25, gridColor1, gridColor2);
            this.gridHelper.position.y = 0.02;
            this.scene.add(this.gridHelper);
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

        // 建物のメッシュを追加
        if (this.sharedAssets.buildingRoot) {
            this.sharedAssets.buildingRoot.traverse((child) => {
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
            if (this.sharedAssets.buildingRoot) {
                this.scene.remove(this.sharedAssets.buildingRoot);
            }
            this.currentEnvironment.dispose();
        }

        // 環境名を保存（SSOT）
        this.currentModeName = modeName;

        let config = null;

        switch (modeName) {
            case 'Urban':
                config = WorldConfig.Urban;
                this.currentEnvironment = new UrbanEnvironment(
                    this.scene, this.renderer, this.camera, config
                );
                break;
            case 'Nature':
                config = WorldConfig.Nature;
                this.currentEnvironment = new NatureEnvironment(
                    this.scene, this.renderer, this.camera, config
                );
                break;
            case 'CyberPunk':
                config = WorldConfig.CyberPunk;
                this.currentEnvironment = new CyberPunkEnvironment(
                    this.scene, this.renderer, this.camera, config
                );
                break;
            case 'Underwater':
                config = WorldConfig.Underwater;
                this.currentEnvironment = new UnderwaterEnvironment(
                    this.scene, this.renderer, this.camera, config
                );
                break;
        }

        // 床とライトを作成
        if (config) {
            this.createFloor(config.floor);
            this.createLights();
        }

        // 新しい環境のセットアップ
        if (this.currentEnvironment) {
            this.currentEnvironment.init(this.sharedAssets);
        }
    }

    getCurrentEnvironment() {
        return this.currentModeName;
    }

    update(elapsedTime) {
        if (this.currentEnvironment) {
            this.currentEnvironment.update(elapsedTime);
        }
    }
}