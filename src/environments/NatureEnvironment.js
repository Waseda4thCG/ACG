import * as THREE from 'three';
import { BaseEnvironment } from './BaseEnvironment.js';

// 建物用シェーダー（Urbanと同じ）
import vertexShader from '../shaders/building/shader.vert';
import windowFragmentShader from '../shaders/building/window.frag';
import roofFragmentShader from '../shaders/building/roof.frag';
import wallFragmentShader from '../shaders/building/wall.frag';

// 床（草地）用シェーダー
import grassGroundVertexShader from '../shaders/nature/grass_ground.vert';
import grassGroundFragmentShader from '../shaders/nature/grass_ground.frag';

// L-System（木生成）
import { LSystem, LSystemPresets } from '../pcg/LSystem.js';

export class NatureEnvironment extends BaseEnvironment {
    constructor(scene, renderer, camera, config) {
        super(scene, renderer, camera, config);
        this.materials = {};
        this.grassMaterial = null;
        this.trees = [];
    }

    init(sharedAssets) {
        // 自然環境用の背景色（空色）
        this.scene.background = new THREE.Color('#87CEEB');

        // 遠くを霞ませるためのFog
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.005);

        this._setupMaterials();

        if (sharedAssets.buildingRoot) {
            const root = sharedAssets.buildingRoot;

            // Urbanと同じロジック：メッシュ名に応じてマテリアルを適用
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

            // Configからスケールを適用
            const scale = this.config.modelScale ?? 1.0;
            root.scale.setScalar(scale);

            this.scene.add(root);
        }

        // 床に草シェーダーを適用
        if (sharedAssets.floorMesh) {
            sharedAssets.floorMesh.material = this.grassMaterial;
        }

