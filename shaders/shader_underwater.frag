uniform vec3 uLightDirection;
uniform float uShininess;
uniform float uTime;
uniform float uScale;

uniform vec3 uDeepWaterColor;
uniform vec3 uShallowWaterColor;
uniform vec3 uCausticColor;

varying vec3 vNormal;
varying vec3 vFragPos;

// --- Noise Functions ---
float hash(vec3 p) { p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) { vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y), mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }

// コースティクス（光の模様）
float caustic(vec3 pos, float time) {
    vec3 p = pos * uScale + vec3(time * 0.05, time * 0.05, -time * 0.05);
    float n1 = noise(p * 1.5);
    float n2 = noise(p * 3.0 + vec3(time * 0.1));
    float n = n1 * n2;
    n = pow(n, 2.0) * 5.0;
    return smoothstep(0.1, 0.9, n);
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 pos = vFragPos;

    // ----------------------------------------------------
    // 1. マテリアル生成 (落ち着いた岩肌)
    // ----------------------------------------------------
    float rockNoise = noise(pos * uScale * 3.0);

    // 色を全体的に暗く統一
    vec3 rockColor = vec3(0.05, 0.08, 0.1);     // ほぼ黒に近い青
    vec3 sedimentColor = vec3(0.2, 0.25, 0.3);  // 白ではなく、少し明るいグレー青

    // 沈殿物 (Sediment) の計算
    // ★修正: コントラストを下げて、マダラ模様を「うっすらとした汚れ」に変える
    float upFactor = normal.y;
    // ノイズの影響を弱め、smoothstepの幅を広げてグラデーションにする
    float sedimentMask = smoothstep(0.4, 0.9, upFactor * (0.6 + 0.4 * rockNoise));

    vec3 baseColor = mix(rockColor, sedimentColor, sedimentMask);


    // ----------------------------------------------------
    // 2. ライティング
    // ----------------------------------------------------
    float diff = max(0.0, dot(normal, uLightDirection));
    diff = pow(diff * 0.5 + 0.5, 2.0);

    float caus = caustic(pos, uTime);

    // 光の模様も深さによって弱める
    float depthFactor = smoothstep(-50.0, 10.0, pos.y);
    vec3 causticLight = uCausticColor * caus * depthFactor * 1.5;

    // ベース色に光を乗せる
    vec3 diffuse = diff * baseColor * 0.5 + causticLight * 0.5;

    // 環境光
    vec3 ambient = uDeepWaterColor * baseColor * 0.6;

    vec3 finalColor = ambient + diffuse;

    // ----------------------------------------------------
    // 3. 深度フォグ (Depth Fog) - ★ここを修正
    // ----------------------------------------------------
    float dist = length(cameraPosition - vFragPos);

    // ★修正: 30m〜100mにかけてゆっくり霧を濃くする（以前は2m〜30mだった）
    float fogFactor = smoothstep(30.0, 100.0, dist);

    vec3 fogColor = mix(uShallowWaterColor, uDeepWaterColor, smoothstep(10.0, -30.0, pos.y));

    finalColor = mix(finalColor, fogColor, fogFactor);

    gl_FragColor = vec4(finalColor, 1.0);
}