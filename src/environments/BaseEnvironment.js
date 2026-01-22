// 共通インターフェース
export class BaseEnvironment {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
    }

    // 初期化: 共有アセット(建物)を受け取り、マテリアルを適用
    init(sharedAssets) {}

    // 更新
    update(elapsedTime) {}

    // 片付け
    dispose() {}
}