uniform vec3 uLightDirection;
uniform vec3 uSpecularColor;
uniform float uShininess;

uniform vec3 uWallColor;
uniform float uTime;
uniform float uScale;

varying vec3 vNormal;
varying vec3 vFragPos;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float res = mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
                    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    return res;
}

// コンクリートの質感を表現するためのノイズ
float fbm(vec2 p) {
    float f = 0.0;
    float scale = 0.5;
    for (int i = 0; i < 4; i++) {
        f += scale * noise(p);
        p *= 2.0;
        scale *= 0.5;
    }
    return f;
}

vec4 getWallTexture(vec3 pos, vec3 normal) {
    vec2 uv;

    if (abs(normal.z) > 0.5) {
        uv = pos.xy;
    } else {
        uv = pos.zy;
    }

    // コンクリート壁の質感
    float dirt = fbm(uv * 2.0 * uScale);  // 大きいムラ
    float grain = hash(uv * 50.0 * uScale);  // 細かいざらつき

    vec3 color = uWallColor * (0.6 + 0.4 * dirt);
    color = mix(color, vec3(0.8), grain * 0.2);

    float specStr = 0.1;

    return vec4(color, specStr);
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vFragPos);

    vec4 texData = getWallTexture(vFragPos, normal);
    vec3 baseColor = texData.rgb;
    float specularStrength = texData.a;

    // ambient
    vec3 ambient = vec3(0.3) * baseColor.rgb;

    // diffuse
    float diff = max(0.0, dot(normal, uLightDirection));
    vec3 diffuse = diff * baseColor * 0.8;

    // specular
    vec3 reflectDir = reflect(-uLightDirection, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
    vec3 specular = spec * uSpecularColor * specularStrength;

    // result
    vec3 result = ambient + diffuse + specular;

    gl_FragColor = vec4(result, 1.0);
}
