// src/environments/UrbanEnvironment.js
import * as THREE from 'three';
import { BaseEnvironment } from './BaseEnvironment.js';
import { FishController } from '../controllers/FishController.js';

import vertexShader from '../shaders/building/shader.vert';
import windowFragmentShader from '../shaders/building/window.frag';
import roofFragmentShader from '../shaders/building/roof.frag';
import wallFragmentShader from '../shaders/building/wall.frag';

export class UrbanEnvironment extends BaseEnvironment {
    constructor(scene, renderer, camera, config) {
        super(scene, renderer, camera);
        this.config = config;
        this.materials = {};
    }

    init(sharedAssets) {
        this.scene.background = new THREE.Color('#001e33');
        this.scene.fog = null;

        this._setupMaterials();

        if (sharedAssets.buildingRoot) {
            const root = sharedAssets.buildingRoot;

            root.traverse((child) => {
                if (child.isMesh) {
                    const name = child.userData.originalMatName || '';

                    if (name.includes('window')) {
                        child.material = this.materials.window;
                    } else if (name.includes('roof')) {
                        child.material = this.materials.roof;
                    } else {
                        child.material = this.materials.wall;
                    }
                }
            });

            root.position.set(0, 0, 0);
            root.scale.setScalar(this.config.modelScale);

            this.scene.add(root);
        }
    }

    update(elapsedTime) {
        this.scene.traverse((child) => {
            if (child.isMesh && child.material.uniforms && child.material.uniforms.uTime) {
                child.material.uniforms.uTime.value = elapsedTime;
            }
        });
    }

    dispose() {
        Object.values(this.materials).forEach(mat => mat.dispose());
        this.materials = {};
    }

    _setupMaterials() {
        const { shader } = this.config;
        const textureScale = shader?.textureScale ?? 1.0;
        const windowSize = shader?.windowSize ?? 20.0;

        const commonUniforms = {
            uLightDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
            uSpecularColor: { value: new THREE.Color('#ffffff') },
            uShininess: { value: 32.0 },
            uTime: { value: 0.0 },
            uScale: { value: textureScale },
        };

        this.materials.window = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: true,
            side: THREE.FrontSide,
            uniforms: {
                ...commonUniforms,
                uWindowSize: { value: windowSize },
                uWindowColor: { value: new THREE.Color('#cfecf6') },
            },
            vertexShader: vertexShader,
            fragmentShader: windowFragmentShader
        });

        this.materials.roof = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: true,
            side: THREE.FrontSide,
            uniforms: {
                ...commonUniforms,
                uRoofColor: { value: new THREE.Color('#a9a9a9') },
            },
            vertexShader: vertexShader,
            fragmentShader: roofFragmentShader
        });

        this.materials.wall = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: true,
            side: THREE.DoubleSide,
            uniforms: {
                ...commonUniforms,
                uWallColor: { value: new THREE.Color('#c5c5c5') },
            },
            vertexShader: vertexShader,
            fragmentShader: wallFragmentShader
        });
    }
}