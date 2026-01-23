// 海底背景用フラグメントシェーダー
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;

varying vec3 vViewDirection;

#include <common>

void main() {
    float y = vViewDirection.y;
    float mixFactor = smoothstep(-0.1, 0.8, y);

    vec3 color = mix(uDeepColor, uShallowColor, mixFactor);

    gl_FragColor = vec4(color, 1.0);

    #include <colorspace_fragment>
}
