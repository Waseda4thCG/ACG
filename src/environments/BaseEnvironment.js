// 基底環境クラス: 共通のプロパティと更新ロジックを定義
export class BaseEnvironment {
    constructor(scene, renderer, camera, config = {}) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.config = config;
    }

    // 初期化: 派生クラスで実装
    init(sharedAssets) {}

    // 共通の更新処理
    update(elapsedTime) {
        // シーン内の全メッシュを走査し、uTime ユニフォームを自動更新
        this.scene.traverse((child) => {
            if (child.isMesh && child.material && child.material.uniforms && child.material.uniforms.uTime) {
                child.material.uniforms.uTime.value = elapsedTime;
            }
        });
    }

    // 入力イベントフック（派生クラスで必要に応じてオーバーライド）
    onKeyDown(event) {}
    onMouseMove(event, mousePos) {}
    onPointerLockChange(isLocked) {}

    // 片付け
    dispose() {}
}