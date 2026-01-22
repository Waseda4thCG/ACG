uniform float uTime;
uniform float uSize;

attribute float aScale;
attribute vec3 aRandomOffset;

varying vec3 vColor;

void main() {
    // パーティクルの位置をオフセット
    vec3 pos = position + aRandomOffset;

    // Y方向に循環移動（ゆっくり）
    pos.y = mod(pos.y + uTime * 3.0, 200.0) - 100.0;

    // カメラ距離に応じたサイズ調整
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // サイズ
    gl_PointSize = uSize * aScale * (300.0 / -mvPosition.z);

    // 色（高さに応じて変化）
    float colorMix = (pos.y + 100.0) / 200.0;
    vColor = mix(vec3(1.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), colorMix); // マゼンタ→シアン
}
