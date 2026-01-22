varying vec3 vNormal;
varying vec3 vFragPos;
// varying vec3 vColor;

void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vFragPos = (modelMatrix * vec4(position, 1.0)).xyz;
    // vColor = color.rgb;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}