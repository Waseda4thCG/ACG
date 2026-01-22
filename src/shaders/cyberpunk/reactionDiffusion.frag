// Reaction-Diffusion - 有機的なパターン生成
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uScale;

varying vec3 vPosition;
varying vec2 vUv;

// ハッシュ関数
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Gray-Scottモデルのシミュレーション（簡易版）
vec2 reactionDiffusion(vec2 uv, float time) {
    // 初期パターン
    float u = hash(uv * 10.0);
    float v = hash(uv * 10.0 + vec2(123.45, 678.90));

    // 時間経過でパターンを発展させる
    for(int i = 0; i < 5; i++) {
        float t = time * 0.1 + float(i) * 0.2;

        // ラプラシアン（近似）
        vec2 laplacian = vec2(
            hash(uv + vec2(0.01, 0.0) * t) - 2.0 * u + hash(uv - vec2(0.01, 0.0) * t),
            hash(uv + vec2(0.0, 0.01) * t) - 2.0 * v + hash(uv - vec2(0.0, 0.01) * t)
        );

        // Reaction-Diffusion式（Gray-Scottモデル）
        float F = 0.055; // Feed rate
        float k = 0.062; // Kill rate

        float uvv = u * v * v;

        u += (0.2097 * laplacian.x - uvv + F * (1.0 - u)) * 0.1;
        v += (0.105 * laplacian.y + uvv - (F + k) * v) * 0.1;
    }

    return vec2(u, v);
}

void main() {
    vec2 uv = vUv * uScale;

    // Reaction-Diffusionパターンを計算
    vec2 rd = reactionDiffusion(uv, uTime);

    // パターンに基づいて色を決定
    float pattern = rd.x / (rd.x + rd.y);

    // カラーマッピング
    vec3 color = mix(uColor1, uColor2, pattern);

    // コントラスト強化
    color = pow(color, vec3(0.8));

    // エッジ効果
    float edge = smoothstep(0.4, 0.6, pattern);
    color += vec3(edge) * 0.2;

    gl_FragColor = vec4(color, 1.0);
}