        // 木を生成（建物の境界を渡す）
        const buildingBounds = this._getBuildingBounds(sharedAssets.buildingRoot);
        this._createTrees(buildingBounds);
    }

    // 建物の境界ボックスを取得
    _getBuildingBounds(root) {
        const bounds = [];
        if (!root) return bounds;

        root.traverse((child) => {
            if (child.isMesh) {
                const box = new THREE.Box3().setFromObject(child);
                bounds.push(box);
            }
        });
        return bounds;
    }

    _createTrees(buildingBounds = []) {
        const { trees } = this.config;
        const count = trees?.count ?? 150;  // InstancedMeshなので大幅に増やせる
        const minRadius = trees?.minRadius ?? 30;
        const maxRadius = trees?.maxRadius ?? 250;
        const numTemplates = 5; // プリ生成する木のテンプレート数

        // 建物との衝突チェック関数
        const collidesWithBuilding = (x, z, padding = 10) => {
            for (const box of buildingBounds) {
                if (x >= box.min.x - padding && x <= box.max.x + padding &&
                    z >= box.min.z - padding && z <= box.max.z + padding) {
                    return true;
                }
            }
            return false;
        };

        // ===== Step 1: 木のテンプレートをプリ生成 (unchanged) =====
        const treeTemplates = [];
        const preset = LSystemPresets.plant3D;

        for (let t = 0; t < numTemplates; t++) {
            const lsystem = new LSystem(preset.axiom, preset.rules, 4);
            lsystem.generate();

            const treeSize = 5 + Math.random() * 6;
            const options = {
                length: treeSize,
                angle: preset.angle + (Math.random() - 0.5) * 10,
                thickness: 0.5 + Math.random() * 0.3,
                thicknessDecay: 0.75
            };

            // 幹のジオメトリを取得（マテリアルなし）
            const { mesh: trunkMesh, tips } = lsystem.createMeshWithTips(null, options);
            const trunkGeometry = trunkMesh.geometry;

            // 葉の位置情報を保存
            const leafPositions = tips.map(tip => ({
                position: tip.clone(),
                scale: 1.5 + Math.random() * 2.5
            }));

            treeTemplates.push({
                trunkGeometry,
                leafPositions,
                baseScale: 1.0
            });
        }

        // ===== Step 2: 配置位置を計算 =====
        const positions = [];
        const gridSize = Math.ceil(Math.sqrt(count * 1.5)); // 余白を増やしてよりランダムに
        const spacing = (maxRadius * 2) / gridSize;

        for (let gx = 0; gx < gridSize && positions.length < count; gx++) {
            for (let gz = 0; gz < gridSize && positions.length < count; gz++) {
                const baseX = -maxRadius + gx * spacing + spacing / 2;
                const baseZ = -maxRadius + gz * spacing + spacing / 2;
                // グリッド感を消すためにランダムオフセットを大きく
                const x = baseX + (Math.random() - 0.5) * spacing * 1.0;
                const z = baseZ + (Math.random() - 0.5) * spacing * 1.0;

                if (!collidesWithBuilding(x, z)) {
                    positions.push({
                        x, z,
                        rotation: Math.random() * Math.PI * 2,
                        scale: 0.7 + Math.random() * 0.6,
                        templateIndex: Math.floor(Math.random() * numTemplates)
                    });
                }
            }
        }

        // ===== Step 3: テンプレートごとにInstancedMeshを作成 =====
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: '#4a3020' });
        const leafMaterials = [
            new THREE.MeshLambertMaterial({ color: '#2d6b1a' }),
            new THREE.MeshLambertMaterial({ color: '#3d8b2a' }),
            new THREE.MeshLambertMaterial({ color: '#1d5b0a' })
        ];
        const leafGeometry = new THREE.SphereGeometry(1, 6, 5);

        // 各テンプレートの使用回数をカウント
        const templateUsage = new Array(numTemplates).fill(0);
        positions.forEach(pos => templateUsage[pos.templateIndex]++);

        // テンプレートごとのインスタンス管理
        const templateInstances = treeTemplates.map((template, idx) => ({
            template,
            positions: positions.filter(p => p.templateIndex === idx),
            currentIndex: 0
        }));

        // 幹のInstancedMeshを作成
        templateInstances.forEach((data, templateIdx) => {
            const { template, positions: templatePositions } = data;
            if (templatePositions.length === 0) return;

            // 幹のInstancedMesh
            const trunkInstancedMesh = new THREE.InstancedMesh(
                template.trunkGeometry,
                trunkMaterial,
                templatePositions.length
            );

            const matrix = new THREE.Matrix4();
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();

            templatePositions.forEach((pos, i) => {
                position.set(pos.x, 0, pos.z);
                quaternion.setFromEuler(new THREE.Euler(0, pos.rotation, 0));
                scale.setScalar(pos.scale);

                matrix.compose(position, quaternion, scale);
                trunkInstancedMesh.setMatrixAt(i, matrix);
            });

            trunkInstancedMesh.instanceMatrix.needsUpdate = true;
            this.scene.add(trunkInstancedMesh);
            this.trees.push(trunkInstancedMesh);

            // 葉のInstancedMesh（各テンプレートの葉の位置 × インスタンス数）
            const leafCount = template.leafPositions.length * templatePositions.length;
            if (leafCount > 0) {
                const leafMaterial = leafMaterials[templateIdx % leafMaterials.length];
                const leafInstancedMesh = new THREE.InstancedMesh(
                    leafGeometry,
                    leafMaterial,
                    leafCount
                );

                let leafIndex = 0;
                templatePositions.forEach((treePos) => {
                    const treeQuaternion = new THREE.Quaternion();
                    treeQuaternion.setFromEuler(new THREE.Euler(0, treePos.rotation, 0));

                    template.leafPositions.forEach((leaf) => {
                        // 葉の位置を木の回転・スケール・位置に合わせて変換
                        const leafPos = leaf.position.clone()
                            .multiplyScalar(treePos.scale)
                            .applyQuaternion(treeQuaternion)
                            .add(new THREE.Vector3(treePos.x, 0, treePos.z));

                        const leafScale = leaf.scale * treePos.scale;

                        position.copy(leafPos);
                        quaternion.identity();
                        scale.set(leafScale, leafScale * 0.6, leafScale);

                        matrix.compose(position, quaternion, scale);
                        leafInstancedMesh.setMatrixAt(leafIndex, matrix);
                        leafIndex++;
                    });
                });

                leafInstancedMesh.instanceMatrix.needsUpdate = true;
                this.scene.add(leafInstancedMesh);
                this.trees.push(leafInstancedMesh);
            }
        });
    }

    update(elapsedTime) {
        // 基底クラスでシーン内の全メッシュ（建物、草地など）の uTime が自動更新される
        super.update(elapsedTime);
    }

    dispose() {
        // マテリアルの破棄
        Object.values(this.materials).forEach(mat => mat.dispose());
        this.materials = {};

        if (this.grassMaterial) {
            this.grassMaterial.dispose();
            this.grassMaterial = null;
        }

        // 木の破棄（InstancedMeshの場合）
        this.trees.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            if (mesh.material) {
                mesh.material.dispose();
            }
        });
        this.trees = [];

        // 建物メッシュ自体のdisposeはしない（Managerが持っている共有アセットのため）
    }

    _setupMaterials() {
        const { shader } = this.config;

        // configからパラメータを取得
        const textureScale = shader?.textureScale ?? 1.0;
        const windowSize = shader?.windowSize ?? 0.2;

        const commonUniforms = {
            uLightDirection: { value: new THREE.Vector3(0.5, 1.0, 0.5).normalize() },
            uSpecularColor: { value: new THREE.Color('#ffffff') },
            uShininess: { value: 32.0 },
            uTime: { value: 0.0 },
            uScale: { value: textureScale },
        };

        // 窓マテリアル（Urbanと同じ）
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

        // 屋根マテリアル（Urbanと同じ）
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

        // 壁マテリアル（Urbanと同じ）
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

        // 草（床）マテリアル
        this.grassMaterial = new THREE.ShaderMaterial({
            side: THREE.FrontSide,
            uniforms: {
                uLightDirection: { value: new THREE.Vector3(0.5, 1.0, 0.5).normalize() },
                uTime: { value: 0.0 },
            },
            vertexShader: grassGroundVertexShader,
            fragmentShader: grassGroundFragmentShader,
        });
    }
}