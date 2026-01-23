// 海底砂地用頂点シェーダー
varying vec2 vUv;
varying vec3 vWorldPosition;

uniform float uTime;

#include <fog_pars_vertex>

void main() {
    vUv = uv;

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
}
