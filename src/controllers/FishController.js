import * as THREE from 'three';
import { Boid } from '../entities/Boid.js';

import fishVertexShader from '../shaders/underwater/fish.vert';
import fishFragmentShader from '../shaders/underwater/fish.frag';

export class FishController {
    constructor(scene, config, lightingUniforms = {}) {
        this.scene = scene;
        this.config = config;
        this.lightingUniforms = lightingUniforms;
        this.raycaster = new THREE.Raycaster();
        this.count = config.fish?.count ?? 500;
        this.boids = [];
        this.mesh = null;
        this.dummy = new THREE.Object3D();
        this.scales = new Float32Array(this.count);
        this.obstacles = [];

        this.cellSize = config.boid?.perceptionRadius ?? 15.0;

        // 空間の境界サイズ
        const w = config.bounds?.width ?? 200;
        const h = config.bounds?.height ?? 100;
        const d = config.bounds?.depth ?? 200;

        // グリッドの次元数を計算
        this.gridDimX = Math.ceil(w / this.cellSize) + 2;
        this.gridDimY = Math.ceil(h / this.cellSize) + 2;
        this.gridDimZ = Math.ceil(d / this.cellSize) + 2;

        this.gridOffX = Math.floor(this.gridDimX / 2);
        this.gridOffY = Math.floor(this.gridDimY / 2);
        this.gridOffZ = Math.floor(this.gridDimZ / 2);

        // リンクリスト法
        // 各セルの「最初のボイドのインデックス
        this.gridHead = new Int32Array(this.gridDimX * this.gridDimY * this.gridDimZ);
        // 同じセルにいる次のボイドのインデックス
        this.gridNext = new Int32Array(this.count);

        this.tempNeighbors = [];

        this.tempObstacles = [];

        this._lookTarget = new THREE.Vector3();

        this.init();
    }

    setObstacles(obstacles) {
        this.obstacles = obstacles;

        const perceptionR = this.config.boid?.perceptionRadius;

        // 各オブジェクトのバウンディングボックスを事前に計算してキャッシュ
        this.obstacles.forEach(obs => {
            if (!obs.geometry.boundingSphere) {
                obs.geometry.computeBoundingSphere();
            }

            const maxScale = Math.max(obs.scale.x, obs.scale.y, obs.scale.z);
            obs.userData.worldRadius = obs.geometry.boundingSphere.radius * maxScale;
            obs.userData.checkThreshold = perceptionR + obs.userData.worldRadius;
        });
    }

    createFishGeometry(length = 1.0, radius = 0.3) {
        const geometry = new THREE.BufferGeometry();

        const noseZ = length * 0.5;
        const tailBaseZ = -length * 0.3;
        const tailTipZ = -length * 0.8;
        const bodyW = radius * 0.6;
        const bodyH = radius;
        const tailH = radius * 1.5;

        const vertices = [
            // 鼻先
            0, 0, noseZ,
            // 背中
            0, bodyH, 0,
            // お腹
            0, -bodyH, 0,
            // 左側面
            bodyW, 0, 0,
            // 右側面
            -bodyW, 0, 0,
            // 尻尾の付け根
            0, 0, tailBaseZ,
            // 尻尾の上端
            0, tailH, tailTipZ,
            // 尻尾の下端
            0, -tailH, tailTipZ
        ];

        const indices = [
            // 頭部〜胴体
            0, 3, 1,  0, 1, 4,
            0, 2, 3,  0, 4, 2,

            // 胴体後ろ
            1, 3, 5,  4, 1, 5,
            3, 2, 5,  2, 4, 5,

            // 尻尾
            5, 6, 7
        ];

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return geometry;
    }

