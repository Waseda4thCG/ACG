import * as THREE from 'three';
import { BaseEnvironment } from './BaseEnvironment.js';
import {FishController} from '../controllers/FishController.js'

import vertexShader from '../shaders/shader.vert';
import buildingFragmentShader from '../shaders/underwater/underwater.frag';

const FOG_NEAR = 0.0;
const FOG_FAR = 300.0;
const SHALLOW_WATER_COLOR = new THREE.Color('#006699');
const DEEP_WATER_COLOR = new THREE.Color('#001e33');
const CAUSTIC_COLOR = new THREE.Color('#ffffff');
const ROCK_COLOR = new THREE.Color('#341c00');
const SEDIMENT_COLOR = new THREE.Color('#000000');

export class UnderwaterEnvironment extends BaseEnvironment {

    constructor(scene, renderer, camera) {
        super(scene, renderer, camera);
        this.fishController = null;
    }

    init(sharedAssets) {
        this.scene.background = DEEP_WATER_COLOR;
        this.scene.fog = new THREE.Fog(SHALLOW_WATER_COLOR, FOG_NEAR, FOG_FAR);

        const underwaterMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uLightDirection: { value: new THREE.Vector3(1.0, 1.0, 1.0).normalize() },
                uDeepWaterColor: { value: DEEP_WATER_COLOR },
                uShallowWaterColor: { value: SHALLOW_WATER_COLOR },
                uCausticColor: { value: CAUSTIC_COLOR },
                uRockColor: {value: ROCK_COLOR},
                uSedimentColor: {value: SEDIMENT_COLOR},
                uTime: { value: 0.0 },
            },
            vertexShader: vertexShader,
            fragmentShader: buildingFragmentShader
        });

        // キャンパスモデルのマテリアルを差し替える
        if (sharedAssets.buildingRoot) {
            sharedAssets.buildingRoot.traverse((child) => {
                if (child.isMesh) {
                    child.material = underwaterMaterial;
                }
            });
            this.scene.add(sharedAssets.buildingRoot);
        }

        // 魚の生成
        this.fishController = new FishController(this.scene, this.obstacles);

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