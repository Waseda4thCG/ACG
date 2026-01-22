import * as THREE from 'three';
import { BaseEnvironment } from './BaseEnvironment.js';

// シェーダーのインポート
import natureVertexShader from '../shaders/nature/nature.vert';
import natureFragmentShader from '../shaders/nature/nature.frag';

export class NatureEnvironment extends BaseEnvironment {
    constructor(scene, renderer, camera, config) {
        super(scene, renderer, camera);
        this.config = config;
        this.material = null;
    }

    init(sharedAssets) {
        // 自然環境用の背景色（空色）
        this.scene.background = new THREE.Color('#87CEEB');

        // 遠くを霞ませるためのFog
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.005);

        this._setupMaterials();

        if (sharedAssets.buildingRoot) {
            const root = sharedAssets.buildingRoot;

            // Natureモードでは、建物の構成要素（窓・壁・屋根）すべてに
            // 「苔むした草シェーダー」を適用して、緑に覆われた廃墟のようにする
            root.traverse((child) => {
                if (child.isMesh) {
                    child.material = this.material;
                }
            });

            root.position.set(0, 0, 0);

            // Configからスケールを適用
            // (config.modelScale がなければデフォルト1.0)
            const scale = this.config.modelScale ?? 1.0;
            root.scale.setScalar(scale);

            this.scene.add(root);
        }
    }

    update(elapsedTime) {
        // シェーダーに時間を渡す（風の揺れアニメーション用）
        if (this.material && this.material.uniforms && this.material.uniforms.uTime) {
            this.material.uniforms.uTime.value = elapsedTime;
        }
    }

    dispose() {
        // マテリアルの破棄
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }
        // 建物メッシュ自体のdisposeはしない（Managerが持っている共有アセットのため）
    }

    _setupMaterials() {
        const { shader } = this.config;

        // configからパラメータを取得
        const textureScale = shader?.textureScale ?? 1.0;

        this.material = new THREE.ShaderMaterial({
            side: THREE.FrontSide,
            uniforms: {
                uLightDirection: { value: new THREE.Vector3(0.5, 1.0, 0.5).normalize() },
                uSpecularColor: { value: new THREE.Color('#ffffff') },
                uShininess: { value: 32.0 },
                uTime: { value: 0.0 },
                uScale: { value: textureScale }, // シェーダー内のスケール制御
            },
            vertexShader: natureVertexShader,
            fragmentShader: natureFragmentShader,
        });
    }
}