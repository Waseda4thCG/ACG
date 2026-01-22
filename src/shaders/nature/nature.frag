uniform vec3 uLightDirection;
uniform vec3 uSpecularColor;
uniform float uShininess;
uniform float uTime;

// 以下の色はシェーダー内で固定（ハードコード）して、強制的に写真の色にします
// uniform vec3 uBaseColor;
// uniform vec3 uScale; ...

uniform float uScale; // JSから調整可能に残す
varying vec3 vNormal;
varying vec3 vFragPos;

// --- Noise Functions ---
float hash(vec3 p) { p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) { vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y), mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
const mat3 rot1 = mat3(-0.37, 0.36, 0.85, -0.14, -0.93, 0.34, 0.92, 0.01, 0.4);
const mat3 rot2 = mat3(-0.55, -0.39, 0.74, 0.33, -0.91, -0.24, 0.77, 0.12, 0.63);
const mat3 rot3 = mat3(-0.71, 0.52, -0.47, -0.08, -0.72, -0.68, -0.69, -0.45, 0.56);
float fbm(vec3 p) { float f=0.0; float a=0.5; f+=a*noise(p); p=rot1*p*2.0; a*=0.5; f+=a*noise(p); p=rot2*p*2.0; a*=0.5; f+=a*noise(p); p=rot3*p*2.0; a*=0.5; f+=a*noise(p); return f; }

void main() {
    vec3 viewDir = normalize(cameraPosition - vFragPos);
    vec3 normal = normalize(vNormal);

    // ★ポイント1: スケールを「爆上げ」する
    // これまでの10倍細かくして、葉っぱの繊維感を出す
    vec3 pos = vFragPos * uScale * 15.0;

    vec3 wind = vec3(uTime * 2.0, uTime * 1.5, uTime * 1.4);

    // --- 高さマップ (草の形状) ---
    // ノイズを鋭くして、チクチクした感じを出す
    float n = fbm(pos - wind);
    float h = smoothstep(0.2, 0.8, n); // コントラスト強調

    // --- 法線 (バンプマップ) ---
    // 草のモコモコ感を出すために強めに歪める
    vec3 e = vec3(0.01, 0.0, 0.0);
    float hx = fbm(pos + e.xyy - wind) - n;
    float hy = fbm(pos + e.yxy - wind) - n;
    float hz = fbm(pos + e.yyx - wind) - n;
    vec3 perturbedN = normalize(normal - vec3(hx, hy, hz) * 5.0); // 強度5.0

    // --- 色 (写真からスポイトした色を直書き) ---
    // 根元: 深い緑
    vec3 colRoot = vec3(0.02, 0.15, 0.0);
    // 中間: 鮮やかな緑
    vec3 colBody = vec3(0.2, 0.6, 0.0);
    // 葉先: 輝く黄色
    vec3 colTip  = vec3(0.8, 0.9, 0.1);

    // 高さ(h)に応じてブレンド
    vec3 grassColor = mix(colRoot, colBody, h);
    grassColor = mix(grassColor, colTip, pow(h, 3.0)); // 先端だけ黄色く

    // --- ライティング ---

    // 1. Diffuse (明るめに)
    float diff = max(0.0, dot(perturbedN, uLightDirection));
    diff = pow(diff * 0.5 + 0.5, 2.0); // 影を柔らかく
    vec3 diffuse = diff * grassColor;

    // 2. Rim Light (輪郭光) ★これが写真っぽさの肝
    // 視線と平行な部分を「強烈な黄色」で光らせる
    float fresnel = 1.0 - max(dot(viewDir, perturbedN), 0.0);
    fresnel = pow(fresnel, 2.0);
    vec3 rimColor = vec3(1.0, 1.0, 0.6); // 白に近い黄色
    vec3 rim = rimColor * fresnel * h * 1.5;

    // 3. Ambient (全体を底上げ)
    // 暗い部分も緑色に見えるように
    vec3 ambient = vec3(0.4) * grassColor;

    gl_FragColor = vec4(ambient + diffuse + rim, 1.0);
}