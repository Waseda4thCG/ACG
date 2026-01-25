import * as THREE from 'three';

/**
 * シンプルなキーボード＋マウスコントロール（FPS風）
 */
export class KeyboardControls {
  constructor(camera, domElement, config) {
    this.camera = camera;
    this.domElement = domElement;
    this.config = config;

    // 移動速度（configから取得）
    this.moveSpeed = config.moveSpeed ?? 0.5;
    this.lookSpeed = config.lookSpeed ?? 0.002;

    // カメラ回転角度（オイラー角）
    this.pitch = config.pitch; // 上下回転
    this.yaw = config.yaw;   // 左右回転

    // 床固定モード
    this.grounded = false;
    this.eyeHeight = config.eyeHeight ?? 1.7;
    this.floorLevel = 0;
    this.footHeight = config.footHeight ?? 0.2;

    // 衝突検出
    this.collisionObjects = [];
    this.raycaster = new THREE.Raycaster();
    this.collisionDistance = config.collisionDistance ?? 2.0;
    this.playerRadius = config.playerRadius ?? 1.0;

    // キー入力状態
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false
    };

    // マウス状態
    this.isPointerLocked = false;

    // マウス操作モード
    this.mouseOnlyMode = false;

    // OrbitControls互換の設定
    this.target = new THREE.Vector3(0, 10, 0);
    this.minDistance = config.minDistance ?? 0.05;
    this.maxDistance = config.maxDistance ?? 500;
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;
    this.minAzimuthAngle = -Infinity;
    this.maxAzimuthAngle = Infinity;
    this.enableDamping = true;
    this.dampingFactor = config.dampingFactor ?? 0.05;
    this.rotateSpeed = config.rotateSpeed ?? 1.0;
    this.panSpeed = config.panSpeed ?? 1.0;
    this.zoomSpeed = config.zoomSpeed ?? 1.0;
    this.screenSpacePanning = true;
    this.minPanDistance = config.minPanDistance ?? 10.0;
    this.minY = config.minY ?? 0.5;

    // 内部状態（OrbitControlsと同じ）
    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();
    this.panOffset = new THREE.Vector3();
    this.scale = 1.0;
    this.zoomChanged = false;

