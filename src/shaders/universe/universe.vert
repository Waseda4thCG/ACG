varying vec3 vNormal;
varying vec3 vFragPos;

void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vFragPos = (modelMatrix * vec4(position, 1.0)).xyz;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
