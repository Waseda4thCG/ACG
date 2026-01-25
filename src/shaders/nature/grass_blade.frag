uniform vec3 uLightDirection;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vHeight;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    
    // 草の色グラデーション（根元→先端）
    vec3 colRoot = vec3(0.05, 0.2, 0.02);   // 深緑（根元）
    vec3 colMid = vec3(0.2, 0.5, 0.1);      // 緑（中間）
    vec3 colTip = vec3(0.5, 0.7, 0.15);     // 黄緑（先端）
    
    // 高さに応じて色をブレンド
    float t = clamp(vWorldPos.y / max(vHeight, 0.5), 0.0, 1.0);
    vec3 grassColor = mix(colRoot, colMid, smoothstep(0.0, 0.4, t));
    grassColor = mix(grassColor, colTip, smoothstep(0.4, 1.0, t));
    
    // ライティング
    float diff = max(0.3, dot(normal, uLightDirection));
    diff = pow(diff * 0.5 + 0.5, 1.5);
    
    // サブサーフェス散乱（逆光で光る効果）
    float backLight = max(0.0, dot(-viewDir, uLightDirection));
    backLight = pow(backLight, 3.0) * t * 0.5;
    
    vec3 ambient = vec3(0.3) * grassColor;
    vec3 diffuse = diff * grassColor;
    vec3 subsurface = backLight * vec3(0.6, 0.8, 0.2);
    
    vec3 finalColor = ambient + diffuse + subsurface;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
