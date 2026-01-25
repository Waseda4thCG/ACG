import * as THREE from 'three';
import { ExplosionEffect } from '../effects/ExplosionEffect.js';
import { BaseEnvironment } from './BaseEnvironment.js';

import collapseVertexShader from '../shaders/x/collapse.vert';
import windowFragmentShader from '../shaders/building/window.frag';
import roofFragmentShader from '../shaders/building/roof.frag';
import wallFragmentShader from '../shaders/building/wall.frag';

export class XEnvironment extends BaseEnvironment {
    constructor(scene, renderer, camera, config) {
        super(scene, renderer, camera, config);
        this.materials = {};

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.collapsedMeshes = [];
        this.activeExplosions = [];
        this.sceneStartTime = -1;
        this.activeLasers = [];

        // レーザー用の共通ジオメトリ
        this.laserGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
        this.laserGeometry.rotateX(Math.PI / 2);

        // 照準（クロスヘア）とガイド
        this.crosshair = null;
        this.guideLabel = null;
        this.hasFired = false;
    }

    init(sharedAssets) {
        this.sceneStartTime = -1;
        this.hasFired = false;

        this.scene.background = new THREE.Color('#001e33');
        this.scene.fog = null;

        this._setupMaterials();
        this._createCrosshair();

        // 床の参照を保持
        this.floorMesh = sharedAssets.floorMesh;

        if (sharedAssets.buildingRoot) {
            // 既存の建物がある場合は削除
            if (this.buildingRoot) {
                this.scene.remove(this.buildingRoot);
            }

            // XEnvironment専用にディープコピーを作成（ジオメトリも複製）
            const root = sharedAssets.buildingRoot.clone();

            root.traverse((child) => {
                if (child.isMesh) {
                    // ジオメトリを複製して独立させる
                    child.geometry = child.geometry.clone();

                    const name = child.userData.originalMatName || '';

                    if (name.includes('window')) {
                        child.material = this.materials.window;
                    } else if (name.includes('roof')) {
                        child.material = this.materials.roof;
                    } else {
                        child.material = this.materials.wall;
                    }

                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.buildingRoot = root;
            root.position.set(0, 0, 0);
            root.scale.setScalar(this.config.modelScale);
            this.scene.add(root);
        }
    }

    update(elapsedTime) {
        // 基底クラスで uTime の自動更新が行われる
        super.update(elapsedTime);

        // 環境開始時刻を記録
        if (this.sceneStartTime < 0) this.sceneStartTime = elapsedTime;
        this.lastElapsedTime = elapsedTime;

        // レーザーの更新とフェードアウト（時間ベース）
        const duration = this.config.laser?.duration ?? 0.3;

        for (let i = this.activeLasers.length - 1; i >= 0; i--) {
            const laser = this.activeLasers[i];
            const age = elapsedTime - laser.userData.spawnTime;

            // 不透明度を経過時間に基づいて計算
            laser.material.opacity = Math.max(0, 1.0 - (age / duration));

            if (laser.material.opacity <= 0) {
                this.scene.remove(laser);
                if (laser.material) laser.material.dispose();
                this.activeLasers.splice(i, 1);
            }
        }

        // ガイドラベルの明滅アニメーションとフェードイン
        if (this.guideLabel) {
            const sceneAge = elapsedTime - this.sceneStartTime;
            if (sceneAge < 5.0) {
                this.guideLabel.style.opacity = '0';
            } else {
                // 5秒後から1秒かけてじんわり表示
                const fadeIn = Math.min(1.0, sceneAge - 5.0);
                const pulse = 0.85 + Math.sin(elapsedTime * 4.0) * 0.15;
                this.guideLabel.style.opacity = pulse * fadeIn;
            }
        }

        // 爆発エフェクトの更新
        for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
            const explosion = this.activeExplosions[i];
            explosion.update(elapsedTime);
            if (explosion.isDead) {
                this.activeExplosions.splice(i, 1);
            }
        }

        // 崩壊メッシュのクリーンアップ
        this.scene.traverse((child) => {
            if (child.isMesh && child.userData.isCollapsing) {
                const age = elapsedTime - child.material.uniforms.uCollapseStartTime.value;
                if (age > 5.0) {
                    this.scene.remove(child);
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            }
        });
    }

    dispose() {

        // レーザーの削除
        this.activeLasers.forEach(laser => {
            if (laser.parent) laser.parent.remove(laser);
            if (laser.material) laser.material.dispose();
        });
        this.activeLasers = [];

        if (this.laserGeometry) {
            this.laserGeometry.dispose();
        }

        this._removeCrosshair();

        // 破片メッシュ（isCollapsingフラグを持つ独立したメッシュ）をシーンから全削除
        const fragments = [];
        this.scene.traverse((child) => {
            if (child.isMesh && child.userData.isCollapsing) {
                fragments.push(child);
            }
        });
        fragments.forEach(frag => {
            if (frag.parent) frag.parent.remove(frag);
            if (frag.geometry) frag.geometry.dispose();
            if (frag.material) frag.material.dispose();
        });

        // 共通マテリアルの処分
        Object.values(this.materials).forEach(mat => {
            if (mat.dispose) mat.dispose();
        });
        this.materials = {};

        // 建物ルートの参照をクリア（EnvironmentManagerが既にシーンから削除している前提）
        this.buildingRoot = null;
    }

    onKeyDown(event) {
        if (event.code === 'KeyF') {
            this._shootRay();

            // 最初の射撃でガイドを非表示
            if (this.guideLabel) {
                this.guideLabel.style.transition = 'opacity 0.5s';
                this.guideLabel.style.opacity = '0';
                setTimeout(() => {
                    if (this.guideLabel && this.guideLabel.parentNode) {
                        this.guideLabel.parentNode.removeChild(this.guideLabel);
                        this.guideLabel = null;
                    }
                }, 500);
            }
        }
    }

    onMouseMove(event, mousePos) {
        // マネージャーから渡された正規化済み座標を使用
        this.mouse.x = mousePos.x;
        this.mouse.y = mousePos.y;

        // 照準をカーソルに追従させる（Pointer Lockされていない場合）
        if (this.crosshair && !document.pointerLockElement) {
            this.crosshair.style.left = `${mousePos.clientX}px`;
            this.crosshair.style.top = `${mousePos.clientY}px`;
            this.crosshair.style.transform = 'translate(-50%, -50%)';
        }
    }

    onPointerLockChange(isLocked) {
        // Pointer Lockが有効になったら照準を中央に戻す
        if (this.crosshair && isLocked) {
            this.crosshair.style.left = '50%';
            this.crosshair.style.top = '50%';
            this.crosshair.style.transform = 'translate(-50%, -50%)';
        }
    }

    _setupMaterials() {
        const { shader } = this.config;
        const textureScale = shader?.textureScale ?? 1.0;
        const windowSize = shader?.windowSize ?? 20.0;

        const commonUniforms = {
            uLightDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5).normalize() },
            uSpecularColor: { value: new THREE.Color('#ffffff') },
            uShininess: { value: 32.0 },
            uTime: { value: 0.0 },
            uScale: { value: textureScale },
            uCollapseStartTime: { value: -1.0 },
            uMeshCenter: { value: new THREE.Vector3() },
        };

        this.materials.window = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: true,
            side: THREE.DoubleSide,
            uniforms: {
                ...commonUniforms,
                uWindowSize: { value: windowSize },
                uWindowColor: { value: new THREE.Color('#cfecf6') },
            },
            vertexShader: collapseVertexShader,
            fragmentShader: windowFragmentShader
        });

