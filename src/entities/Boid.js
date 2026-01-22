
import * as THREE from 'three';
const _diff = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _avoidance = new THREE.Vector3();
const _tmpDirL = new THREE.Vector3();
const _tmpDirR = new THREE.Vector3();
const _tmp = new THREE.Vector3();

export class Boid {
    constructor(sceneWidth, sceneHeight, sceneDepth, index, boidConfig = {}) {
        this.sceneWidth = sceneWidth;
        this.sceneHeight = sceneHeight;
        this.sceneDepth = sceneDepth;
        this.index = index;

        // configから値を取得、未指定の場合はデフォルト値を使用
        this.minHeight = boidConfig.minHeight ?? 2.0;
        this.bodySize = boidConfig.bodySize ?? 1.5;
        this.maxSpeed = boidConfig.maxSpeed ?? 0.3;
        this.maxForce = boidConfig.maxForce ?? 0.01;
        this.perceptionRadius = boidConfig.perceptionRadius ?? 15.0;
        this.collisionRadius = boidConfig.collisionRadius ?? 5.0;
        this.avoidanceWeight = boidConfig.avoidanceWeight ?? 2.5;
        this.separationWeight = boidConfig.separationWeight ?? 4.0;
        this.alignmentWeight = boidConfig.alignmentWeight ?? 0.3;
        this.cohesionWeight = boidConfig.cohesionWeight ?? 0.1;

        // 初期配置
        const clusterIndex = Math.floor(index / 10);
        const clusterX = (Math.sin(clusterIndex * 12.9898) * 0.5) * (this.sceneWidth - 10);
        const clusterZ = (Math.cos(clusterIndex * 78.233) * 0.5) * (this.sceneDepth - 10);
        const clusterY = this.minHeight + Math.abs(Math.sin(clusterIndex)) * (this.sceneHeight / 2);

        this.position = new THREE.Vector3(
            clusterX + (Math.random() - 0.5) * 10.0,
            clusterY + (Math.random() - 0.5) * 5.0,
            clusterZ + (Math.random() - 0.5) * 10.0
        );

        // 個体毎の巡航速度
        this.cruiseSpeed = this.maxSpeed * (0.2 + Math.random() * 0.8);

        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5),
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5)
        ).normalize().multiplyScalar(this.cruiseSpeed);

        this.acceleration = new THREE.Vector3();
        this.currentForce = new THREE.Vector3();

        this.wrapEdges();

        this.frameCount = 0;
    }

    update() {
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.set(0, 0, 0);
        this.wrapEdges();
        this.frameCount++;
    }

    // 群れの動きの制御
    flock(boids) {
        let total = 0;
        const eps = 1e-4;
        const separation = new THREE.Vector3();
        const alignment = new THREE.Vector3();
        const cohesion = new THREE.Vector3();

        // 衝突判定用
        const collisionDistance = this.collisionRadius * 2.0;
        const collisionDistanceSq = collisionDistance * collisionDistance;

        for (const other of boids) {
            // 魚同士の距離を計算
            const dSq = this.position.distanceToSquared(other.position);

            // 視界範囲内かつ自分自身ではない
            if (other !== this && dSq < this.perceptionRadius * this.perceptionRadius && dSq > 0) {

                // 他の魚との距離の総和
                if (dSq < collisionDistanceSq) {
                    _diff.subVectors(this.position, other.position);
                    // 近づくほど反発力が強まる
                    _diff.divideScalar(dSq + eps);

                    _diff.multiplyScalar(this.avoidanceWeight);

                    separation.add(_diff);
                }

                alignment.add(other.velocity);
                cohesion.add(other.position);
                total++;
            }
        }

        if (total > 0) {
            // Separation: 近づいたら逆向きに力を加える
            if (separation.lengthSq() > 0) {
                 separation.divideScalar(total).setLength(this.maxSpeed).sub(this.velocity);
            }
            // Alignment: 周りの魚の平均速度に近づく
            alignment.divideScalar(total).setLength(this.cruiseSpeed).sub(this.velocity);
            // Cohesion: 周りの魚の平均位置に近づく
            cohesion.divideScalar(total).sub(this.position).setLength(this.cruiseSpeed).sub(this.velocity);
        }

        separation.multiplyScalar(this.separationWeight).clampLength(0, this.maxForce);
        alignment.multiplyScalar(this.alignmentWeight).clampLength(0, this.maxForce);
        cohesion.multiplyScalar(this.cohesionWeight).clampLength(0, this.maxForce);

        this.acceleration.add(separation);
        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);

        // if (this.index === 0) {
        //     const fmt = (v) => `x:${v.x.toFixed(5)}, y:${v.y.toFixed(5)}, z:${v.z.toFixed(5)}`;
        //     console.log(`[Frame ${this.frameCount}] Boid 0`);
        //     console.log("Sep:", fmt(separation));
        //     console.log("Ali:", fmt(alignment));
        //     console.log("Coh:", fmt(cohesion));
        //     console.log("Acc:", fmt(this.acceleration));
        // }
    }

    // 障害物回避
    avoidObstacles(raycaster, obstacles) {
        if(obstacles.length === 0 || this.velocity.lengthSq() === 0) {
            return;
        }
        // 5フレームに1回判定. 判定タイミングを個体ごとにずらす
        const skipUpdate = (this.frameCount + this.index) % 5 !== 0;

        if (skipUpdate) {
            this.currentForce.multiplyScalar(0.98);
        } else {
            // Fibonacci Sphere
            _forward.copy(this.velocity).normalize();
            raycaster.set(this.position, _forward);
            raycaster.near = 0;
            raycaster.far = this.perceptionRadius;

            let intersects = raycaster.intersectObjects(obstacles, true);

            if (intersects.length === 0) {
                this.currentForce.multiplyScalar(0.9);
                return;
            }

            let bestDir = null;

            // 15方向のランダムに調べる
            for(let i=0; i < 15; i++) {
                _tmp.set(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ).normalize();

                if (_tmp.dot(_forward) < 0) continue;

                raycaster.set(this.position, _tmp);
                const hits = raycaster.intersectObjects(obstacles, true);

                // 障害物に当たらないか、当たっても距離がある場合、その方向に進む
                if(hits.length === 0 || hits[0].distance > this.perceptionRadius) {
                    bestDir = _tmp.clone();
                    break;
                }
            }

            if (bestDir) {
                _avoidance.copy(bestDir).multiplyScalar(this.maxSpeed).sub(this.velocity);
                _avoidance.normalize().multiplyScalar(this.maxForce * 5.0);
            } else {
                const hitNormal = intersects[0].face.normal;
                _avoidance.copy(hitNormal).multiplyScalar(this.maxForce * 5.0);
            }

            this.currentForce.lerp(_avoidance, 0.25);
        }

        // 回避中は群れの動きを弱める
        if(this.currentForce.lengthSq() > 0.0001){
            this.acceleration.multiplyScalar(0.1);
            this.acceleration.add(this.currentForce);
        }
    }

    // 魚の範囲を制限
    wrapEdges() {
        if (this.position.x > this.sceneWidth / 2) this.position.x = -this.sceneWidth / 2;
        if (this.position.x < -this.sceneWidth / 2) this.position.x = this.sceneWidth / 2;
        if (this.position.z > this.sceneDepth / 2) this.position.z = -this.sceneDepth / 2;
        if (this.position.z < -this.sceneDepth / 2) this.position.z = this.sceneDepth / 2;

        if (this.position.y > this.sceneHeight / 2) {
            this.position.y = this.sceneHeight / 2;
            this.velocity.y *= -0.5;
        }
        if (this.position.y < this.minHeight) {
            this.position.y = this.minHeight;
            this.velocity.y *= -0.5;
        }
    }
}