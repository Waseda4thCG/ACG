// 魚用頂点シェーダー
uniform float uTime;
attribute float aSpeed;
attribute float aOffset;

varying vec3 vNormal;
varying vec3 vWorldPosition;

#include <fog_pars_vertex>

void main() {
    vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vec3 pos = position;

    // くねくね
    float wiggle = sin(uTime * 10.0 * aSpeed + aOffset + pos.z * 5.0) * 0.3;
    pos.x += wiggle * pos.z;

    vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;

    vec4 mvPosition = modelViewMatrix * worldPosition;

    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
}