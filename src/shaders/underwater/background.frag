// 海底背景用フラグメントシェーダー
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;

varying vec3 vViewDirection;

#include <common>

void main() {
    // 視線ベクトルのY成分（-1.0:真下, 0.0:水平, 1.0:真上）を使用
    float y = vViewDirection.y;

    // グラデーションのミキシング係数を作成
    // y < 0.0 (水平線より下) の場合は DeepColor に近づける
    float mixFactor = smoothstep(-0.1, 0.8, y);

    vec3 color = mix(uDeepColor, uShallowColor, mixFactor);

    gl_FragColor = vec4(color, 1.0);

    #include <colorspace_fragment>
}
