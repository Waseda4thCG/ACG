import * as THREE from 'three';
import { BaseEnvironment } from './BaseEnvironment.js';
import { FishController } from '../controllers/FishController.js'

import vertexShader from '../shaders/underwater/underwater.vert';
import buildingFragmentShader from '../shaders/underwater/underwater.frag';

const SHALLOW_WATER_COLOR = new THREE.Color('#012562');
const DEEP_WATER_COLOR = new THREE.Color('#012562');
const CAUSTIC_COLOR = new THREE.Color('#ffffff');
const ROCK_COLOR = new THREE.Color('#341c00');
const SEDIMENT_COLOR = new THREE.Color('#000000');

export class UnderwaterEnvironment extends BaseEnvironment {

    constructor(scene, renderer, camera, config) {
        super(scene, renderer, camera);
        this.config = config;
        this.fishController = null;
    }

    init(sharedAssets) {
        const { fog, shader, modelScale } = this.config;

        this.scene.background = DEEP_WATER_COLOR;
        this.scene.fog = new THREE.Fog(SHALLOW_WATER_COLOR, fog.near, fog.far);

        const underwaterMaterial = new THREE.ShaderMaterial({
            uniforms: {
                ...THREE.UniformsLib.fog,
                uLightDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
                uDeepWaterColor: { value: DEEP_WATER_COLOR },
                uShallowWaterColor: { value: SHALLOW_WATER_COLOR },
                uCausticColor: { value: CAUSTIC_COLOR },
                uRockColor: { value: ROCK_COLOR },
                uSedimentColor: { value: SEDIMENT_COLOR },
                uTime: { value: 0.0 },
                uScale: { value: shader.causticScale },
                // スケール対応の深度パラメータ
                uDepthMin: { value: shader.depthMin },
                uDepthMax: { value: shader.depthMax },
            },
            vertexShader: vertexShader,
            fragmentShader: buildingFragmentShader,
            fog: true
        });

        // キャンパスモデルのマテリアルを差し替える
        if (sharedAssets.buildingRoot) {
            // configからモデルのスケールを適用
            sharedAssets.buildingRoot.scale.setScalar(modelScale);

            sharedAssets.buildingRoot.traverse((child) => {
                if (child.isMesh) {
                    child.material = underwaterMaterial;
                }
            });
            this.scene.add(sharedAssets.buildingRoot);
        }

        // 魚の生成
        this.fishController = new FishController(this.scene, this.config);

        // 衝突判定用に建物のメッシュを渡す
        if (sharedAssets.buildingRoot) {
            const obstacles = [];
            sharedAssets.buildingRoot.traverse((child) => {
                if (child.isMesh) {
                    obstacles.push(child);
                }
            });
            this.fishController.setObstacles(obstacles);
        }
    }

    update(elapsedTime) {
        this.scene.traverse((child) => {
            if (child.isMesh && child.material.uniforms && child.material.uniforms.uTime) {
                child.material.uniforms.uTime.value = elapsedTime;
            }
        });

        if (this.fishController) {
            this.fishController.update(elapsedTime);
        }
    }

    dispose() {
        if (this.fishController) {
            this.fishController.dispose();
        }
    }
}