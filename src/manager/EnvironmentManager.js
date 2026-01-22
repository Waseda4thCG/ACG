import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 各環境クラスをimport
import { UrbanEnvironment } from '../environments/UrbanEnvironment.js';
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

        switch (modeName) {
            case 'Urban':
                this.currentEnvironment = new UrbanEnvironment(
                    this.scene, this.renderer, this.camera, WorldConfig.Urban
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

    update(elapsedTime) {
        if (this.currentEnvironment) {
            this.currentEnvironment.update(elapsedTime);
        }
    }
}