varying vec3 vNormal;
varying vec3 vFragPos;
varying vec3 vColor;
varying vec2 vUv;

void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vFragPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vColor = color.rgb;
    vUv = uv;

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}