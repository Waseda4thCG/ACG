import * as THREE from 'three';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { BaseEnvironment } from './BaseEnvironment.js';
import { FishController } from '../controllers/FishController.js'

import vertexShader from '../shaders/underwater/underwater.vert';
import buildingFragmentShader from '../shaders/underwater/underwater.frag';
import seabedVertexShader from '../shaders/underwater/seabed.vert';
import seabedFragmentShader from '../shaders/underwater/seabed.frag';
import backgroundVertexShader from '../shaders/underwater/background.vert';
import backgroundFragmentShader from '../shaders/underwater/background.frag';

export class UnderwaterEnvironment extends BaseEnvironment {

    constructor(scene, renderer, camera, config) {
        super(scene, renderer, camera);
        this.config = config;
        this.fishController = null;
        this.buildingRoot = null;
        this.seabedMaterial = null;
        this.originalFloorMaterial = null;
        this.lights = [];
        this.lightingUniforms = null;
        this.backgroundSphere = null;
    }

    createBackgroundSphere() {
        const { colors } = this.config;

        const geometry = new THREE.SphereGeometry(100, 32, 32);

        const material = new THREE.ShaderMaterial({
            vertexShader: backgroundVertexShader,
            fragmentShader: backgroundFragmentShader,
            uniforms: {
                uDeepColor: { value: new THREE.Color(colors.deepWater) },
                uShallowColor: { value: new THREE.Color(colors.shallowWater) }
            },
            side: THREE.BackSide,
            depthWrite: false,
            depthTest: false,
            fog: false
        });

        const mesh = new THREE.Mesh(geometry, material);

        // 描画順序を強制的に一番最初にする
        mesh.renderOrder = -999;
        mesh.frustumCulled = false;

        // ミニマップに表示されないように設定
        mesh.userData.excludeFromMinimap = true;

        return mesh;
    }

    createLightingUniforms() {
        const { lighting, colors, shader } = this.config;

        // WorldConfigからライティング設定を読み込み
        const lightDir = new THREE.Vector3(
            lighting.lightDirection.x,
            lighting.lightDirection.y,
            lighting.lightDirection.z
        ).normalize();

        // 共通ライティングuniforms（全シェーダーで使用）
        return {
            uLightDirection: { value: lightDir },
            uAmbientColor: { value: new THREE.Color(lighting.ambientColor) },
            uAmbientIntensity: { value: lighting.ambientIntensity },
            uDiffuseIntensity: { value: lighting.diffuseIntensity },
            uCausticColor: { value: new THREE.Color(lighting.causticColor) },
            uCausticIntensity: { value: lighting.causticIntensity },
            uGodRayIntensity: { value: lighting.godRayIntensity ?? 0.8 },
            uGodRaySpeed: { value: lighting.godRaySpeed ?? 0.15 },
            uGodRayScale: { value: lighting.godRayScale ?? 0.015 },
            uDeepWaterColor: { value: new THREE.Color(colors.deepWater) },
            uShallowWaterColor: { value: new THREE.Color(colors.shallowWater) },
            uSandColor: { value: new THREE.Color(colors.sand) },
            uSandColorDark: { value: new THREE.Color(colors.sandDark) },
            uRockColor: { value: new THREE.Color(colors.rock) },
            uSedimentColor: { value: new THREE.Color(colors.sediment) },
            uTime: { value: 0.0 },
            uScale: { value: shader.causticScale },
            uDepthMin: { value: shader.depthMin },
            uDepthMax: { value: shader.depthMax }
        };
    }

    createLights() {
        const { lighting } = this.config;

        // 海底用の環境光（弱め）
        const ambientLight = new THREE.AmbientLight(
            lighting.ambientColor,
            lighting.ambientIntensity
        );
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);