        this.materials.roof = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: true,
            side: THREE.DoubleSide,
            uniforms: {
                ...commonUniforms,
                uRoofColor: { value: new THREE.Color('#a9a9a9') },
            },
            vertexShader: collapseVertexShader,
            fragmentShader: roofFragmentShader
        });

        this.materials.wall = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: true,
            side: THREE.DoubleSide,
            uniforms: {
                ...commonUniforms,
                uWallColor: { value: new THREE.Color('#c5c5c5') },
            },
            vertexShader: collapseVertexShader,
            fragmentShader: wallFragmentShader
        });
    }
    _shootRay() {
        if (!this.buildingRoot) return;

        const targetX = document.pointerLockElement ? 0 : this.mouse.x;
        const targetY = document.pointerLockElement ? 0 : this.mouse.y;

        this.raycaster.setFromCamera({ x: targetX, y: targetY }, this.camera);

        // レイキャスト対象に建物と床を含める
        const rayTargets = [this.buildingRoot];
        if (this.floorMesh) rayTargets.push(this.floorMesh);
        const intersects = this.raycaster.intersectObjects(rayTargets, true);

        const startPoint = this.camera.position.clone();
        const rayDir = this.raycaster.ray.direction.clone();

        let endPoint;
        let targetMesh = null;
        let hitFaceNormal = null;

        if (intersects.length > 0) {
            const hit = intersects[0];
            targetMesh = hit.object;

            if (targetMesh.userData.isCollapsing) {
                targetMesh = null;
                endPoint = startPoint.clone().add(rayDir.clone().multiplyScalar(1000));
            } else {
                endPoint = hit.point.clone();
                if (hit.face) hitFaceNormal = hit.face.normal.clone();
            }
        } else {
            endPoint = startPoint.clone().add(rayDir.clone().multiplyScalar(1000));
        }

        const direction = endPoint.clone().sub(startPoint);
        const length = direction.length();

        const laserMat = new THREE.MeshBasicMaterial({
            color: this.config.laser?.color ?? 0xff0000,
            transparent: true,
            opacity: 1.0,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const laserMesh = new THREE.Mesh(this.laserGeometry, laserMat);
        laserMesh.renderOrder = 1000;

        // 演出用の開始地点オフセット
        this.camera.updateMatrixWorld();
        const cameraRight = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const cameraDown = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1).multiplyScalar(-1);

        // オフセット量（少し右下から発射）
        const visualStartPoint = startPoint.clone()
            .add(cameraRight.multiplyScalar(0.7))
            .add(cameraDown.multiplyScalar(0.4))
            .add(rayDir.clone().multiplyScalar(0.5));

        const visualDirection = endPoint.clone().sub(visualStartPoint);
        const visualLength = visualDirection.length();

        laserMesh.position.copy(visualStartPoint).add(visualDirection.clone().multiplyScalar(0.5));
        laserMesh.lookAt(endPoint);
        laserMesh.scale.set(
            this.config.laser?.thickness ?? 0.05,
            this.config.laser?.thickness ?? 0.05,
            visualLength
        );

        this.scene.add(laserMesh);

        laserMesh.userData.spawnTime = this.lastElapsedTime || 0;
        this.activeLasers.push(laserMesh);

        if (intersects.length > 0) {
            // ヒット地点で爆発エフェクトを発生
            const hitPoint = intersects[0].point.clone();
            this.activeExplosions.push(new ExplosionEffect(this.scene, hitPoint, this.config.explosion));
        }

        if (targetMesh && hitFaceNormal && targetMesh !== this.floorMesh) {
            const hitPoint = intersects[0].point.clone();
            const localHitPoint = hitPoint.clone().applyMatrix4(targetMesh.matrixWorld.clone().invert());
            this._separateAndCollapse(targetMesh, hitFaceNormal, localHitPoint);
        }
    }

    // ヒットした面と同じ法線を持つ面を分離して崩壊
    _separateAndCollapse(mesh, normal, hitPoint) {
        const geometry = mesh.geometry;
        if (!geometry.attributes.position || !geometry.attributes.normal) return;

        const originalPos = geometry.attributes.position;
        const originalNormal = geometry.attributes.normal;
        const originalUv = geometry.attributes.uv;

        const keepIndices = [];
        const separateIndices = [];

        const index = geometry.index;
        const vertexCount = index ? index.count : originalPos.count;

        for (let i = 0; i < vertexCount; i += 3) {
            const i1 = index ? index.getX(i) : i;
            const i2 = index ? index.getX(i+1) : i+1;
            const i3 = index ? index.getX(i+2) : i+2;

            const nx = originalNormal.getX(i1);
            const ny = originalNormal.getY(i1);
            const nz = originalNormal.getZ(i1);
            const faceNormal = new THREE.Vector3(nx, ny, nz);

            // ヒットした面とほぼ同じ向きの面を対象にする
            if (faceNormal.dot(normal) > 0.95) {
                // 面の重心を計算して、ヒット位置に近いかチェック
                const v1 = new THREE.Vector3(originalPos.getX(i1), originalPos.getY(i1), originalPos.getZ(i1));
                const v2 = new THREE.Vector3(originalPos.getX(i2), originalPos.getY(i2), originalPos.getZ(i2));
                const v3 = new THREE.Vector3(originalPos.getX(i3), originalPos.getY(i3), originalPos.getZ(i3));
                const faceCenter = v1.clone().add(v2).add(v3).divideScalar(3);

                // 同じ壁面を抽出
                const toCenter = faceCenter.clone().sub(hitPoint);
                const perpDist = toCenter.sub(faceNormal.clone().multiplyScalar(toCenter.dot(faceNormal))).length();

                // 一定距離以内の面を分離して非インデックス化した状態でpush
                const strength = this.config.laser?.strength;
                if (perpDist < strength) {
                    separateIndices.push(i1, i2, i3);
                } else {
                    keepIndices.push(i1, i2, i3);
                }
            } else {
                keepIndices.push(i1, i2, i3);
            }
        }

        if (separateIndices.length === 0) return;

        // 分離したメッシュの作成
        const sepGeom = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const uvs = [];
        const staticPos = [];
        const staticNormals = [];
        const centerLocals = [];
        const randoms = [];

        const matrix = mesh.matrixWorld;
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);

        for (let i = 0; i < separateIndices.length; i += 3) {
            const idx1 = separateIndices[i];
            const idx2 = separateIndices[i + 1];
            const idx3 = separateIndices[i + 2];

            // 頂点情報
            const v1 = new THREE.Vector3(originalPos.getX(idx1), originalPos.getY(idx1), originalPos.getZ(idx1));
            const v2 = new THREE.Vector3(originalPos.getX(idx2), originalPos.getY(idx2), originalPos.getZ(idx2));
            const v3 = new THREE.Vector3(originalPos.getX(idx3), originalPos.getY(idx3), originalPos.getZ(idx3));

            const n1 = new THREE.Vector3(originalNormal.getX(idx1), originalNormal.getY(idx1), originalNormal.getZ(idx1));
            const n2 = new THREE.Vector3(originalNormal.getX(idx2), originalNormal.getY(idx2), originalNormal.getZ(idx2));
            const n3 = new THREE.Vector3(originalNormal.getX(idx3), originalNormal.getY(idx3), originalNormal.getZ(idx3));

            // ポリゴン重心
            const centroid = v1.clone().add(v2).add(v3).divideScalar(3);

            // ランダムベクトル
            const rnd = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 1.0,
                Math.random() - 0.5
            ).multiplyScalar(2.0);

            // 各頂点にデータを追加
            [0, 1, 2].forEach((idx) => {
                const v = [v1, v2, v3][idx];
                const n = [n1, n2, n3][idx];
                const origIdx = [idx1, idx2, idx3][idx];

                positions.push(v.x, v.y, v.z);
                normals.push(n.x, n.y, n.z);

                if (originalUv) {
                    uvs.push(originalUv.getX(origIdx), originalUv.getY(origIdx));
                }

                // テクスチャ固定化用
                const wv = v.clone().applyMatrix4(matrix);
                staticPos.push(wv.x, wv.y, wv.z);
                const wn = n.clone().applyMatrix3(normalMatrix).normalize();
                staticNormals.push(wn.x, wn.y, wn.z);

                // Shaderアニメーション用
                centerLocals.push(centroid.x, centroid.y, centroid.z);
                randoms.push(rnd.x, rnd.y, rnd.z);
            });
        }

        sepGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        sepGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        if (originalUv) sepGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        sepGeom.setAttribute('aStaticPos', new THREE.Float32BufferAttribute(staticPos, 3));
        sepGeom.setAttribute('aStaticNormal', new THREE.Float32BufferAttribute(staticNormals, 3));
        sepGeom.setAttribute('aCenterLocal', new THREE.Float32BufferAttribute(centerLocals, 3));
        sepGeom.setAttribute('aRandom', new THREE.Float32BufferAttribute(randoms, 3));

        const sepMesh = new THREE.Mesh(sepGeom, mesh.material.clone());
        sepMesh.material.uniforms.uCollapseStartTime.value = this.lastElapsedTime || 0;
        sepMesh.userData.isCollapsing = true;

        // メッシュ自体は動かさない（Shaderで動かす）
        sepMesh.applyMatrix4(mesh.matrixWorld);

        this.scene.add(sepMesh);

        if (keepIndices.length === 0) {
            if (mesh.parent) mesh.parent.remove(mesh);
        } else {
            const newPos = [];
            const newNorm = [];
            const newUv = [];

            keepIndices.forEach(idx => {
                newPos.push(originalPos.getX(idx), originalPos.getY(idx), originalPos.getZ(idx));
                newNorm.push(originalNormal.getX(idx), originalNormal.getY(idx), originalNormal.getZ(idx));
                if (originalUv) newUv.push(originalUv.getX(idx), originalUv.getY(idx));
            });

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNorm, 3));
            if (originalUv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUv, 2));
            if (index) geometry.setIndex(null);

            geometry.computeBoundingSphere();
            geometry.computeBoundingBox();
        }
    }

    _createCrosshair() {
        if (this.crosshair) return;

        const crossConfig = this.config.crosshair || {
            color: 'rgba(255, 0, 0, 0.5)',
            glowColor: 'rgba(255, 0, 0, 0.8)',
            size: 30,
            dotSize: 4
        };

        this.crosshair = document.createElement('div');
        this.crosshair.id = 'laser-crosshair';
        this.crosshair.style.position = 'fixed';

        // 初期位置の設定
        if (document.pointerLockElement) {
            this.crosshair.style.top = '50%';
            this.crosshair.style.left = '50%';
            this.crosshair.style.transform = 'translate(-50%, -50%)';
        } else {
            this.crosshair.style.top = '50%';
            this.crosshair.style.left = '50%';
            this.crosshair.style.transform = 'translate(-50%, -50%)';
        }

        this.crosshair.style.width = `${crossConfig.size}px`;
        this.crosshair.style.height = `${crossConfig.size}px`;
        this.crosshair.style.border = `2px solid ${crossConfig.color}`;
        this.crosshair.style.borderRadius = '50%';
        this.crosshair.style.pointerEvents = 'none';
        this.crosshair.style.zIndex = '2000';
        this.crosshair.style.boxShadow = `0 0 10px ${crossConfig.glowColor}, inset 0 0 5px ${crossConfig.color}`;

        // 中心点
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.top = '50%';
        dot.style.left = '50%';
        dot.style.transform = 'translate(-50%, -50%)';
        dot.style.width = `${crossConfig.dotSize}px`;
        dot.style.height = `${crossConfig.dotSize}px`;
        dot.style.backgroundColor = crossConfig.glowColor;
        dot.style.borderRadius = '50%';
        dot.style.boxShadow = `0 0 5px ${crossConfig.glowColor}`;

        this.crosshair.appendChild(dot);
        document.body.appendChild(this.crosshair);

        this.guideLabel = document.createElement('div');
        this.guideLabel.id = 'laser-guide';
        this.guideLabel.innerText = "Press 'F'";
        this.guideLabel.style.position = 'fixed';
        this.guideLabel.style.top = '60%';
        this.guideLabel.style.left = '50%';
        this.guideLabel.style.transform = 'translate(-50%, -50%)';
        this.guideLabel.style.color = crossConfig.color;
        this.guideLabel.style.fontFamily = "'Inter', sans-serif";
        this.guideLabel.style.fontSize = '40px';
        this.guideLabel.style.fontWeight = '900';
        this.guideLabel.style.letterSpacing = '4px';
        this.guideLabel.style.pointerEvents = 'none';
        this.guideLabel.style.zIndex = '2000';
        this.guideLabel.style.opacity = '0';
        this.guideLabel.style.textShadow = `0 0 15px ${crossConfig.glowColor}, 0 0 30px ${crossConfig.glowColor}, 0 0 45px ${crossConfig.glowColor}`;

        document.body.appendChild(this.guideLabel);
    }

    _removeCrosshair() {
        if (this.crosshair && this.crosshair.parentNode) {
            this.crosshair.parentNode.removeChild(this.crosshair);
            this.crosshair = null;
        }
        if (this.guideLabel && this.guideLabel.parentNode) {
            this.guideLabel.parentNode.removeChild(this.guideLabel);
            this.guideLabel = null;
        }
    }
}