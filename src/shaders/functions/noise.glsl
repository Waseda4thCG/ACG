// =============================================
// 2D Noise Functions
// =============================================

float hash2D(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash2D(i);
    float b = hash2D(i + vec2(1.0, 0.0));
    float c = hash2D(i + vec2(0.0, 1.0));
    float d = hash2D(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// =============================================
// 3D Noise Functions
// =============================================

float hash3D(vec3 p) {
    p = fract(p * 0.3183099 + .1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3D(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash3D(i+vec3(0,0,0)),hash3D(i+vec3(1,0,0)),f.x),
            mix(hash3D(i+vec3(0,1,0)),hash3D(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(hash3D(i+vec3(0,0,1)),hash3D(i+vec3(1,0,1)),f.x),
            mix(hash3D(i+vec3(0,1,1)),hash3D(i+vec3(1,1,1)),f.x),f.y),f.z
    );
}

// =============================================
// Fractal Brownian Motion (FBM)
// math.glslのインポートが必要
// =============================================

float fbm2D(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 4; i++) {
        value += noise2D(p) * amplitude;
        p = rot2D(0.3) * p * 2.0 + vec2(0.0, -0.05);
        amplitude *= 0.5;
    }
    return value;
}
