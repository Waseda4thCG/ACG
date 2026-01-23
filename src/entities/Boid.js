
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
const _separation = new THREE.Vector3();
const _alignment = new THREE.Vector3();
const _cohesion = new THREE.Vector3();
const _bestDir = new THREE.Vector3();

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

        let sepX = 0, sepY = 0, sepZ = 0;
        let aliX = 0, aliY = 0, aliZ = 0;
        let cohX = 0, cohY = 0, cohZ = 0;

        // 衝突判定用
        const collisionDistance = this.collisionRadius * 2.0;
        const collisionDistanceSq = collisionDistance * collisionDistance;
        const perceptionSq = this.perceptionRadius * this.perceptionRadius;

        // 値のキャッシュ
        const px = this.position.x;
        const py = this.position.y;
        const pz = this.position.z;

        for (const other of boids) {
            if (other === this) continue;

            const op = other.position;
            const dx = px - op.x;
            const dy = py - op.y;
            const dz = pz - op.z;

            // distanceToSquaredのインライン展開
            const dSq = dx * dx + dy * dy + dz * dz;

            if (dSq < perceptionSq && dSq > 0) {
                // Separation
                if (dSq < collisionDistanceSq) {
                    const weight = this.avoidanceWeight / (dSq + eps);
                    sepX += dx * weight;
                    sepY += dy * weight;
                    sepZ += dz * weight;
                }

                // Alignment
                const ov = other.velocity;
                aliX += ov.x;
                aliY += ov.y;
                aliZ += ov.z;

                // Cohesion
                cohX += op.x;
                cohY += op.y;
                cohZ += op.z;

                total++;
            }
        }

        if (total > 0) {
            const invTotal = 1.0 / total;

            // Separation：近づいたら逆向きに力を加える
            if (sepX !== 0 || sepY !== 0 || sepZ !== 0) {
                _separation.set(sepX, sepY, sepZ).multiplyScalar(invTotal).setLength(this.maxSpeed).sub(this.velocity);
            } else {
                _separation.set(0, 0, 0);
            }

            // Alignment：周りの魚の平均速度に近づく
            _alignment.set(aliX, aliY, aliZ).multiplyScalar(invTotal).setLength(this.cruiseSpeed).sub(this.velocity);

            // Cohesion：周りの魚の平均位置に近づく
            _cohesion.set(cohX, cohY, cohZ).multiplyScalar(invTotal).sub(this.position).setLength(this.cruiseSpeed).sub(this.velocity);
        } else {
            _separation.set(0, 0, 0);
            _alignment.set(0, 0, 0);
            _cohesion.set(0, 0, 0);
        }

        _separation.multiplyScalar(this.separationWeight).clampLength(0, this.maxForce);
        _alignment.multiplyScalar(this.alignmentWeight).clampLength(0, this.maxForce);
        _cohesion.multiplyScalar(this.cohesionWeight).clampLength(0, this.maxForce);

        this.acceleration.add(_separation);
        this.acceleration.add(_alignment);
        this.acceleration.add(_cohesion);

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

            let found = false;

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
                    _bestDir.copy(_tmp);
                    found = true;
                    break;
                }
            }

            if (found) {
                _avoidance.copy(_bestDir).multiplyScalar(this.maxSpeed).sub(this.velocity);
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