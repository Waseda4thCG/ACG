varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
    vNormal = normalize(normalMatrix * normal);

    vec4 FragPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -FragPos.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}