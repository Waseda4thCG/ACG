uniform vec3 uLightDirection;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vFragPos;
varying vec2 vUv;
varying float vGrassHeight;
varying float vNoise;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vFragPos);
    
    // 草の高さ（Vertex Shaderで事前計算済み）
    float h = vGrassHeight;
    
    // --- 色（写真からスポイトした色を直書き）---
    // 根元: 深い緑
    vec3 colRoot = vec3(0.02, 0.15, 0.0);
    // 中間: 鮮やかな緑
    vec3 colBody = vec3(0.2, 0.6, 0.0);
    // 葉先: 輝く黄色
    vec3 colTip  = vec3(0.7, 0.8, 0.1);
    
    // 高さ(h)に応じてブレンド
    vec3 grassColor = mix(colRoot, colBody, h);
    grassColor = mix(grassColor, colTip, pow(h, 3.0));
    
    // 微小なバリエーションを追加（vNoiseはVertex Shaderで計算済み）
    grassColor += (vNoise - 0.5) * 0.1;
    
    // --- ライティング ---
    
    // 1. Diffuse（明るめに）
    float diff = max(0.0, dot(normal, uLightDirection));
    diff = pow(diff * 0.5 + 0.5, 2.0);
    vec3 diffuse = diff * grassColor;
    
    // 2. Rim Light（輪郭光）
    float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
    fresnel = pow(fresnel, 3.0);
    vec3 rimColor = vec3(0.8, 0.9, 0.4);
    vec3 rim = rimColor * fresnel * h * 0.8;
    
    // 3. Ambient（全体を底上げ）
    vec3 ambient = vec3(0.35) * grassColor;
    
    // 時間による微かな揺らぎ（軽量）
    float wave = sin(vFragPos.x * 2.0 + uTime * 1.5) * 0.02;
    
    vec3 finalColor = ambient + diffuse + rim;
    finalColor += wave * colTip;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
