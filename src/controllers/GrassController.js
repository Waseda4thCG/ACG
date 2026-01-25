import * as THREE from 'three';

export class GrassController {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.mesh = null;
        this.material = null;
        this.dummy = new THREE.Object3D();
    }

    init() {
        const {
            count = 80000,
            areaSize = 450,
            bladeHeight = 3.5,
            variation = 0.7,
            excludeRadius = 50
        } = this.config.grass || {};

        // 草ブレードのジオメトリ（縦長のピラミッド型）
        const bladeGeometry = this._createBladeGeometry(bladeHeight);

        // シンプルなマテリアル（シェーダーなし、軽量化）
        this.material = new THREE.MeshLambertMaterial({
            color: 0x4a9c2d,
            side: THREE.DoubleSide
        });

        // InstancedMesh を作成
        this.mesh = new THREE.InstancedMesh(bladeGeometry, this.material, count);
        this.mesh.frustumCulled = false;

        let placedCount = 0;
        const maxAttempts = count * 2;
        let attempts = 0;

        while (placedCount < count && attempts < maxAttempts) {
            attempts++;

            // ランダムな位置
            const x = (Math.random() - 0.5) * areaSize;
            const z = (Math.random() - 0.5) * areaSize;

            // 建物の中心付近を避ける
            const distFromCenter = Math.sqrt(x * x + z * z);
            if (distFromCenter < excludeRadius) {
                continue;
            }

            // 高さにバリエーション
            const h = bladeHeight * (0.5 + Math.random() * variation);

            // 色のバリエーション
            const colorVariation = 0.7 + Math.random() * 0.6;
            const color = new THREE.Color(
                0.2 * colorVariation,
                0.5 * colorVariation,
                0.1 * colorVariation
            );
            this.mesh.setColorAt(placedCount, color);

            // 位置と回転とスケール
            this.dummy.position.set(x, 0, z);
            this.dummy.rotation.set(
                (Math.random() - 0.5) * 0.2, // 少し傾ける
                Math.random() * Math.PI * 2,
                (Math.random() - 0.5) * 0.2
            );
            this.dummy.scale.set(
                0.8 + Math.random() * 0.4,
                h / bladeHeight,
                0.8 + Math.random() * 0.4
            );
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(placedCount, this.dummy.matrix);

            placedCount++;
        }

        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) {
            this.mesh.instanceColor.needsUpdate = true;
        }

        this.scene.add(this.mesh);
    }

    _createBladeGeometry(height = 2.0) {
        // 草ブレード: 細長い三角錐
        const geometry = new THREE.ConeGeometry(0.08, height, 4, 1);
        // 根元を原点に合わせる
        geometry.translate(0, height / 2, 0);
        return geometry;
    }

    update(elapsedTime) {
        // 軽量化のためアニメーションは省略
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.material.dispose();
            this.mesh = null;
            this.material = null;
        }
    }
}
