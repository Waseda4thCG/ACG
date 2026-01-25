attribute float aHeight;
attribute float aRandom;

uniform float uTime;
uniform float uWindStrength;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vHeight;

void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vHeight = aHeight;
    
    // ワールド座標
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    
    // 風の揺れ（頂点の高さに比例）
    float windPhase = worldPos.x * 0.5 + worldPos.z * 0.3 + uTime * 2.0;
    float windEffect = sin(windPhase + aRandom * 6.28) * uWindStrength;
    
    // 草の先端ほど揺れる（position.yが高いほど揺れる）
    float heightFactor = position.y / max(aHeight, 0.1);
    worldPos.x += windEffect * heightFactor * heightFactor;
    worldPos.z += windEffect * 0.3 * heightFactor * heightFactor;
    
    vWorldPos = worldPos.xyz;
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
