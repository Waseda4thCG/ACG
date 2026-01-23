// =============================================
// Water Caustics Functions
// 参考
// https://www.shadertoy.com/view/lsSXDG
// https://www.shadertoy.com/view/4sXfDj
// =============================================

#define CAUSTIC_TAU 6.28318530718
#define CAUSTIC_MAX_ITER 5

// 単一タイルのコースティクス計算
float causticTile(vec2 p, float time) {
    float t = time * 0.5 + 23.0;

    vec2 q = mod(p * CAUSTIC_TAU, CAUSTIC_TAU) - 250.0;
    vec2 i = q;
    float c = 1.0;
    float inten = 0.005;

    for (int n = 0; n < CAUSTIC_MAX_ITER; n++) {
        float tn = t * (1.0 - (3.5 / float(n + 1)));
        i = q + vec2(cos(tn - i.x) + sin(tn + i.y), sin(tn - i.y) + cos(tn + i.x));
        c += 1.0 / length(vec2(q.x / (sin(i.x + tn) / inten), q.y / (cos(i.y + tn) / inten)));
    }

    c /= float(CAUSTIC_MAX_ITER);
    c = 1.17 - pow(c, 1.4);
    c = pow(abs(c), 8.0);

    return c;
}

// 3Dコースティクス（建物・魚用）
float caustic3D(vec3 pos, float time, float scale) {
    vec3 p = pos * scale + vec3(time * 0.05, time * 0.05, -time * 0.05);
    float n1 = noise3D(p * 1.5);
    float n2 = noise3D(p * 3.0 + vec3(time * 0.1));
    float n = n1 * n2;
    n = pow(n, 2.0) * 5.0;
    return smoothstep(0.1, 0.9, n);
}
