// 海底背景用頂点シェーダー
varying vec3 vWorldPosition;
varying vec3 vViewDirection;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    vViewDirection = normalize(worldPosition.xyz - cameraPosition);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;

    gl_Position.z = gl_Position.w;
}
