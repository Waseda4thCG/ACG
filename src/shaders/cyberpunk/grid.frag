uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uGlowColor;
uniform float uGridSize;

varying vec3 vPosition;
varying vec2 vUv;
varying float vElevation;

// ハッシュ関数（ランダム生成用）
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// グリッドパターン
float gridPattern(vec2 coord, float size) {
    vec2 grid = fract(coord * size);
    float lineWidth = 0.05;

    float lineX = smoothstep(lineWidth, 0.0, grid.x) + smoothstep(1.0 - lineWidth, 1.0, grid.x);
    float lineY = smoothstep(lineWidth, 0.0, grid.y) + smoothstep(1.0 - lineWidth, 1.0, grid.y);

    return max(lineX, lineY);
}

// ランダムに光るセル
float randomCells(vec2 coord, float size, float time) {
    vec2 cell = floor(coord * size);
    float h = hash(cell);

    // ごく一部のセルだけ光らせる（控えめに）
    float threshold = 0.98;
    if (h > threshold) {
        // パルス効果（ゆっくり）
        float pulse = sin(time * 1.5 + h * 100.0) * 0.5 + 0.5;
        return pulse * 0.5; // さらに控えめに
    }

    return 0.0;
}

void main() {
    // グリッド座標
    vec2 gridCoord = vec2(vPosition.x, vPosition.z);

    // 基本グリッド
    float grid = gridPattern(gridCoord, uGridSize);

    // ランダムセル
    float cells = randomCells(gridCoord, uGridSize, uTime);

    // 高さに基づく色変化
    float heightFactor = (vElevation + 2.0) / 4.0;
    vec3 baseColor = mix(uColor1, uColor2, heightFactor);

    // グリッドライン（静的、シンプル）
    vec3 gridColor = mix(baseColor, uGlowColor, grid * 0.4);

    // ランダムセルの発光は無効化（チカチカ防止）
    // gridColor += uGlowColor * cells * 0.0;

    // 距離によるフェードアウト（遠くは暗く）
    float distanceFromCenter = length(gridCoord);
    float fade = 1.0 - smoothstep(150.0, 300.0, distanceFromCenter);

    // 最終カラー
    vec3 finalColor = gridColor * fade;

    // グローは最小限に
    finalColor += uGlowColor * grid * 0.05;

    gl_FragColor = vec4(finalColor, 1.0);
}
