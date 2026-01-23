// 海底背景用頂点シェーダー
varying vec3 vWorldPosition;
varying vec3 vViewDirection;

void main() {
    // ワールド座標を取得
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    // カメラから見た頂点の方向ベクトル（視線方向）
    vViewDirection = normalize(worldPosition.xyz - cameraPosition);

    // 通常の座標変換
    gl_Position = projectionMatrix * viewMatrix * worldPosition;

    // Z値を書き換えて、常に最奥（Far Clip Plane）に描画
    gl_Position.z = gl_Position.w;
}
