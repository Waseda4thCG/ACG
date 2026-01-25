varying vec3 vNormal;
varying vec3 vFragPos;
varying vec2 vUv;
varying float vGrassHeight;
varying float vNoise;

// 高速なハッシュ関数
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 簡易ノイズ（Vertex Shaderで事前計算）
float simpleNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vFragPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    
    // 草の高さマップをVertex Shaderで計算（重い処理をここで行う）
    vec2 noiseCoord = vFragPos.xz * 0.5;
    float n1 = simpleNoise(noiseCoord);
    float n2 = simpleNoise(noiseCoord * 2.0) * 0.5;
    float n3 = simpleNoise(noiseCoord * 4.0) * 0.25;
    
    vGrassHeight = (n1 + n2 + n3) / 1.75;
    vNoise = simpleNoise(noiseCoord * 8.0);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