    // マウス状態
    this.STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2 };
    this.state = this.STATE.NONE;
    this.pointerPositions = {};
    this.pointers = [];

    // モード変更時のコールバック
    this.onModeChange = null;
    this.onControlModeChange = null; // 操作モード変更時のコールバック

    // イベントリスナーをバインド
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
    this._onWheel = this._onWheel.bind(this);

    this._attachEventListeners();
  }

  _attachEventListeners() {
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    this.domElement.addEventListener('click', this._onClick);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('contextmenu', this._onContextMenu);
    document.addEventListener('wheel', this._onWheel, { passive: false });
  }

  _onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.up = true;
        event.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.down = true;
        break;
      case 'KeyG':
        // モード切り替え
        this.grounded = !this.grounded;
        if (this.grounded) {
          // 床固定モードに切り替え時、視点の高さを設定
          this.camera.position.y = this.floorLevel + this.eyeHeight;
        }
        // コールバック実行
        if (this.onModeChange) {
          this.onModeChange(this.grounded);
        }
        break;
    }
  }

  _onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.up = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.down = false;
        break;
    }
  }

  _onClick() {
    // マウスだけモードではポインターロックを使わない
    if (this.mouseOnlyMode) return;

    // クリックでポインターロックのトグル
    if (this.isPointerLocked) {
      document.exitPointerLock();
    } else {
      this.domElement.requestPointerLock();
    }
  }

  _onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
  }

  _onMouseDown(event) {
    if (!this.mouseOnlyMode) return;

    this.pointers.push(event);

    if (event.button === 0) { // LEFT = PAN
      this.state = this.STATE.PAN;
    } else if (event.button === 1) { // MIDDLE = DOLLY
      this.state = this.STATE.DOLLY;
    } else if (event.button === 2) { // RIGHT = ROTATE
      this.state = this.STATE.ROTATE;
      event.preventDefault();
    }

    this.pointerPositions[event.pointerId] = { x: event.clientX, y: event.clientY };
  }

  _onMouseUp(event) {
    if (!this.mouseOnlyMode) return;

    this.pointers = this.pointers.filter(p => p.pointerId !== event.pointerId);
    delete this.pointerPositions[event.pointerId];

    if (this.pointers.length === 0) {
      this.state = this.STATE.NONE;
    }
  }

  _onContextMenu(event) {
    if (this.mouseOnlyMode) {
      event.preventDefault(); // 右クリックメニューを無効化
    }
  }

  _onWheel(event) {
    if (!this.mouseOnlyMode) return;
    if (this.state !== this.STATE.NONE && this.state !== this.STATE.ROTATE) return;

    // UI要素上のスクロールはカメラ操作に反映させない（サイドバーのスクロールを優先）
    if (event.target.closest('#unified-ui') || event.target.closest('#minimap-ui')) {
      return;
    }

    event.preventDefault();

    if (event.deltaY > 0) {
      this._dollyOut(this._getZoomScale());
    } else if (event.deltaY < 0) {
      this._dollyIn(this._getZoomScale());
    }

    this.zoomChanged = true;
  }

  _getZoomScale() {
    return Math.pow(0.95, this.zoomSpeed);
  }

  _dollyIn(dollyScale) {
    this.scale *= dollyScale;
  }

  _dollyOut(dollyScale) {
    this.scale /= dollyScale;
  }

  _rotateLeft(angle) {
    this.sphericalDelta.theta -= angle;
  }

  _rotateUp(angle) {
    this.sphericalDelta.phi -= angle;
  }

  _panLeft(distance, objectMatrix) {
    const v = new THREE.Vector3();
    v.setFromMatrixColumn(objectMatrix, 0);
    v.multiplyScalar(-distance);
    this.panOffset.add(v);
  }

  _panUp(distance, objectMatrix) {
    const v = new THREE.Vector3();

    if (this.screenSpacePanning === true) {
      v.setFromMatrixColumn(objectMatrix, 1);
    } else {
      v.setFromMatrixColumn(objectMatrix, 0);
      v.crossVectors(this.camera.up, v);
    }

    v.multiplyScalar(distance);
    this.panOffset.add(v);
  }

  _pan(deltaX, deltaY) {
    const offset = new THREE.Vector3();
    const element = this.domElement;

    if (this.camera.isPerspectiveCamera) {
      const position = this.camera.position;
      offset.copy(position).sub(this.target);
      let targetDistance = offset.length();

      // 最低パン速度を保証（configから取得）
      targetDistance = Math.max(targetDistance, this.minPanDistance);
      targetDistance *= Math.tan((this.camera.fov / 2) * Math.PI / 180.0);

      this._panLeft(2 * deltaX * targetDistance / element.clientHeight, this.camera.matrix);
      this._panUp(2 * deltaY * targetDistance / element.clientHeight, this.camera.matrix);
    } else if (this.camera.isOrthographicCamera) {
      this._panLeft(deltaX * (this.camera.right - this.camera.left) / this.camera.zoom / element.clientWidth, this.camera.matrix);
      this._panUp(deltaY * (this.camera.top - this.camera.bottom) / this.camera.zoom / element.clientHeight, this.camera.matrix);
    }
  }

  _onMouseMove(event) {
    // マウスだけモード（OrbitControls風）
    if (this.mouseOnlyMode) {
      const pointer = this.pointers.find(p => p.pointerId === event.pointerId);
      if (!pointer) return;

      // 前回の位置を取得
      const prevPosition = this.pointerPositions[event.pointerId];
      if (!prevPosition) return;

      const deltaX = event.clientX - prevPosition.x;
      const deltaY = event.clientY - prevPosition.y;

      if (this.state === this.STATE.ROTATE) {
        const element = this.domElement;
        this._rotateLeft(2 * Math.PI * deltaX / element.clientHeight * this.rotateSpeed);
        this._rotateUp(2 * Math.PI * deltaY / element.clientHeight * this.rotateSpeed);
      } else if (this.state === this.STATE.PAN) {
        this._pan(deltaX, deltaY);
      } else if (this.state === this.STATE.DOLLY) {
        // ドリー（ミドルクリック）
        const dollyDelta = deltaY;
        if (dollyDelta < 0) {
          this._dollyOut(this._getZoomScale());
        } else if (dollyDelta > 0) {
          this._dollyIn(this._getZoomScale());
        }
      }

      // 位置を更新
      this.pointerPositions[event.pointerId].x = event.clientX;
      this.pointerPositions[event.pointerId].y = event.clientY;
      return;
    }

    // ポインターロックモードの処理
    if (!this.isPointerLocked) return;

    // マウス移動で視点回転
    this.yaw -= event.movementX * this.lookSpeed;
    this.pitch -= event.movementY * this.lookSpeed;

    // ピッチ角を制限（真上・真下を見られるように）
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
  }

  setCollisionObjects(objects) {
    this.collisionObjects = objects;
  }

  _checkCollision(direction, distance = this.collisionDistance) {
    if (this.collisionObjects.length === 0) return null;

    const normalizedDir = direction.clone().normalize();
    this.raycaster.set(this.camera.position, normalizedDir);
    this.raycaster.far = distance;

    // シーンから削除された（parentがいない）オブジェクトや崩壊中のオブジェクトを除外
    const validObjects = this.collisionObjects.filter(obj => obj.parent);
    const intersects = this.raycaster.intersectObjects(validObjects, true);

    const validIntersects = intersects.filter(intersect => !intersect.object.userData.isCollapsing);

    if (validIntersects.length > 0 && validIntersects[0].distance < distance) {
      return {
        hit: true,
        distance: validIntersects[0].distance,
        normal: validIntersects[0].face ? validIntersects[0].face.normal.clone() : new THREE.Vector3(0, 1, 0),
        point: validIntersects[0].point
      };
    }

    return null;
  }

  _slideAlongWall(velocity) {
    // 衝突チェック
    const collision = this._checkCollision(velocity, velocity.length() + this.collisionDistance);

    if (!collision) {
      return velocity;
    }

    // 衝突した場合、壁の法線に沿ってスライド
    const normal = collision.normal.clone();

    // ワールド空間の法線に変換（メッシュの回転を考慮）
    const worldNormal = normal.normalize();

    // 移動ベクトルを壁に平行な成分に分解
    const dot = velocity.dot(worldNormal);
    const slide = velocity.clone().sub(worldNormal.multiplyScalar(dot));

    // スライド後も衝突しないかチェック
    if (slide.length() > 0.01) {
      const slideCollision = this._checkCollision(slide, slide.length() + 0.5);
      if (slideCollision) {
        // スライド方向でも衝突する場合は移動を完全にキャンセル
        return new THREE.Vector3(0, 0, 0);
      }
    }

    return slide;
  }

  _checkGroundCollision() {
    if (this.collisionObjects.length === 0) return null;

    // 足元の位置（視点から下にeyeHeight分下げた位置）
    const footPosition = new THREE.Vector3(
      this.camera.position.x,
      this.camera.position.y - this.eyeHeight + this.footHeight,
      this.camera.position.z
    );

    // 下方向にレイキャスト
    const downDirection = new THREE.Vector3(0, -1, 0);
    this.raycaster.set(footPosition, downDirection);
    this.raycaster.far = this.footHeight + 2.0; // 余裕を持って検出

    const validObjects = this.collisionObjects.filter(obj => obj.parent);
    const intersects = this.raycaster.intersectObjects(validObjects, true);

    // 崩壊中のオブジェクトは床としても除外
    const validIntersects = intersects.filter(intersect => !intersect.object.userData.isCollapsing);

    if (validIntersects.length > 0) {
      return {
        distance: validIntersects[0].distance,
        groundY: validIntersects[0].point.y
      };
    }

    return null;
  }

  update() {
    // マウスだけモード（OrbitControls風）
    if (this.mouseOnlyMode) {
      const offset = new THREE.Vector3();
      const quat = new THREE.Quaternion().setFromUnitVectors(this.camera.up, new THREE.Vector3(0, 1, 0));
      const quatInverse = quat.clone().invert();

      const lastPosition = new THREE.Vector3();
      const lastQuaternion = new THREE.Quaternion();

      const twoPI = 2 * Math.PI;

      const position = this.camera.position;

      offset.copy(position).sub(this.target);

      // カメラの上方向に合わせて回転
      offset.applyQuaternion(quat);

      // 現在の球面座標を取得
      this.spherical.setFromVector3(offset);

      if (this.enableDamping) {
        this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
        this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
      } else {
        this.spherical.theta += this.sphericalDelta.theta;
        this.spherical.phi += this.sphericalDelta.phi;
      }

      // 角度制限
      let min = this.minAzimuthAngle;
      let max = this.maxAzimuthAngle;

      if (isFinite(min) && isFinite(max)) {
        if (min < -Math.PI) min += twoPI; else if (min > Math.PI) min -= twoPI;
        if (max < -Math.PI) max += twoPI; else if (max > Math.PI) max -= twoPI;

        if (min <= max) {
          this.spherical.theta = Math.max(min, Math.min(max, this.spherical.theta));
        } else {
          this.spherical.theta = (this.spherical.theta > (min + max) / 2) ?
            Math.max(min, this.spherical.theta) :
            Math.min(max, this.spherical.theta);
        }
      }

      // 極角を制限
      this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
      this.spherical.makeSafe();

      // 距離を調整
      this.spherical.radius *= this.scale;
      this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

      // ターゲットをパンオフセット分移動
      if (this.enableDamping === true) {
        this.target.addScaledVector(this.panOffset, this.dampingFactor);
      } else {
        this.target.add(this.panOffset);
      }

      // ターゲットが地面より下に行かないように制限
      if (this.target.y < this.minY) {
        this.target.y = this.minY;
      }

      // 球面座標からデカルト座標に変換
      offset.setFromSpherical(this.spherical);

      // 元の方向に戻す
      offset.applyQuaternion(quatInverse);

      position.copy(this.target).add(offset);

      // カメラも地面より下に行かないように制限
      if (position.y < this.minY) {
        position.y = this.minY;
      }

      this.camera.lookAt(this.target);

      if (this.enableDamping === true) {
        this.sphericalDelta.theta *= (1 - this.dampingFactor);
        this.sphericalDelta.phi *= (1 - this.dampingFactor);
        this.panOffset.multiplyScalar(1 - this.dampingFactor);
      } else {
        this.sphericalDelta.set(0, 0, 0);
        this.panOffset.set(0, 0, 0);
      }

      this.scale = 1;

      return;
    }

    // キーボード操作モード
    // カメラの向きを更新
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    quaternion.setFromEuler(euler);
    this.camera.quaternion.copy(quaternion);

    // 移動方向ベクトル
    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    // カメラの前方・右方向を取得
    this.camera.getWorldDirection(direction);
    right.crossVectors(direction, up).normalize();

    const velocity = new THREE.Vector3();

    if (this.grounded) {
      // 床固定モード：水平方向のみ移動
      // 前方向を水平面に投影
      const horizontalDir = direction.clone();
      horizontalDir.y = 0;
      horizontalDir.normalize();

      // 前後移動（キーボード）
      if (this.keys.forward) {
        velocity.add(horizontalDir.clone().multiplyScalar(this.moveSpeed));
      }
      if (this.keys.backward) {
        velocity.add(horizontalDir.clone().multiplyScalar(-this.moveSpeed));
      }

      // 左右移動（キーボード）
      if (this.keys.left) {
        velocity.add(right.clone().multiplyScalar(-this.moveSpeed));
      }
      if (this.keys.right) {
        velocity.add(right.clone().multiplyScalar(this.moveSpeed));
      }

      // スライド挙動で衝突処理
      if (velocity.length() > 0) {
        const slidVelocity = this._slideAlongWall(velocity);
        this.camera.position.add(slidVelocity);
      }

      // 足元の床との当たり判定
      const groundCheck = this._checkGroundCollision();
      if (groundCheck) {
        // 床が検出された場合、その上に立つ
        const targetY = groundCheck.groundY + this.eyeHeight;
        this.camera.position.y = targetY;
      } else {
        // 床が検出されない場合、デフォルトの高さに戻す
        this.camera.position.y = this.floorLevel + this.eyeHeight;
      }

    } else {
      // 自由飛行モード：全方向移動可能
      // 前後移動（キーボード）
      if (this.keys.forward) {
        velocity.add(direction.clone().multiplyScalar(this.moveSpeed));
      }
      if (this.keys.backward) {
        velocity.add(direction.clone().multiplyScalar(-this.moveSpeed));
      }

      // 左右移動（キーボード）
      if (this.keys.left) {
        velocity.add(right.clone().multiplyScalar(-this.moveSpeed));
      }
      if (this.keys.right) {
        velocity.add(right.clone().multiplyScalar(this.moveSpeed));
      }

      // 上下移動
      if (this.keys.up) {
        velocity.add(up.clone().multiplyScalar(this.moveSpeed));
      }
      if (this.keys.down) {
        velocity.add(up.clone().multiplyScalar(-this.moveSpeed));
      }

      // 水平方向のスライド挙動
      const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);
      if (horizontalVelocity.length() > 0) {
        const slidVelocity = this._slideAlongWall(horizontalVelocity);
        velocity.x = slidVelocity.x;
        velocity.z = slidVelocity.z;
      }

      // Y方向の衝突チェック（上下）
      if (velocity.y !== 0) {
        const yDirection = new THREE.Vector3(0, velocity.y > 0 ? 1 : -1, 0);
        const yCollision = this._checkCollision(yDirection, Math.abs(velocity.y) + 1.0);

        if (yCollision) {
          velocity.y = 0;
        }
      }

      // カメラ位置を更新
      this.camera.position.add(velocity);

      // 足元の床との当たり判定（下降中または静止中）
      const groundCheck = this._checkGroundCollision();
      if (groundCheck && groundCheck.distance < this.footHeight) {
        // 床が足元に近すぎる場合、床の上に補正
        const targetY = groundCheck.groundY + this.eyeHeight;
        if (this.camera.position.y < targetY) {
          this.camera.position.y = targetY;
        }
      }

      // 最低高さの保証（床のメッシュがない場所用）
      const absoluteMinY = this.floorLevel + this.eyeHeight;
      if (this.camera.position.y < absoluteMinY) {
        this.camera.position.y = absoluteMinY;
      }
    }
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('contextmenu', this._onContextMenu);
    document.removeEventListener('wheel', this._onWheel);
    this.domElement.removeEventListener('click', this._onClick);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);

    // ポインターロック解除
    if (this.isPointerLocked) {
      document.exitPointerLock();
    }
  }

  // 操作モードを切り替え
  setMouseOnlyMode(enabled) {
    this.mouseOnlyMode = enabled;

    if (enabled) {
      // ポインターロックを解除
      if (this.isPointerLocked) {
        document.exitPointerLock();
      }

      // 現在のカメラ位置からターゲットを設定
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);

      // カメラの前方にターゲットを配置
      this.target.copy(this.camera.position).add(direction.multiplyScalar(50));

      // 球面座標を初期化
      const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
      const quat = new THREE.Quaternion().setFromUnitVectors(this.camera.up, new THREE.Vector3(0, 1, 0));
      offset.applyQuaternion(quat);
      this.spherical.setFromVector3(offset);

      // デルタ値とオフセットをリセット
      this.sphericalDelta.set(0, 0, 0);
      this.scale = 1.0;
      this.panOffset.set(0, 0, 0);
      this.zoomChanged = false;

      // マウス状態をリセット
      this.state = this.STATE.NONE;
      this.pointers = [];
      this.pointerPositions = {};
    }

    // コールバック実行
    if (this.onControlModeChange) {
      this.onControlModeChange(enabled);
    }
  }
}
