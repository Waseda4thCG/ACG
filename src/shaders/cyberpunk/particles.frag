varying vec3 vColor;

void main() {
    // 円形のパーティクル
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    // ソフトエッジ
    float alpha = (1.0 - smoothstep(0.3, 0.5, dist)) * 0.4; // 透明度を下げる

    // グロー効果（控えめに）
    float glow = exp(-dist * 4.0) * 0.2;

    vec3 finalColor = vColor * 0.6 + vec3(glow);

    gl_FragColor = vec4(finalColor, alpha);
}
