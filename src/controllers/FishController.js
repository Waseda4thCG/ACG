import * as THREE from 'three';
import { Boid } from '../entities/Boid.js';

import fishVertexShader from '../shaders/underwater/fish.vert';
import fishFragmentShader from '../shaders/underwater/fish.frag';

export class FishController {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.raycaster = new THREE.Raycaster();
        this.count = config.fish?.count ?? 500;
        this.boids = [];
        this.mesh = null;
        this.dummy = new THREE.Object3D();
        this.scales = new Float32Array(this.count);
        this.obstacles = [];

        this.init();
    }

    setObstacles(obstacles) {
        this.obstacles = obstacles;
    }

    init() {
        const { bounds, fish, boid } = this.config;
        const boundSize = {
            w: bounds?.width ?? 400,
            h: bounds?.height ?? 50,
            d: bounds?.depth ?? 180
        };
        const speeds = new Float32Array(this.count);
        const offsets = new Float32Array(this.count);

        for (let i = 0; i < this.count; i++) {
            this.boids.push(new Boid(boundSize.w, boundSize.h, boundSize.d, i, boid));
        }

        const meshRadius = fish?.meshRadius ?? 0.3;
        const meshLength = fish?.meshLength ?? 1.2;
        const fishGeometry = new THREE.ConeGeometry(meshRadius, meshLength, 8);
        fishGeometry.rotateX(Math.PI / 2);

        const fishMaterial = new THREE.ShaderMaterial({
            vertexShader: fishVertexShader,
            fragmentShader: fishFragmentShader,
            uniforms: {
                ...THREE.UniformsLib.fog,
                uTime: { value: 0.0 } },
            side: THREE.DoubleSide,
            fog: true
        });

        // 魚の初期位置
        for (let i = 0; i < this.count; i++) {
            // 魚のクネクネの設定
            speeds[i] = 0.5 + Math.random() * 0.5;
            offsets[i] = Math.random() * Math.PI * 2;
            this.scales[i] = 1.0 + Math.random() * 1.2;

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

    update(time) {
        if(!this.mesh) {
            return;
        }

        this.mesh.material.uniforms.uTime.value = time;

        for (let i = 0; i < this.count; i++) {
            const boid = this.boids[i];

            // 群れの動きを計算し更新
            boid.flock(this.boids);
            boid.avoidObstacles(this.raycaster, this.obstacles);
            boid.update();

            // Shaderに魚の位置を渡す
            this.dummy.position.copy(boid.position);
            const velocity = boid.velocity;
            if (velocity.lengthSq() > 0.0001) {
                this.dummy.lookAt(this.dummy.position.clone().add(velocity));
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
    }
}