        // 上からの指向性ライト（水面からの光）
        const directionalLight = new THREE.DirectionalLight('#ffffff', lighting.diffuseIntensity);
        directionalLight.position.set(
            lighting.lightDirection.x * 100,
            lighting.lightDirection.y * 100,
            lighting.lightDirection.z * 100
        );
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
    }

    init(sharedAssets) {
        const { fog, shader, modelScale, colors, lighting } = this.config;

        this.scene.background = null;
        this.backgroundSphere = this.createBackgroundSphere();
        this.scene.add(this.backgroundSphere);

        this.scene.fog = new THREE.FogExp2(new THREE.Color(colors.deepWater), fog.density);

        // 海底用ライトを作成
        this.createLights();

        // 共通ライティングuniformsを作成
        this.lightingUniforms = this.createLightingUniforms();

        // 建物用マテリアル
        const underwaterMaterial = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            uniforms: {
                ...THREE.UniformsLib.fog,
                ...this.lightingUniforms,
                uDistortionStrength: { value: 3.0 }
            },
            vertexShader: vertexShader,
            fragmentShader: buildingFragmentShader,
            fog: true
        });

        // 海底砂地用マテリアル
        this.seabedMaterial = new THREE.ShaderMaterial({
            side: THREE.FrontSide,
            uniforms: {
                ...THREE.UniformsLib.fog,
                ...this.lightingUniforms,
                uCausticScale: { value: 0.1 },
                uRippleScale: { value: 100.0 }
            },
            vertexShader: seabedVertexShader,
            fragmentShader: seabedFragmentShader,
            fog: true
        });

        // 床のマテリアルを海底砂地に上書き
        if (sharedAssets.floorMesh) {
            this.originalFloorMaterial = sharedAssets.floorMesh.material;
            sharedAssets.floorMesh.material = this.seabedMaterial;
        }

        // キャンパスモデルのマテリアルを差し替える
        if (sharedAssets.buildingRoot) {
            this.buildingRoot = sharedAssets.buildingRoot;

            const tessellator = new TessellateModifier(0.8, 8);

            // configからモデルのスケールを適用
            sharedAssets.buildingRoot.scale.setScalar(modelScale);

            sharedAssets.buildingRoot.traverse((child) => {
                if (child.isMesh) {
                    child.material = underwaterMaterial;

                    if (!child.userData.isTessellated) {
                        try {
                            let geo = child.geometry;

                            if (geo.index) {
                                geo = geo.toNonIndexed();
                            }

                            // メッシュを分割
                            geo = tessellator.modify(geo);

                            geo.computeBoundingBox();
                            const size = new THREE.Vector3();
                            geo.boundingBox.getSize(size);

                            geo.computeVertexNormals();

                            const maxDim = Math.max(size.x, size.y, size.z);
                            if (maxDim < 20.0) {
                                 child.visible = false;
                                 return;
                            }

                            child.geometry = geo;

                            child.userData.isTessellated = true;
                        } catch (e) {
                            console.warn('Tessellation failed for:', child.name, e);
                        }
                    }
                }
            });
            this.scene.add(sharedAssets.buildingRoot);
        }

        // 魚の生成（共通ライティングuniformsを渡す）
        this.fishController = new FishController(this.scene, this.config, this.lightingUniforms);

        // 衝突判定用に建物のメッシュを渡す
        if (sharedAssets.buildingRoot) {
            const obstacles = [];
            sharedAssets.buildingRoot.traverse((child) => {
                if (child.isMesh && child.visible) {
                    obstacles.push(child);
                }
            });
            this.fishController.setObstacles(obstacles);
        }
    }

    update(elapsedTime) {
        if (this.backgroundSphere && this.camera) {
            this.backgroundSphere.position.copy(this.camera.position);
        }

        this.scene.traverse((child) => {
            if (child.isMesh && child.material.uniforms && child.material.uniforms.uTime) {
                child.material.uniforms.uTime.value = elapsedTime;
            }
        });

        // 海底砂地マテリアルのuTimeも更新
        if (this.seabedMaterial && this.seabedMaterial.uniforms.uTime) {
            this.seabedMaterial.uniforms.uTime.value = elapsedTime;
        }

        if (this.fishController) {
            this.fishController.update(elapsedTime);
        }
    }

    dispose() {
        if (this.fishController) {
            this.fishController.dispose();
        }

        // ライトを削除
        this.lights.forEach(light => {
            this.scene.remove(light);
        });
        this.lights = [];

        if (this.backgroundSphere) {
            this.scene.remove(this.backgroundSphere);
            this.backgroundSphere.geometry.dispose();
            this.backgroundSphere.material.dispose();
            this.backgroundSphere = null;
        }
        this.scene.background = null;

        if (this.originalFloorMaterial) {
            this.scene.traverse((child) => {
                if (child.isMesh && child.material === this.seabedMaterial) {
                    child.material = this.originalFloorMaterial;
                }
            });
            this.originalFloorMaterial = null;
        }

        if (this.seabedMaterial) {
            this.seabedMaterial.dispose();
            this.seabedMaterial = null;
        }

        // 消していたメッシュを復元
        if (this.buildingRoot) {
            this.buildingRoot.traverse((child) => {
                if (child.isMesh) {
                    child.visible = true;
                }
            });
            this.buildingRoot = null;
        }
    }
}