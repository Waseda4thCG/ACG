varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;

    vUv = uv;

    gl_Position = projectionMatrix * mvPosition;
}
