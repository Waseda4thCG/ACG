// 海底砂地用フラグメントシェーダー
precision highp float;

uniform float uTime;
uniform vec3 uSandColor;
uniform vec3 uSandColorDark;
uniform vec3 uCausticColor;
uniform float uCausticScale;

varying vec2 vUv;
varying vec3 vWorldPosition;

#include <fog_pars_fragment>

// 汎用関数をインポート
#include ../functions/math.glsl
#include ../functions/noise.glsl
#include ../functions/hexTiling.glsl

// コースティクス定数
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

// ヘックスタイリングを使ったコースティクス
float caustics(vec2 p, float time) {
    vec2 uv = p * uCausticScale;

    float hexScale = 0.8;
    vec2 hexUv = uv * hexScale;

    float c = 0.0;

    // 元の角度
    vec4 hex1 = hexCoord(hexUv);
    float h1 = hash2D(hex1.zw);
    vec2 offset1 = vec2(h1 * 100.0, fract(h1 * 17.0) * 100.0);
    c += causticTile(uv + offset1, time) * 0.4;

    // 30度回転
    vec2 rotUv2 = mat2(0.866, -0.5, 0.5, 0.866) * hexUv;
    vec4 hex2 = hexCoord(rotUv2);
    float h2 = hash2D(hex2.zw + vec2(100.0));
    vec2 offset2 = vec2(h2 * 100.0, fract(h2 * 23.0) * 100.0);
    c += causticTile(uv + offset2, time + 5.0) * 0.35;

    // 60度回転
    vec2 rotUv3 = mat2(0.5, -0.866, 0.866, 0.5) * hexUv;
    vec4 hex3 = hexCoord(rotUv3);
    float h3 = hash2D(hex3.zw + vec2(200.0));
    vec2 offset3 = vec2(h3 * 100.0, fract(h3 * 31.0) * 100.0);
    c += causticTile(uv + offset3, time + 10.0) * 0.25;

    // 遠景でチラつくので減衰
    float w = max(fwidth(p.x), fwidth(p.y));
    c *= 1.0 - smoothstep(0.5, 2.0, w);

    return clamp(c, 0.0, 1.0);
}

void main() {
    vec2 worldUv = vWorldPosition.xz;

    // 1. 砂の質感（ザラザラ）
    float freq = 220.0;
    vec2 p = worldUv * freq;

    float w = max(fwidth(p.x), fwidth(p.y));
    float atten = 1.0 - smoothstep(0.6, 2.0, w);

    float grain = noise2D(p) * atten;
    vec3 sandTexture = uSandColor * (0.9 + 0.2 * grain);

    // 2. 砂丘のうねり
    float duneScale = 0.06;
    vec2 q = worldUv * duneScale;

    vec2 warp = vec2(
        fbm2D(q + vec2(3.1, 1.7)),
        fbm2D(q + vec2(8.3, 2.8))
    );
    q += (warp - 0.5) * 2.0;

    float dune = fbm2D(q * 1.2);
    float dunePattern = smoothstep(0.35, 0.75, dune);

    vec3 sandBase = mix(mix(uSandColorDark, sandTexture, 0.6), sandTexture, dunePattern);

    // 3. コースティクス
    float caust = caustics(worldUv, uTime);

    vec3 finalColor = sandBase + uCausticColor * caust * 0.7;

    gl_FragColor = vec4(finalColor, 1.0);

    #include <fog_fragment>
}
