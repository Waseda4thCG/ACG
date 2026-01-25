import * as THREE from 'three';
import explosionVertexShader from '../shaders/effects/explosion.vert';
import explosionFragmentShader from '../shaders/effects/explosion.frag';

export class ExplosionEffect {
    constructor(scene, position, config = {}) {
        this.scene = scene;
        this.position = position.clone();
        this.config = config;

        this.startTime = -1;
        this.duration = this.config.duration;
        this.isDead = false;

        this.particleCount = this.config.count;
        this.mesh = this._createMesh();
        this.scene.add(this.mesh);
    }

    _createMesh() {
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(this.particleCount * 3);
        const randoms = new Float32Array(this.particleCount * 3);
        const seeds = new Float32Array(this.particleCount);

        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3 + 0] = this.position.x;
            positions[i * 3 + 1] = this.position.y;
            positions[i * 3 + 2] = this.position.z;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const speedScale = 0.5 + Math.random() * 1.5;

            randoms[i * 3 + 0] = Math.sin(phi) * Math.cos(theta) * speedScale;
            randoms[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speedScale;
            randoms[i * 3 + 2] = Math.cos(phi) * speedScale;

            seeds[i] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));
        geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uStartTime: { value: 0 },
                uColor: { value: new THREE.Color(this.config.color) },
                uResolution: { value: this.config.resolution },
                uGravity: { value: this.config.gravity },
                uSpeed: { value: this.config.speed },
                uBaseSize: { value: this.config.size },
                uDuration: { value: this.config.duration }
            },
            vertexShader: explosionVertexShader,
            fragmentShader: explosionFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        return new THREE.Points(geometry, material);
    }

    update(elapsedTime) {
        if (this.startTime < 0) this.startTime = elapsedTime;

        const age = elapsedTime - this.startTime;
        if (age > this.duration) {
            this.dispose();
            return;
        }

        this.mesh.material.uniforms.uTime.value = elapsedTime;
        this.mesh.material.uniforms.uStartTime.value = this.startTime;
    }

    dispose() {
        this.isDead = true;
        this.scene.remove(this.mesh);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
    }
}
