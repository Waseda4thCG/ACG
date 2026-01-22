uniform vec3 uLightDirection;
uniform float uShininess;
uniform float uTime;
uniform float uScale;

uniform vec3 uDeepWaterColor;
uniform vec3 uShallowWaterColor;
uniform vec3 uCausticColor;
uniform vec3 uRockColor;
uniform vec3 uSedimentColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogDensity;
uniform float uFogMax;

varying vec3 vNormal;
varying vec3 vFragPos;

const float eps = 1e-6;

// --- Noise Functions ---
float hash(vec3 p) { p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) { vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y), mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }

// コースティクス（光の模様）
float caustic(vec3 pos, float time) {
    vec3 p = pos * uScale + vec3(time * 0.05, time * 0.05, -time * 0.05);
    float n1 = noise(p * 1.5);
    float n2 = noise(p * 3.0 + vec3(time * 0.1));
    float n = n1 * n2;
    n = pow(n, 2.0) * 5.0;
    return smoothstep(0.1, 0.9, n);
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 pos = vFragPos;

    // 岩肌
    float rockNoise = noise(pos * uScale * 3.0);

    // 沈殿物 (Sediment)
    float upFactor = normal.y;
    float sedimentMask = smoothstep(0.4, 0.9, upFactor * (0.6 + 0.4 * rockNoise));

    vec3 baseColor = mix(uRockColor, uSedimentColor, sedimentMask);

    float diff = max(0.0, dot(normal, uLightDirection));
    diff = pow(diff * 0.5 + 0.5, 2.0);

    float caus = caustic(pos, uTime);
    float depthFactor = smoothstep(-50.0, 10.0, pos.y);
    vec3 causticLight = uCausticColor * caus * depthFactor * 1.5;
    vec3 diffuse = diff * baseColor * 0.5 + causticLight * 0.5;
    vec3 ambient = uDeepWaterColor * baseColor * 0.6;

    vec3 albedo = ambient + diffuse;

    gl_FragColor = vec4(albedo, 1.0);
}