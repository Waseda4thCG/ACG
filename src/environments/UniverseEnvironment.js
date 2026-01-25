import * as THREE from 'three';
import { BaseEnvironment } from './BaseEnvironment.js';

import vertexShader from '../shaders/universe/universe.vert';
import windowFragmentShader from '../shaders/universe/window.frag';
import wallFragmentShader from '../shaders/universe/wall.frag';
import roofFragmentShader from '../shaders/universe/roof.frag';
import backgroundVertexShader from '../shaders/universe/background.vert';
import backgroundFragmentShader from '../shaders/universe/background.frag';

export class UniverseEnvironment extends BaseEnvironment {

    constructor(scene, renderer, camera, config) {
        super(scene, renderer, camera, config);
        this.backgroundMesh = null;
        this.wallMaterial = null;
        this.windowMaterial = null;
        this.roofMaterial = null;
        this.backgroundMaterial = null;
        this.starTexture = null;
        this.nebulaTexture = null;
    }

    // Generate a CubeMap texture with pre-computed star positions
    generateStarCubeMap(size, density) {
        const images = [];

        // Simple seeded random for reproducibility
        const seededRandom = (seed) => {
            const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
            return x - Math.floor(x);
        };

        // Generate star data for each face
        for (let face = 0; face < 6; face++) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // black background
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, size, size);

            // Grid-based star placement in 2D texture space
            const gridSize = 8; // pixels per cell
            const cellsPerSide = Math.floor(size / gridSize);

            for (let cellY = 0; cellY < cellsPerSide; cellY++) {
                for (let cellX = 0; cellX < cellsPerSide; cellX++) {
                    // Unique seed for this cell on this face
                    const cellSeed = face * 100000 + cellY * 1000 + cellX;
                    const r = seededRandom(cellSeed);

                    // Determine if this cell has a star based on density
                    if (r > density) continue;

                    // Star position within cell (random offset)
                    const starX = cellX * gridSize + seededRandom(cellSeed + 1) * gridSize;
                    const starY = cellY * gridSize + seededRandom(cellSeed + 2) * gridSize;

                    // Star brightness
                    const brightness = 3.0 * seededRandom(cellSeed);

                    // Star size
                    const starSize = seededRandom(cellSeed);

                    // Draw the star as a gradient circle
                    const gradient = ctx.createRadialGradient(starX, starY, 0, starX, starY, starSize);
                    const alpha = Math.floor(brightness * 255);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
                    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${brightness * 0.5})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            images.push(canvas);
        }

        const cubeTexture = new THREE.CubeTexture(images);
        cubeTexture.needsUpdate = true;

