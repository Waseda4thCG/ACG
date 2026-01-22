import * as THREE from 'three';
import { BaseEnvironment } from './BaseEnvironment.js';

// シェーダーのインポート
import cyberPunkVertexShader from '../shaders/cyberpunk/cyberpunk.vert';
import cyberPunkFragmentShader from '../shaders/cyberpunk/cyberpunk.frag';
import gridVertexShader from '../shaders/cyberpunk/grid.vert';
import gridFragmentShader from '../shaders/cyberpunk/grid.frag';
import particlesVertexShader from '../shaders/cyberpunk/particles.vert';
import particlesFragmentShader from '../shaders/cyberpunk/particles.frag';
import voronoiVertexShader from '../shaders/cyberpunk/voronoi.vert';
import voronoiFragmentShader from '../shaders/cyberpunk/voronoi.frag';
import commonVertexShader from '../shaders/cyberpunk/common.vert';
import fbmFragmentShader from '../shaders/cyberpunk/fbm.frag';
import sdfFragmentShader from '../shaders/cyberpunk/sdf.frag';
import reactionDiffusionFragmentShader from '../shaders/cyberpunk/reactionDiffusion.frag';

// PCGモジュール
import { LSystem, LSystemPresets } from '../pcg/LSystem.js';

// カラーパレット（80年代Synthwave風）
const SUN_COLOR = new THREE.Color('#ff6ec7'); // ホットピンク
const SKY_TOP_COLOR = new THREE.Color('#1a0033'); // ダークパープル
const SKY_BOTTOM_COLOR = new THREE.Color('#ff1493'); // ディープピンク
const GRID_COLOR = new THREE.Color('#00ffff'); // シアン
const GRID_COLOR2 = new THREE.Color('#ff00ff'); // マゼンタ

export class CyberPunkEnvironment extends BaseEnvironment {
    constructor(scene, renderer, camera, config) {
        super(scene, renderer, camera);
        this.config = config;
        this.materials = {};
        this.pcgElements = []; // PCG生成要素
        this.buildingRoot = null; // 建物のルートメッシュ
    }

