// 建物（珊瑚礁）用フラグメントシェーダー
// WorldConfigの共通ライティング設定を使用

// 共通ライティングuniforms
uniform vec3 uLightDirection;
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;
uniform float uDiffuseIntensity;
uniform vec3 uCausticColor;
uniform float uCausticIntensity;
uniform float uGodRayIntensity;
uniform float uGodRaySpeed;
uniform float uGodRayScale;

uniform float uTime;
uniform float uScale;

uniform vec3 uDeepWaterColor;
uniform vec3 uShallowWaterColor;
uniform vec3 uRockColor;
uniform vec3 uSedimentColor;

uniform float uDepthMin;
uniform float uDepthMax;

varying vec3 vNormal;
varying vec3 vFragPos;
varying float vDiscard;
varying vec3 vCoralColor;

#include <fog_pars_fragment>

// 汎用関数をインポート
#include ../functions/math.glsl
#include ../functions/noise.glsl

// コースティクス（光の模様）
float caustic(vec3 pos, float time) {
    vec3 p = pos * uScale + vec3(time * 0.05, time * 0.05, -time * 0.05);
    float n1 = noise3D(p * 1.5);
    float n2 = noise3D(p * 3.0 + vec3(time * 0.1));
    float n = n1 * n2;
    n = pow(n, 2.0) * 5.0;
    return smoothstep(0.1, 0.9, n);
}

// ゴッドレイ
float godRay(vec3 pos, float time) {
    vec2 uv = pos.xz * uGodRayScale;

    // 座標自体を大きなノイズで少し歪ませる
    float drift = noise3D(vec3(uv * 0.5, time * 0.1));
    uv += vec2(drift, drift) * 0.5;

    // 異なる角度のノイズを重ね合わせる
    float ray1 = noise3D(vec3(uv.x, uv.y, time * uGodRaySpeed));

    // 座標を回転させて重ねる
    vec2 uv2 = rot2D(0.5) * uv * 1.5;
    float ray2 = noise3D(vec3(uv2.x, uv2.y, time * uGodRaySpeed * 1.2));

    float ray = ray1 * ray2;
    ray = smoothstep(0.1, 0.5, ray);
    return ray * sqrt(ray);
}

// 彩度を上げる関数
// getCoralColor removed (moved to vertex shader)

void main() {
    if (vDiscard > 0.5) {
        discard;
    }

    vec3 fdx = dFdx(vFragPos);
    vec3 fdy = dFdy(vFragPos);
    vec3 normal = normalize(cross(fdx, fdy));
    vec3 pos = vFragPos;

    vec3 coralBase = vCoralColor;

    // 上面は彩度を落とす
    float upFactor = normal.y;
    float maskNoise = noise3D(pos * uScale * 3.0);
    float topMask = smoothstep(0.6, 0.9, upFactor * (0.7 + 0.3 * maskNoise));
    vec3 bleachedColor = mix(coralBase, vec3(0.9, 0.9, 0.85), 0.3);
    coralBase = mix(coralBase, bleachedColor, topMask);

    // ライティング
    float depthFactor = smoothstep(uDepthMin, uDepthMax, pos.y);

    float diff = max(0.0, dot(normal, uLightDirection)) * 0.5 + 0.5;;
    diff *= diff;

    // ゴッドレイ
    float ray = godRay(pos, uTime);
    float rayMask = max(0.0, normal.y) * depthFactor;
    float godRayStrength = ray * rayMask * uGodRayIntensity;

    // コースティクス
    float caus = caustic(pos, uTime);
    vec3 causticLight = uCausticColor * caus * depthFactor * uCausticIntensity;

    // アンビエント
    float ambientDepth = mix(0.3, 1.0, depthFactor);
    vec3 ambient = uAmbientColor * uAmbientIntensity * ambientDepth;

    // ディフューズ
    float sunPenetration = mix(0.2, 1.0, depthFactor);
    float diffuse = diff * uDiffuseIntensity * sunPenetration;

    // ゴッドレイによる追加の明るさ
    vec3 godRayLight = uCausticColor * godRayStrength;

    // 最終色
    vec3 albedo = ambient + coralBase * diffuse + causticLight + godRayLight;

    gl_FragColor = vec4(albedo, 1.0);

    #include <fog_fragment>
}