        return cubeTexture;
    }

    // Generate a CubeMap texture with pre-computed nebula pattern
    generateNebulaCubeMap(size) {
        const images = [];

        // 3D hash function for continuous noise across cube faces
        const hash3 = (x, y, z) => {
            const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
            return n - Math.floor(n);
        };

        // 3D noise function - continuous across all directions
        const noise3D = (x, y, z) => {
            const ix = Math.floor(x);
            const iy = Math.floor(y);
            const iz = Math.floor(z);
            const fx = x - ix;
            const fy = y - iy;
            const fz = z - iz;

            // Smooth interpolation (smoothstep)
            const ux = fx * fx * (3.0 - 2.0 * fx);
            const uy = fy * fy * (3.0 - 2.0 * fy);
            const uz = fz * fz * (3.0 - 2.0 * fz);

            // 8 corners of the cube
            const c000 = hash3(ix, iy, iz);
            const c100 = hash3(ix + 1, iy, iz);
            const c010 = hash3(ix, iy + 1, iz);
            const c110 = hash3(ix + 1, iy + 1, iz);
            const c001 = hash3(ix, iy, iz + 1);
            const c101 = hash3(ix + 1, iy, iz + 1);
            const c011 = hash3(ix, iy + 1, iz + 1);
            const c111 = hash3(ix + 1, iy + 1, iz + 1);

            // Trilinear interpolation
            const lerp = (a, b, t) => a + (b - a) * t;
            const c00 = lerp(c000, c100, ux);
            const c10 = lerp(c010, c110, ux);
            const c01 = lerp(c001, c101, ux);
            const c11 = lerp(c011, c111, ux);
            const c0 = lerp(c00, c10, uy);
            const c1 = lerp(c01, c11, uy);

            return lerp(c0, c1, uz);
        };

        // 3D FBM (Fractal Brownian Motion)
        const fbm3D = (x, y, z, octaves = 5) => {
            let value = 0;
            let amplitude = 0.5;
            let frequency = 1.0;

            for (let i = 0; i < octaves; i++) {
                value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
                frequency *= 2.0;
                amplitude *= 0.5;
            }

            return value;
        };

        // Convert cube face UV to 3D direction
        const cubeUVToDirection = (face, u, v) => {
            // u, v are in range [-1, 1]
            let x, y, z;
            switch (face) {
                case 0: x = 1; y = -v; z = -u; break;  // +X
                case 1: x = -1; y = -v; z = u; break;  // -X
                case 2: x = u; y = 1; z = v; break;  // +Y
                case 3: x = u; y = -1; z = -v; break;  // -Y
                case 4: x = u; y = -v; z = 1; break;  // +Z
                case 5: x = -u; y = -v; z = -1; break;  // -Z
            }
            // Normalize
            const len = Math.sqrt(x * x + y * y + z * z);
            return { x: x / len, y: y / len, z: z / len };
        };

        for (let face = 0; face < 6; face++) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(size, size);
            const data = imageData.data;

            for (let py = 0; py < size; py++) {
                for (let px = 0; px < size; px++) {
                    // Convert pixel to UV in range [-1, 1]
                    const u = (px / size) * 2.0 - 1.0;
                    const v = (py / size) * 2.0 - 1.0;

                    // Get 3D direction for this pixel
                    const dir = cubeUVToDirection(face, u, v);

                    // Scale for nebula frequency
                    const scale = 2.0;
                    const dx = dir.x * scale;
                    const dy = dir.y * scale;
                    const dz = dir.z * scale;

                    // Two 3D noise layers for nebula pattern (continuous across faces!)
                    const n1 = fbm3D(dx, dy, dz, 5);
                    const n2 = fbm3D(dx * 1.5 + 10, dy * 1.5 + 10, dz * 1.5 + 10, 4);

                    // Nebula mask
                    const mask = n1 * n2;
                    const nebulaMask = Math.max(0, Math.min(1, (mask - 0.1) / 0.35));

                    const idx = (py * size + px) * 4;
                    // Store n1 in R, n2 in G, mask in B
                    data[idx] = Math.floor(n1 * 255);
                    data[idx + 1] = Math.floor(n2 * 255);
                    data[idx + 2] = Math.floor(nebulaMask * 255);
                    data[idx + 3] = 255;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            images.push(canvas);
        }

        const cubeTexture = new THREE.CubeTexture(images);
        cubeTexture.needsUpdate = true;

        return cubeTexture;
    }

    init(sharedAssets) {
        const { shader, modelScale, backgroundRadius } = this.config;

        this.scene.background = new THREE.Color(0x000510);
        this.scene.fog = null;

        this.windowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uLightDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
                uTime: { value: 0.0 }
            },
            vertexShader: vertexShader,
            fragmentShader: windowFragmentShader
        });

        this.wallMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uLightDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
                uTime: { value: 0.0 },
                uCameraPosition: { value: new THREE.Vector3() } // Optional but good for specular if relying on view dir
            },
            vertexShader: vertexShader,
            fragmentShader: wallFragmentShader
        });

        this.roofMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uLightDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
                uTime: { value: 0.0 }
            },
            vertexShader: vertexShader,
            fragmentShader: roofFragmentShader
        });

        this.starTexture = this.generateStarCubeMap(512, shader.starDensity);
        this.nebulaTexture = this.generateNebulaCubeMap(256);

        // planetarium-like shader material
        this.backgroundMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0.0 },
                uStarTexture: { value: this.starTexture },
                uNebulaTexture: { value: this.nebulaTexture },
                uNebulaColor1: { value: new THREE.Color().fromArray(shader.nebulaColor1) },
                uNebulaColor2: { value: new THREE.Color().fromArray(shader.nebulaColor2) }
            },
            vertexShader: backgroundVertexShader,
            fragmentShader: backgroundFragmentShader,
            side: THREE.BackSide
        });

        // create background sphere
        const backgroundGeometry = new THREE.SphereGeometry(backgroundRadius, 64, 64);
        this.backgroundMesh = new THREE.Mesh(backgroundGeometry, this.backgroundMaterial);
        this.scene.add(this.backgroundMesh);

        // apply material to building model
        if (sharedAssets.buildingRoot) {
            sharedAssets.buildingRoot.scale.setScalar(modelScale);

            sharedAssets.buildingRoot.traverse((child) => {
                if (child.isMesh) {
                    const name = child.userData.originalMatName || '';
                    if (name.includes('roof')) {
                        child.material = this.roofMaterial;
                    } else if (name.includes('window')) {
                        child.material = this.windowMaterial;
                    } else {
                        child.material = this.wallMaterial;
                    }
                }
            });
            this.scene.add(sharedAssets.buildingRoot);
        }

        // space light (sun-like)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(100, 100, 50);
        sunLight.name = 'universeLight';
        this.scene.add(sunLight);

        const ambientLight = new THREE.AmbientLight(0x303050, 0.5);
        ambientLight.name = 'universeAmbient';
        this.scene.add(ambientLight);
    }

    update(elapsedTime) {
        // 基底クラスで全メッシュの uTime が自動更新される
        super.update(elapsedTime);
    }

    dispose() {
        // remove background sphere
        if (this.backgroundMesh) {
            this.scene.remove(this.backgroundMesh);
            this.backgroundMesh.geometry.dispose();
            this.backgroundMesh = null;
        }

        // dispose materials
        if (this.wallMaterial) {
            this.wallMaterial.dispose();
            this.wallMaterial = null;
        }
        if (this.windowMaterial) {
            this.windowMaterial.dispose();
            this.windowMaterial = null;
        }
        if (this.roofMaterial) {
            this.roofMaterial.dispose();
            this.roofMaterial = null;
        }
        if (this.backgroundMaterial) {
            this.backgroundMaterial.dispose();
            this.backgroundMaterial = null;
        }
        if (this.starTexture) {
            this.starTexture.dispose();
            this.starTexture = null;
        }
        if (this.nebulaTexture) {
            this.nebulaTexture.dispose();
            this.nebulaTexture = null;
        }

        // remove lights
        const light = this.scene.getObjectByName('universeLight');
        if (light) this.scene.remove(light);

        const ambient = this.scene.getObjectByName('universeAmbient');
        if (ambient) this.scene.remove(ambient);
    }
}
