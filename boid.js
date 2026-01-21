import * as THREE from 'three';

export class Boid {
    constructor(sceneWidth, sceneHeight, sceneDepth, index) { // ★ indexを追加
    this.width = sceneWidth;
    this.height = sceneHeight;
    this.depth = sceneDepth;
    this.minHeight = 2.0;

    // --- (追加) クラスタリング配置ロジック ---
    // 50匹ごとに群れの中心を変えて配置する
    const clusterIndex = Math.floor(index / 10);
    const clusterX = (Math.sin(clusterIndex * 12.9898) * 0.5) * (this.width - 10);
    const clusterZ = (Math.cos(clusterIndex * 78.233) * 0.5) * (this.depth - 10);
    const clusterY = this.minHeight + Math.abs(Math.sin(clusterIndex)) * (this.height / 2);

    this.position = new THREE.Vector3(
        clusterX + (Math.random() - 0.5) * 10.0,
        clusterY + (Math.random() - 0.5) * 5.0,
        clusterZ + (Math.random() - 0.5) * 10.0
    );

    this.velocity = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5)
    ).normalize().multiplyScalar(0.1);

    this.acceleration = new THREE.Vector3();

    this.wrapEdges();

    // --- (変更) パラメータ調整 ---
    this.maxSpeed = 0.15;  // 速くする (0.03 -> 0.15)
    this.maxForce = 0.003; // 急旋回させない (0.001 -> 0.003 ※バランス調整)
    this.perceptionRadius = 10.0; // 視界を広げる (5.0 -> 10.0)
    this.avoidanceRadius = 4.0;
    }

    update() {
        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.acceleration.multiplyScalar(0);
        this.wrapEdges();
    }

    flock(boids) {
        let separation = new THREE.Vector3();
        let alignment = new THREE.Vector3();
        let cohesion = new THREE.Vector3();
        let total = 0;

        for (const other of boids) {
            const d = this.position.distanceTo(other.position);
            // 自分自身は除外、かつ視界範囲内
            if (other !== this && d < this.perceptionRadius && d > 0) {
                // Separation: 近すぎる仲間から離れる (距離の二乗に反比例させて強く反発)
                let diff = new THREE.Vector3().subVectors(this.position, other.position);
                diff.divideScalar(d * d);
                separation.add(diff);

                alignment.add(other.velocity);
                cohesion.add(other.position);
                total++;
            }
        }

        if (total > 0) {
            // Separation
            separation.divideScalar(total);
            if (separation.lengthSq() > 0) {
                 separation.setLength(this.maxSpeed).sub(this.velocity).clampLength(0, this.maxForce);
            }

            // Alignment
            alignment.divideScalar(total).setLength(this.maxSpeed).sub(this.velocity).clampLength(0, this.maxForce);

            // Cohesion
            cohesion.divideScalar(total).sub(this.position).setLength(this.maxSpeed).sub(this.velocity).clampLength(0, this.maxForce);
        }

        // 重み付け
        separation.multiplyScalar(1.5); // ぶつからないのを優先
        alignment.multiplyScalar(1.0);
        cohesion.multiplyScalar(2.0);

        this.acceleration.add(separation);
        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);
    }

    avoidObstacles(raycaster, obstacles) {
        if (obstacles.length === 0 || this.velocity.lengthSq() === 0) return;

        // 少し先を見る
        const lookAhead = this.position.clone().add(this.velocity.clone().setLength(this.avoidanceRadius));
        const direction = this.velocity.clone().normalize();

        // 現在位置からと、少し先からの2点でチェックすると精度が上がるが、重くなるので一旦現在位置から
        raycaster.set(this.position, direction);
        // nearプロパティを設定して、遠すぎる壁は無視する
        raycaster.near = 0;
        raycaster.far = this.avoidanceRadius;

        const intersects = raycaster.intersectObjects(obstacles, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
             // 壁の法線方向に反発する力を加える
            const normal = hit.face.normal;
            // 壁に近いほど強く避ける
            const weight = 1.0 - (hit.distance / this.avoidanceRadius);
            const steer = normal.clone().multiplyScalar(this.maxForce * weight * 10.0);
            this.acceleration.add(steer);
        }
    }

    wrapEdges() {
        // X, Z はループさせる
        if (this.position.x > this.width / 2) this.position.x = -this.width / 2;
        if (this.position.x < -this.width / 2) this.position.x = this.width / 2;
        if (this.position.z > this.depth / 2) this.position.z = -this.depth / 2;
        if (this.position.z < -this.depth / 2) this.position.z = this.depth / 2;

        // ★修正: Y方向はループさせず、上下限でバウンドさせる（または制限する）
        // ここでは単純に範囲外に出ないように制限する
        if (this.position.y > this.height / 2) {
            this.position.y = this.height / 2;
            this.velocity.y *= -0.5; // 天井に当たったら少し跳ね返る
        }
        // 下限（minHeight）より下に行かないようにする
        if (this.position.y < this.minHeight) {
            this.position.y = this.minHeight;
            this.velocity.y *= -0.5; // 床に当たったら少し跳ね返る
        }
    }
}