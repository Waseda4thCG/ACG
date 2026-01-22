import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 各環境クラスをimport
import { UrbanEnvironment } from '../environments/UrbanEnvironment.js';
import { NatureEnvironment } from '../environments/NatureEnvironment.js';
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

        switch (modeName) {
            case 'Urban':
                this.currentEnvironment = new UrbanEnvironment(
                    this.scene, this.renderer, this.camera, WorldConfig.Urban
                );
                break;
            case 'Nature':
                this.currentEnvironment = new NatureEnvironment(
                    this.scene, this.renderer, this.camera, WorldConfig.Nature
                );
                break;
            case 'Underwater':
                this.currentEnvironment = new UnderwaterEnvironment(
                    this.scene, this.renderer, this.camera, WorldConfig.Underwater
                );
                break;
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