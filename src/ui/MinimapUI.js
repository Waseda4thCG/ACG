import * as THREE from 'three';

/**
 * 右上に表示されるミニマップ
 */
export class MinimapUI {
  constructor(scene, camera) {
    this.mainScene = scene;
    this.mainCamera = camera;

    // ミニマップのサイズ
    this.width = 200;
    this.height = 200;

    // ミニマップ専用のシーン
    this.minimapScene = new THREE.Scene();

    // ミニマップ用のレンダラー
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x1a1a2e, 1);

    // ミニマップ用のカメラ（垂直上から見下ろす）
    const viewSize = 308; // 400を1.3倍ズーム（視野を狭める）
    this.camera = new THREE.OrthographicCamera(
      -viewSize / 2, viewSize / 2,
      viewSize / 2, -viewSize / 2,
      0.1, 1000
    );
    this.camera.position.set(0, 200, 0);
    this.camera.lookAt(0, 0, 0);

    // プレイヤー位置マーカー
    this.createPlayerMarker();

    // DOM要素を作成
    this.createUI();

    // メインシーンのオブジェクトを参照するためのマップ
    this.sceneObjectsMap = new Map();
  }

  createPlayerMarker() {
    // プレイヤーを示す矢印マーカー（ミニマップシーンのみ）
    // viewSize=308に合わせてサイズ調整
    const shape = new THREE.Shape();
    shape.moveTo(0, 12);      // 上の尖った部分
    shape.lineTo(-8, -6);     // 左下
    shape.lineTo(0, -1.5);    // 中央下
    shape.lineTo(8, -6);      // 右下
    shape.lineTo(0, 12);      // 上に戻る

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    });

    this.playerMarker = new THREE.Mesh(geometry, material);
    this.playerMarker.rotation.x = -Math.PI / 2;
    this.playerMarker.position.y = 50; // ミニマップ上で見える高さ
    // 矢印は常に上向き（カメラの回転で向きが変わる）
    this.playerMarker.rotation.z = 0;
    this.minimapScene.add(this.playerMarker);

    // プレイヤー位置を示す円（下に影のように）
    const circleGeometry = new THREE.CircleGeometry(9, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      opacity: 0.3,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.playerCircle = new THREE.Mesh(circleGeometry, circleMaterial);
    this.playerCircle.rotation.x = -Math.PI / 2;
    this.playerCircle.position.y = 0.1;
    this.minimapScene.add(this.playerCircle);
  }

  createUI() {
    // コンテナ作成
    this.container = document.createElement('div');
    this.container.id = 'minimap-ui';
    this.container.appendChild(this.renderer.domElement);

    // スタイル追加
    this.injectStyles();

    document.body.appendChild(this.container);
  }

  injectStyles() {
    if (document.getElementById('minimap-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'minimap-ui-styles';
    style.textContent = `
      #minimap-ui {
        position: fixed;
        top: 24px;
        right: 24px;
        width: 200px;
        height: 200px;
        background: rgba(15, 15, 25, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        z-index: 1000;
        overflow: hidden;
      }

      #minimap-ui canvas {
        width: 100%;
        height: 100%;
        border-radius: 8px;
      }

      #minimap-ui::before {
        content: 'MAP';
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: rgba(255, 255, 255, 0.5);
        z-index: 1;
      }
    `;
    document.head.appendChild(style);
  }

  syncSceneObjects() {
    // メインシーンのオブジェクトをミニマップシーンに同期
    this.mainScene.traverse((obj) => {
      // ミニマップから除外するオブジェクトはスキップ（背景Sphereなど）
      if (obj.userData && obj.userData.excludeFromMinimap) {
        return;
      }

      if (obj.isMesh && !this.sceneObjectsMap.has(obj.uuid)) {
        // ワールド行列を更新
        obj.updateMatrixWorld(true);

        // 簡易的なクローン（ジオメトリを共有）
        const minimapObj = new THREE.Mesh(
          obj.geometry,
          new THREE.MeshBasicMaterial({
            color: obj.material.color || 0x666666,
            side: THREE.DoubleSide
          })
        );

        // ワールド行列をコピー（入れ子でも正しい位置になる）
        minimapObj.matrixAutoUpdate = false;
        minimapObj.matrix.copy(obj.matrixWorld);

        this.minimapScene.add(minimapObj);
        this.sceneObjectsMap.set(obj.uuid, minimapObj);
      }
    });
  }

  update() {
    // 毎フレームの同期チェックは重いので廃止（必要な時のみ外部から呼ぶ）
    // this.syncSceneObjects();

    // プレイヤーマーカーと円をメインカメラの位置に同期
    this.playerMarker.position.x = this.mainCamera.position.x;
    this.playerMarker.position.z = this.mainCamera.position.z;
    this.playerCircle.position.x = this.mainCamera.position.x;
    this.playerCircle.position.z = this.mainCamera.position.z;

    // カメラの向きを取得してプレイヤーマーカーを回転
    const direction = new THREE.Vector3();
    this.mainCamera.getWorldDirection(direction);

    // XZ平面での角度を計算（Y軸周りの回転）
    // atan2(x, z)で北（-Z方向）を0度とした角度
    const angle = Math.atan2(direction.x, direction.z);

    // プレイヤーマーカーを回転（Z軸周りに回転）
    // 180度反転させて正しい向きに
    this.playerMarker.rotation.z = angle + Math.PI;

    // ミニマップカメラをプレイヤーの位置に追従（回転はしない）
    this.camera.position.x = this.mainCamera.position.x;
    this.camera.position.z = this.mainCamera.position.z;
    this.camera.updateProjectionMatrix();

    // ミニマップをレンダリング
    this.renderer.render(this.minimapScene, this.camera);
  }

  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    if (this.playerMarker) {
      this.minimapScene.remove(this.playerMarker);
      this.playerMarker.geometry.dispose();
      this.playerMarker.material.dispose();
    }

    if (this.playerCircle) {
      this.minimapScene.remove(this.playerCircle);
      this.playerCircle.geometry.dispose();
      this.playerCircle.material.dispose();
    }

    // ミニマップシーンのクリーンアップ
    this.sceneObjectsMap.forEach((obj) => {
      obj.geometry.dispose();
      obj.material.dispose();
      this.minimapScene.remove(obj);
    });
    this.sceneObjectsMap.clear();

    this.renderer.dispose();
  }
}
