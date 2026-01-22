// SDF (Signed Distance Fields) - プロシージャルな複雑形状
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uScale;

varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vNormal;

// SDF関数群
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float sdOctahedron(vec3 p, float s) {
    p = abs(p);
    return (p.x + p.y + p.z - s) * 0.57735027;
}

// スムーズな合成操作
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

float opSmoothSubtraction(float d1, float d2, float k) {
    float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
    return mix(d2, -d1, h) + k * h * (1.0 - h);
}

// 回転行列
mat2 rot2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

// 複雑なSDF形状
float complexShape(vec3 p, float time) {
    // 回転
    p.xy *= rot2D(time * 0.3);
    p.yz *= rot2D(time * 0.2);

    // 複数のプリミティブを組み合わせ
    float d1 = sdSphere(p, 0.5);
    float d2 = sdBox(p, vec3(0.4));
    float d3 = sdTorus(p, vec2(0.4, 0.15));
    float d4 = sdOctahedron(p, 0.6);

    // スムーズに合成
    float result = opSmoothUnion(d1, d2, 0.2);
    result = opSmoothSubtraction(d3, result, 0.15);
    result = opSmoothUnion(result, d4, 0.25);

    return result;
}

void main() {
    // UV座標を中心に
    vec2 uv = (vUv - 0.5) * 2.0;

    // 3D空間での位置
    vec3 pos = vec3(uv * uScale, 0.0);

    // SDFを評価
    float dist = complexShape(pos, uTime);

    // 距離に基づいて色を決定
    float colorFactor = smoothstep(-0.5, 0.5, dist);

    // エッジ検出
    float edge = smoothstep(0.0, 0.05, abs(dist));

    // カラーマッピング
    vec3 color = mix(uColor1, uColor2, colorFactor);

    // エッジを強調
    color = mix(vec3(1.0), color, edge);

    // グロー効果
    float glow = exp(-abs(dist) * 5.0) * 0.5;
    color += uColor1 * glow;

    gl_FragColor = vec4(color, 1.0);
}
