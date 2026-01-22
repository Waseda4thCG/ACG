// Voronoiパターンのシェーダー（プロシージャルテクスチャ）
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uScale;

varying vec3 vPosition;
varying vec2 vUv;

// 2Dハッシュ関数
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

// Voronoiパターン
vec3 voronoi(vec2 uv, float time) {
    vec2 i_uv = floor(uv);
    vec2 f_uv = fract(uv);

    float minDist = 1.0;
    vec2 minPoint;

    // 3x3グリッドをチェック
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash2(i_uv + neighbor);

            // ポイントをアニメーション
            point = 0.5 + 0.5 * sin(time * 0.5 + 6.2831 * point);

            vec2 diff = neighbor + point - f_uv;
            float dist = length(diff);

            if(dist < minDist) {
                minDist = dist;
                minPoint = point;
            }
        }
    }

    return vec3(minDist, minPoint);
}

void main() {
    vec2 uv = vUv * uScale;

    // Voronoiパターン
    vec3 voronoiPattern = voronoi(uv, uTime);

    // エッジ検出
    float edge = smoothstep(0.0, 0.05, voronoiPattern.x);

    // カラーマッピング
    vec3 color = mix(uColor1, uColor2, edge);

    // セルの中心に基づく色変化
    float cellColor = fract(voronoiPattern.y * 10.0 + voronoiPattern.z * 10.0);
    color = mix(color, uColor1 * 1.5, cellColor * 0.3);

    gl_FragColor = vec4(color, 1.0);
}