    init(sharedAssets) {
        // グラデーション背景（Synthwave風の夕日）
        this._setupGradientBackground();

        // Fog（紫のミスト）
        this.scene.fog = new THREE.Fog(SKY_TOP_COLOR, 100, 400);

        // デジタルパーティクルを生成
        this._setupDigitalParticles();

        // プロシージャルな幾何学オブジェクトを生成
        this._setupProceduralGeometry();

        // プロシージャルなビルボード/看板を生成
        this._setupProceduralBillboards();

        // 先進的なPCG技法
        this._setupFBMObjects();
        this._setupSDFObjects();
        this._setupReactionDiffusionSurfaces();

        // マテリアルセットアップ
        this._setupMaterials();

        if (sharedAssets.buildingRoot) {
            const root = sharedAssets.buildingRoot;
            this.buildingRoot = root; // 建物への参照を保存

            root.traverse((child) => {
                if (child.isMesh) {
                    const name = child.userData.originalMatName || '';

                    // マテリアル名に基づいて異なるマテリアルを適用
                    if (name.includes('window') || name.includes('glass')) {
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

        // 建物を追加した後にL-System構造を生成（建物から生やすため）
        this._setupLSystemStructures();
    }

    _setupProceduralGrid() {
        // プロシージャルに生成される動くグリッド床
        const gridSize = 500;
        const gridGeometry = new THREE.PlaneGeometry(gridSize, gridSize, 30, 30);

        const gridMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0.0 },
                uColor1: { value: new THREE.Color('#0a0a1a') }, // ダーク
                uColor2: { value: new THREE.Color('#0f0f1f') }, // 少し明るい
                uGlowColor: { value: GRID_COLOR },
                uGridSize: { value: 0.5 },
                uWaveAmplitude: { value: 0.0 },  // 波を完全に無効化
                uWaveFrequency: { value: 0.0 }   // 周波数も0
            },
            vertexShader: gridVertexShader,
            fragmentShader: gridFragmentShader,
            side: THREE.DoubleSide
        });

        const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
        gridMesh.rotation.x = -Math.PI / 2;
        gridMesh.position.y = 0;
        this.scene.add(gridMesh);

        this.pcgElements.push({
            type: 'grid',
            mesh: gridMesh,
            material: gridMaterial
        });
    }

    _setupDigitalParticles() {
        // デジタル風の浮遊パーティクル（控えめに）
        const particleCount = 150;
        const positions = new Float32Array(particleCount * 3);
        const scales = new Float32Array(particleCount);
        const randomOffsets = new Float32Array(particleCount * 3);

        // ランダム配置
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // ランダム位置
            positions[i3] = (Math.random() - 0.5) * 400;
            positions[i3 + 1] = Math.random() * 200 - 100;
            positions[i3 + 2] = (Math.random() - 0.5) * 400;

            // ランダムスケール
            scales[i] = Math.random() * 0.5 + 0.5;

            // ランダムオフセット（移動用）
            randomOffsets[i3] = (Math.random() - 0.5) * 10;
            randomOffsets[i3 + 1] = 0;
            randomOffsets[i3 + 2] = (Math.random() - 0.5) * 10;
        }

        const particlesGeometry = new THREE.BufferGeometry();
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
        particlesGeometry.setAttribute('aRandomOffset', new THREE.BufferAttribute(randomOffsets, 3));

        const particlesMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0.0 },
                uSize: { value: 4.0 }
            },
            vertexShader: particlesVertexShader,
            fragmentShader: particlesFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        this.scene.add(particlesMesh);

        this.pcgElements.push({
            type: 'particles',
            mesh: particlesMesh,
            material: particlesMaterial
        });
    }

    _setupProceduralGeometry() {
        // プロシージャルに生成されるランダムな幾何学オブジェクト
        const geometryCount = 30;
        const geometryTypes = ['box', 'sphere', 'cylinder', 'torus'];

        for (let i = 0; i < geometryCount; i++) {
            // ランダムな形状
            const type = geometryTypes[Math.floor(Math.random() * geometryTypes.length)];
            let geometry;

            switch(type) {
                case 'box':
                    geometry = new THREE.BoxGeometry(
                        Math.random() * 3 + 1,
                        Math.random() * 5 + 2,
                        Math.random() * 3 + 1
                    );
                    break;
                case 'sphere':
                    geometry = new THREE.SphereGeometry(Math.random() * 2 + 0.5, 16, 16);
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(
                        Math.random() * 1 + 0.5,
                        Math.random() * 1 + 0.5,
                        Math.random() * 4 + 2,
                        16
                    );
                    break;
                case 'torus':
                    geometry = new THREE.TorusGeometry(Math.random() * 1.5 + 0.5, Math.random() * 0.5 + 0.2, 16, 32);
                    break;
            }

            // Voronoiパターンマテリアル
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0.0 },
                    uColor1: { value: new THREE.Color(Math.random(), Math.random(), Math.random()) },
                    uColor2: { value: new THREE.Color(Math.random(), Math.random(), Math.random()) },
                    uScale: { value: Math.random() * 3 + 1 }
                },
                vertexShader: voronoiVertexShader,
                fragmentShader: voronoiFragmentShader
            });

            const mesh = new THREE.Mesh(geometry, material);

            // ランダム配置（建物の周りに散らばる）
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 150 + 80;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.y = Math.random() * 20 + 5;
            mesh.position.z = Math.sin(angle) * radius;

            // ランダム回転
            mesh.rotation.x = Math.random() * Math.PI;
            mesh.rotation.y = Math.random() * Math.PI;
            mesh.rotation.z = Math.random() * Math.PI;

            this.scene.add(mesh);

            this.pcgElements.push({
                type: 'geometry',
                mesh: mesh,
                material: material,
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.2,
                    y: (Math.random() - 0.5) * 0.2,
                    z: (Math.random() - 0.5) * 0.2
                }
            });
        }
    }

    _setupProceduralBillboards() {
        // プロシージャルなネオン看板/ビルボード
        const billboardCount = 15;

        for (let i = 0; i < billboardCount; i++) {
            // ランダムなサイズ
            const width = Math.random() * 10 + 5;
            const height = Math.random() * 8 + 4;

            const geometry = new THREE.PlaneGeometry(width, height);

            // ランダムな色（ネオンカラー）
            const neonColors = [
                new THREE.Color('#ff00ff'), // マゼンタ
                new THREE.Color('#00ffff'), // シアン
                new THREE.Color('#ff6ec7'), // ホットピンク
                new THREE.Color('#00ff00'), // グリーン
                new THREE.Color('#ffff00')  // イエロー
            ];

            const color = neonColors[Math.floor(Math.random() * neonColors.length)];

            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: Math.random() * 0.3 + 0.5,
                side: THREE.DoubleSide
            });

            const billboard = new THREE.Mesh(geometry, material);

            // 建物の周りに配置
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 120 + 60;
            billboard.position.x = Math.cos(angle) * radius;
            billboard.position.y = Math.random() * 30 + 10;
            billboard.position.z = Math.sin(angle) * radius;

            // カメラの方を向く（ビルボード効果）
            billboard.lookAt(0, billboard.position.y, 0);

            this.scene.add(billboard);

            this.pcgElements.push({
                type: 'billboard',
                mesh: billboard,
                material: material,
                pulseSpeed: Math.random() * 2 + 1,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }
    }

    _setupFBMObjects() {
        // FBM (Fractional Brownian Motion) を使った有機的なテクスチャオブジェクト
        const fbmCount = 10;

        for (let i = 0; i < fbmCount; i++) {
            // ランダムな球体や不規則な形
            const geometry = new THREE.IcosahedronGeometry(Math.random() * 4 + 2, 2);

            // FBMシェーダーマテリアル
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0.0 },
                    uColor1: { value: new THREE.Color('#1a0033') }, // ダークパープル
                    uColor2: { value: new THREE.Color('#ff00ff') }, // マゼンタ
                    uColor3: { value: new THREE.Color('#00ffff') }, // シアン
                    uScale: { value: Math.random() * 2 + 0.5 },
                    uOctaves: { value: Math.floor(Math.random() * 3 + 4) } // 4-6オクターブ
                },
                vertexShader: commonVertexShader, // vNormalを含む共通頂点シェーダー
                fragmentShader: fbmFragmentShader
            });

            const mesh = new THREE.Mesh(geometry, material);

            // 建物の周りに配置（少し遠めに）
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 100 + 120;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.y = Math.random() * 40 + 20;
            mesh.position.z = Math.sin(angle) * radius;

            // ゆっくり回転
            mesh.rotation.x = Math.random() * Math.PI;
            mesh.rotation.y = Math.random() * Math.PI;

            this.scene.add(mesh);

            this.pcgElements.push({
                type: 'fbm',
                mesh: mesh,
                material: material,
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.1,
                    y: (Math.random() - 0.5) * 0.1,
                    z: (Math.random() - 0.5) * 0.1
                }
            });
        }
    }

    _setupSDFObjects() {
        // SDF (Signed Distance Fields) を使った複雑な形状
        const sdfCount = 8;

        for (let i = 0; i < sdfCount; i++) {
            // 平面ジオメトリにSDFシェーダーを適用
            const size = Math.random() * 8 + 6;
            const geometry = new THREE.PlaneGeometry(size, size, 32, 32);

            // SDFシェーダーマテリアル
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0.0 },
                    uColor1: { value: new THREE.Color('#ff6ec7') }, // ホットピンク
                    uColor2: { value: new THREE.Color('#00ffff') }, // シアン
                    uScale: { value: Math.random() * 1.5 + 0.5 }
                },
                vertexShader: voronoiVertexShader,
                fragmentShader: sdfFragmentShader,
                transparent: true,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geometry, material);

            // 建物の周りに配置
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 80 + 100;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.y = Math.random() * 35 + 15;
            mesh.position.z = Math.sin(angle) * radius;

            // ランダムな向き
            mesh.rotation.x = Math.random() * Math.PI;
            mesh.rotation.y = Math.random() * Math.PI;

            this.scene.add(mesh);

            this.pcgElements.push({
                type: 'sdf',
                mesh: mesh,
                material: material,
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.15,
                    y: (Math.random() - 0.5) * 0.15,
                    z: (Math.random() - 0.5) * 0.15
                }
            });
        }
    }

    _setupReactionDiffusionSurfaces() {
        // Reaction-Diffusion パターンを使った有機的な表面
        const rdCount = 6;

        for (let i = 0; i < rdCount; i++) {
            // 球体または平面にReaction-Diffusionパターンを適用
            const usesSphere = Math.random() > 0.5;
            let geometry;

            if (usesSphere) {
                geometry = new THREE.SphereGeometry(Math.random() * 5 + 3, 32, 32);
            } else {
                const size = Math.random() * 12 + 8;
                geometry = new THREE.PlaneGeometry(size, size, 32, 32);
            }

            // Reaction-Diffusionシェーダーマテリアル
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0.0 },
                    uColor1: { value: new THREE.Color('#ff00ff') }, // マゼンタ
                    uColor2: { value: new THREE.Color('#00ff00') }, // グリーン
                    uScale: { value: Math.random() * 3 + 1 }
                },
                vertexShader: voronoiVertexShader,
                fragmentShader: reactionDiffusionFragmentShader,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geometry, material);

            // 建物の周りに配置
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 90 + 110;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.y = Math.random() * 30 + 25;
            mesh.position.z = Math.sin(angle) * radius;

            // ランダムな向き
            mesh.rotation.x = Math.random() * Math.PI;
            mesh.rotation.y = Math.random() * Math.PI;

            this.scene.add(mesh);

            this.pcgElements.push({
                type: 'reactionDiffusion',
                mesh: mesh,
                material: material,
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.08,
                    y: (Math.random() - 0.5) * 0.08,
                    z: (Math.random() - 0.5) * 0.08
                }
            });
        }
    }

    _setupLSystemStructures() {
        // L-System を使ったフラクタル構造
        const presetNames = ['tree', 'plant3D', 'tower'];

        // 建物のバウンディングボックスを計算
        let buildingBounds = null;
        if (this.buildingRoot) {
            const box = new THREE.Box3().setFromObject(this.buildingRoot);
            buildingBounds = {
                min: box.min,
                max: box.max,
                center: box.getCenter(new THREE.Vector3()),
                size: box.getSize(new THREE.Vector3())
            };
        }

        // 地面から生やす（5個）
        for (let i = 0; i < 5; i++) {
            this._createLSystemStructure(presetNames, 'ground', buildingBounds);
        }

        // 建物の壁面から生やす（10個）
        if (buildingBounds) {
            for (let i = 0; i < 10; i++) {
                this._createLSystemStructure(presetNames, 'wall', buildingBounds);
            }
        }

        // 建物の屋上から生やす（5個）
        if (buildingBounds) {
            for (let i = 0; i < 5; i++) {
                this._createLSystemStructure(presetNames, 'roof', buildingBounds);
            }
        }
    }

    _createLSystemStructure(presetNames, locationType, buildingBounds) {
        // ランダムなプリセットを選択
        const presetName = presetNames[Math.floor(Math.random() * presetNames.length)];
        const preset = LSystemPresets[presetName];

        // L-Systemを生成
        const lsystem = new LSystem(preset.axiom, preset.rules, preset.iterations);
        lsystem.generate();

        // マテリアル（ネオンカラー）
        const neonColors = [
            new THREE.Color('#ff00ff'), // マゼンタ
            new THREE.Color('#00ffff'), // シアン
            new THREE.Color('#ff6ec7'), // ホットピンク
            new THREE.Color('#00ff00')  // グリーン
        ];
        const color = neonColors[Math.floor(Math.random() * neonColors.length)];

        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });

        // メッシュを作成
        const options = {
            length: Math.random() * 2 + 1.5,
            angle: preset.angle,
            thickness: 0.15,
            thicknessDecay: 0.85
        };

        const mesh = lsystem.createMesh(material, options);

        // 配置タイプに応じて位置と向きを設定
        if (locationType === 'ground') {
            // 地面から生やす（既存の配置）
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 60 + 130;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.y = 0;
            mesh.position.z = Math.sin(angle) * radius;
            mesh.rotation.y = Math.random() * Math.PI * 2;

        } else if (locationType === 'wall' && buildingBounds) {
            // 壁面から生やす
            const side = Math.floor(Math.random() * 4); // 4つの壁面
            const heightRatio = Math.random() * 0.7 + 0.1; // 壁の10%〜80%の高さ
            const positionAlongWall = Math.random();

            switch (side) {
                case 0: // 北側の壁（+Z）から外側（+Z方向）に突き出す
                    mesh.position.x = buildingBounds.min.x + positionAlongWall * buildingBounds.size.x;
                    mesh.position.z = buildingBounds.max.z;
                    mesh.rotation.x = Math.PI / 2; // 横向き
                    mesh.rotation.z = 0;
                    break;
                case 1: // 東側の壁（+X）から外側（+X方向）に突き出す
                    mesh.position.x = buildingBounds.max.x;
                    mesh.position.z = buildingBounds.min.z + positionAlongWall * buildingBounds.size.z;
                    mesh.rotation.x = Math.PI / 2;
                    mesh.rotation.z = Math.PI / 2;
                    break;
                case 2: // 南側の壁（-Z）から外側（-Z方向）に突き出す
                    mesh.position.x = buildingBounds.min.x + positionAlongWall * buildingBounds.size.x;
                    mesh.position.z = buildingBounds.min.z;
                    mesh.rotation.x = Math.PI / 2;
                    mesh.rotation.z = Math.PI;
                    break;
                case 3: // 西側の壁（-X）から外側（-X方向）に突き出す
                    mesh.position.x = buildingBounds.min.x;
                    mesh.position.z = buildingBounds.min.z + positionAlongWall * buildingBounds.size.z;
                    mesh.rotation.x = Math.PI / 2;
                    mesh.rotation.z = -Math.PI / 2;
                    break;
            }
            mesh.position.y = buildingBounds.min.y + heightRatio * buildingBounds.size.y;

        } else if (locationType === 'roof' && buildingBounds) {
            // 屋上から生やす
            const positionX = buildingBounds.min.x + Math.random() * buildingBounds.size.x;
            const positionZ = buildingBounds.min.z + Math.random() * buildingBounds.size.z;

            mesh.position.x = positionX;
            mesh.position.y = buildingBounds.max.y;
            mesh.position.z = positionZ;
            mesh.rotation.y = Math.random() * Math.PI * 2;
        }

        // スケール調整
        const scale = Math.random() * 0.5 + 0.8;
        mesh.scale.setScalar(scale);

        this.scene.add(mesh);

        this.pcgElements.push({
            type: 'lsystem',
            mesh: mesh,
            material: material,
            rotationSpeed: {
                y: (Math.random() - 0.5) * 0.05
            }
        });
    }

    _setupGradientBackground() {
        // グラデーション背景用のシェーダーマテリアル
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldPosition;

            void main() {
                float h = normalize(vWorldPosition).y;
                // 下から上へのグラデーション
                float t = max(0.0, (h + 0.5) / 1.5);
                vec3 color = mix(bottomColor, topColor, t);
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const skyGeo = new THREE.SphereGeometry(500, 32, 15);
        const skyMat = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                topColor: { value: SKY_TOP_COLOR },
                bottomColor: { value: SKY_BOTTOM_COLOR }
            },
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
        this.skyMesh = sky;

        // 太陽（グローイングサークル）
        const sunGeo = new THREE.CircleGeometry(30, 32);
        const sunMat = new THREE.MeshBasicMaterial({
            color: SUN_COLOR,
            transparent: true,
            opacity: 0.8
        });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(0, 100, -300);
        sun.lookAt(this.camera.position);
        this.scene.add(sun);
        this.sunMesh = sun;

        // 太陽のグロー
        const glowGeo = new THREE.CircleGeometry(50, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: SUN_COLOR,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(sun.position);
        glow.lookAt(this.camera.position);
        this.scene.add(glow);
        this.glowMesh = glow;
    }

    _setupMaterials() {
        const { shader } = this.config;

        // 共通uniforms
        const commonUniforms = {
            uTime: { value: 0.0 },
            uLightDirection: { value: new THREE.Vector3(0.5, 1.0, -0.5).normalize() },
            uSunColor: { value: SUN_COLOR },
            uSkyColor: { value: SKY_TOP_COLOR },
            uGridColor: { value: GRID_COLOR },
            uGridScale: { value: shader?.gridScale ?? 2.0 },
            uScanlineIntensity: { value: shader?.scanlineIntensity ?? 0.15 },
            uEmissiveStrength: { value: shader?.emissiveStrength ?? 1.5 }
        };

        // Window マテリアル（ネオンウィンドウ）
        this.materials.window = new THREE.ShaderMaterial({
            uniforms: {
                ...commonUniforms,
                uMaterialType: { value: 1 } // 1 = window
            },
            vertexShader: cyberPunkVertexShader,
            fragmentShader: cyberPunkFragmentShader,
            side: THREE.FrontSide
        });

        // Roof マテリアル（オレンジ/紫）
        this.materials.roof = new THREE.ShaderMaterial({
            uniforms: {
                ...commonUniforms,
                uMaterialType: { value: 2 } // 2 = roof
            },
            vertexShader: cyberPunkVertexShader,
            fragmentShader: cyberPunkFragmentShader,
            side: THREE.FrontSide
        });

        // Wall マテリアル（ダークwithグリッド）
        this.materials.wall = new THREE.ShaderMaterial({
            uniforms: {
                ...commonUniforms,
                uMaterialType: { value: 0 } // 0 = wall
            },
            vertexShader: cyberPunkVertexShader,
            fragmentShader: cyberPunkFragmentShader,
            side: THREE.FrontSide
        });
    }

    update(elapsedTime) {
        // 全マテリアルのuTimeを更新
        Object.values(this.materials).forEach(material => {
            if (material.uniforms && material.uniforms.uTime) {
                material.uniforms.uTime.value = elapsedTime;
            }
        });

        // PCG要素のuTimeを更新とアニメーション
        this.pcgElements.forEach(element => {
            if (element.material.uniforms && element.material.uniforms.uTime) {
                element.material.uniforms.uTime.value = elapsedTime;
            }

            // 幾何学オブジェクトの回転
            if (element.type === 'geometry' && element.rotationSpeed) {
                element.mesh.rotation.x += element.rotationSpeed.x * 0.016;
                element.mesh.rotation.y += element.rotationSpeed.y * 0.016;
                element.mesh.rotation.z += element.rotationSpeed.z * 0.016;
            }

            // ビルボードのパルス効果
            if (element.type === 'billboard' && element.pulseSpeed) {
                const pulse = Math.sin(elapsedTime * element.pulseSpeed + element.pulseOffset) * 0.5 + 0.5;
                element.material.opacity = pulse * 0.3 + 0.4;
            }

            // FBMオブジェクトの回転
            if (element.type === 'fbm' && element.rotationSpeed) {
                element.mesh.rotation.x += element.rotationSpeed.x * 0.016;
                element.mesh.rotation.y += element.rotationSpeed.y * 0.016;
                element.mesh.rotation.z += element.rotationSpeed.z * 0.016;
            }

            // SDFオブジェクトの回転
            if (element.type === 'sdf' && element.rotationSpeed) {
                element.mesh.rotation.x += element.rotationSpeed.x * 0.016;
                element.mesh.rotation.y += element.rotationSpeed.y * 0.016;
                element.mesh.rotation.z += element.rotationSpeed.z * 0.016;
            }

            // Reaction-Diffusionオブジェクトの回転
            if (element.type === 'reactionDiffusion' && element.rotationSpeed) {
                element.mesh.rotation.x += element.rotationSpeed.x * 0.016;
                element.mesh.rotation.y += element.rotationSpeed.y * 0.016;
                element.mesh.rotation.z += element.rotationSpeed.z * 0.016;
            }

            // L-Systemオブジェクトの回転
            if (element.type === 'lsystem' && element.rotationSpeed) {
                element.mesh.rotation.y += element.rotationSpeed.y * 0.016;
            }
        });

        // 太陽をゆっくり回転
        if (this.sunMesh && this.glowMesh) {
            const angle = elapsedTime * 0.1;
            const radius = 300;
            this.sunMesh.position.x = Math.sin(angle) * radius * 0.3;
            this.sunMesh.position.y = 100 + Math.cos(angle) * 30;
            this.glowMesh.position.copy(this.sunMesh.position);
        }
    }

    dispose() {
        // マテリアルの破棄
        Object.values(this.materials).forEach(material => {
            if (material) {
                material.dispose();
            }
        });
        this.materials = {};

        // PCG要素の破棄
        this.pcgElements.forEach(element => {
            if (element.mesh) {
                element.mesh.geometry.dispose();
                element.material.dispose();
                this.scene.remove(element.mesh);
            }
        });
        this.pcgElements = [];

        // 背景メッシュの破棄
        if (this.skyMesh) {
            this.skyMesh.geometry.dispose();
            this.skyMesh.material.dispose();
            this.scene.remove(this.skyMesh);
        }
        if (this.sunMesh) {
            this.sunMesh.geometry.dispose();
            this.sunMesh.material.dispose();
            this.scene.remove(this.sunMesh);
        }
        if (this.glowMesh) {
            this.glowMesh.geometry.dispose();
            this.glowMesh.material.dispose();
            this.scene.remove(this.glowMesh);
        }
    }
}
