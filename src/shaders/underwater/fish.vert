uniform float uTime;
attribute float aSpeed;
attribute float aOffset;
varying vec3 vNormal;

void main() {
    vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vec3 pos = position;

    // くねくね
    float wiggle = sin(uTime * 10.0 * aSpeed + aOffset + pos.z * 5.0) * 0.3;
    pos.x += wiggle * pos.z;

    vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}