    init() {
        const { bounds, fish, boid } = this.config;
        const boundSize = {
            w: bounds?.width,
            h: bounds?.height,
            d: bounds?.depth
        };
        const speeds = new Float32Array(this.count);
        const offsets = new Float32Array(this.count);

        for (let i = 0; i < this.count; i++) {
            this.boids.push(new Boid(boundSize.w, boundSize.h, boundSize.d, i, boid));
        }

        const meshRadius = fish?.meshRadius ?? 0.3;
        const meshLength = fish?.meshLength ?? 1.2;
        const fishGeometry = this.createFishGeometry(meshLength, meshRadius);

        // 共通ライティングuniformsを使用
        const fishMaterial = new THREE.ShaderMaterial({
            vertexShader: fishVertexShader,
            fragmentShader: fishFragmentShader,
            uniforms: {
                ...THREE.UniformsLib.fog,
                ...this.lightingUniforms,
                uTime: { value: 0.0 }
            },
            side: THREE.DoubleSide,
            fog: true
        });

        // 魚の初期位置
        for (let i = 0; i < this.count; i++) {
            // アニメーション用
            speeds[i] = 0.5 + Math.random() * 0.5;
            offsets[i] = Math.random() * Math.PI * 2;

            // 全体のスケール（年齢/大きさ）のみランダム
            this.scales[i] = (fish.baseScale || 1.0) * (0.8 + Math.random() * 0.4);

            this.dummy.position.copy(this.boids[i].position);
            this.dummy.scale.setScalar(this.scales[i]);
            this.dummy.updateMatrix();
        }

        fishGeometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds, 1));
        fishGeometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 1));

        this.mesh = new THREE.InstancedMesh(fishGeometry, fishMaterial, this.count);

        for (let i = 0; i < this.count; i++) {
             this.dummy.position.copy(this.boids[i].position);
             this.dummy.scale.setScalar(this.scales[i]);
             this.dummy.updateMatrix();
             this.mesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.scene.add(this.mesh);
    }

    _getGridIndex(x, y, z) {
        const gx = Math.floor(x / this.cellSize) + this.gridOffX;
        const gy = Math.floor(y / this.cellSize) + this.gridOffY;
        const gz = Math.floor(z / this.cellSize) + this.gridOffZ;

        if (gx < 0 || gx >= this.gridDimX ||
            gy < 0 || gy >= this.gridDimY ||
            gz < 0 || gz >= this.gridDimZ) {
            return -1;
        }
        return gx + gy * this.gridDimX + gz * this.gridDimX * this.gridDimY;
    }

    update(time) {
        if(!this.mesh) {
            return;
        }

        this.mesh.material.uniforms.uTime.value = time;

        this.gridHead.fill(-1);

        for (let i = 0; i < this.count; i++) {
            const boid = this.boids[i];
            const idx = this._getGridIndex(boid.position.x, boid.position.y, boid.position.z);

            if (idx !== -1) {
                this.gridNext[i] = this.gridHead[idx];
                this.gridHead[idx] = i;
            } else {
                this.gridNext[i] = -1;
            }
        }

        for (let i = 0; i < this.count; i++) {
            const boid = this.boids[i];

            this.tempNeighbors.length = 0;

            // 魚の位置をセル単位で計算
            const bx = Math.floor(boid.position.x / this.cellSize) + this.gridOffX;
            const by = Math.floor(boid.position.y / this.cellSize) + this.gridOffY;
            const bz = Math.floor(boid.position.z / this.cellSize) + this.gridOffZ;

            // 3x3x3 近傍セルを走査
            for (let z = bz - 1; z <= bz + 1; z++) {
                if (z < 0 || z >= this.gridDimZ) continue;
                const zOffset = z * this.gridDimX * this.gridDimY;

                for (let y = by - 1; y <= by + 1; y++) {
                    if (y < 0 || y >= this.gridDimY) continue;
                    const yOffset = y * this.gridDimX;

                    for (let x = bx - 1; x <= bx + 1; x++) {
                        if (x < 0 || x >= this.gridDimX) continue;

                        let neighborId = this.gridHead[x + yOffset + zOffset];
                        while (neighborId !== -1) {
                            if (neighborId !== i) {
                                const neighbor = this.boids[neighborId];
                                const dx = Math.abs(boid.position.x - neighbor.position.x);

                                // perceptionRadiusよりもX距離が離れていたらスキップ
                                if (dx <= this.cellSize) {
                                    const dy = Math.abs(boid.position.y - neighbor.position.y);
                                    if (dy <= this.cellSize) {
                                        const dz = Math.abs(boid.position.z - neighbor.position.z);
                                        if (dz <= this.cellSize) {
                                            this.tempNeighbors.push(neighbor);
                                        }
                                    }
                                }
                            }
                            neighborId = this.gridNext[neighborId];
                        }
                    }
                }
            }

            boid.flock(this.tempNeighbors);

            this.tempObstacles.length = 0;

            for (let k = 0; k < this.obstacles.length; k++) {
                const obs = this.obstacles[k];
                const threshold = obs.userData.checkThreshold;

                // 各軸の差分
                const dx = Math.abs(boid.position.x - obs.position.x);
                if (dx > threshold) continue;

                const dy = Math.abs(boid.position.y - obs.position.y);
                if (dy > threshold) continue;

                const dz = Math.abs(boid.position.z - obs.position.z);
                if (dz > threshold) continue;

                // 候補に残った場合のみ、正確な二乗距離を計算
                const distSq = boid.position.distanceToSquared(obs.position);

                if (distSq < threshold * threshold) {
                    this.tempObstacles.push(obs);
                }
            }

            if (this.tempObstacles.length > 0) {
                boid.avoidObstacles(this.raycaster, this.tempObstacles);
            }

            boid.update();

            // Shader用ダミー更新
            this.dummy.position.copy(boid.position);
            const velocity = boid.velocity;
            if (velocity.lengthSq() > 0.0001) {
                this._lookTarget.copy(boid.position).add(velocity);
                this.dummy.lookAt(this._lookTarget);
            }
            this.dummy.scale.setScalar(this.scales[i]);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.boids = [];
        this.obstacles = [];
        this.gridHead = null;
        this.gridNext = null;
        this.tempNeighbors = null;
    }
}