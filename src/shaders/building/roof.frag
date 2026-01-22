uniform vec3 uLightDirection;
uniform vec3 uSpecularColor;
uniform float uShininess;

uniform vec3 uRoofColor;
uniform float uTime;

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

vec4 getRoofTexture(vec3 pos) {
    vec2 uv = pos.xz;

    // コンクリート/アスファルトの質感
    float asphalt = fbm(uv * 10.0);
    float grain = hash(uv * 50.0); // 細かいざらつき

    vec3 color = uRoofColor * (0.8 + 0.3 * asphalt);
    color = mix(color, vec3(0.7), grain * 0.1);

    float specStr = 0.1;

    return vec4(color, specStr);
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vFragPos);

    vec4 texData = getRoofTexture(vFragPos);
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
