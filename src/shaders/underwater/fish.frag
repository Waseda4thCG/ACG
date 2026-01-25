// 魚用フラグメントシェーダー
// WorldConfigの共通ライティング設定を使用

uniform vec3 uLightDirection;
uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;
uniform float uDiffuseIntensity;
uniform vec3 uCausticColor;
uniform float uCausticIntensity;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPosition;

#include <fog_pars_fragment>

// 汎用関数をインポート
#include ../functions/math.glsl
#include ../functions/noise.glsl
#include ../functions/caustics.glsl

void main() {
    vec3 normal = normalize(vNormal);

    // ディフューズライティング
    float diff = max(0.0, dot(normal, uLightDirection)) * 0.5 + 0.5;
    diff *= diff;

    // コースティクス（魚にも適用）
    float caus = causticTile(vWorldPosition.xz, uTime);
    vec3 causticLight = uCausticColor * caus * uCausticIntensity * 0.3;

    // 魚の基本色
    vec3 fishColorDark = vec3(0.1, 0.3, 0.6);
    vec3 fishColorLight = vec3(0.8, 0.9, 1.0);
    vec3 baseColor = mix(fishColorDark, fishColorLight, diff);

    // アンビエント
    vec3 ambient = uAmbientColor * uAmbientIntensity;

    // 最終色
    vec3 finalColor = baseColor * (ambient + diff * uDiffuseIntensity) + causticLight;

    gl_FragColor = vec4(finalColor, 1.0);

    #include <fog_fragment>
}