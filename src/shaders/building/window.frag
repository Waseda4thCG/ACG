uniform vec3 uLightDirection;
uniform vec3 uSpecularColor;
uniform float uShininess;

uniform float uWindowSize;
uniform vec3 uWindowColor;
uniform float uTime;
uniform float uScale;

varying vec3 vNormal;
varying vec3 vFragPos;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 getWindowTexture(vec3 pos, vec3 normal, vec3 viewDir) {
    vec2 uv;

    if (abs(normal.z) > 0.5) {
        uv = pos.xy;
    } else {
        uv = pos.zy;
    }

    vec2 st = uv * uWindowSize;
    vec2 tileID = floor(st);
    vec2 tileUV = fract(st);

    // 窓の境界を計算
    float distFromEdge = min(min(tileUV.x, 1.0 - tileUV.x), min(tileUV.y, 1.0 - tileUV.y));
    float windowMask = step(0.2, distFromEdge);
    float frameMask = step(0.12, distFromEdge) - windowMask;

    vec3 color;
    float specStr = 0.0;

    if (windowMask > 0.5) {
        // 窓
        float n = hash(tileID);
        float timeThresh = 0.7 + 0.2 * sin(uTime + n * 20.0);

        // ランダムに窓を光らせる
        if (n > timeThresh) {
            color = vec3(1.0, 0.9, 0.6);
            specStr = 0.5;
        } else {
            color = uWindowColor;

            // 空の擬似反射
            float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
            vec3 skyReflect = vec3(0.4, 0.5, 0.6);
            color = mix(color, skyReflect, fresnel * 0.5);
            color += (hash(tileUV * 10.0 * uScale) - 0.5) * 0.05;

            specStr = 2.0;
        }

    } else if (frameMask > 0.5) {
        // 窓枠
        color = vec3(0.2);
        specStr = 0.8;
    } else {
        // 窓の外枠（壁との接続部分）
        color = vec3(0.3);
        specStr = 0.3;
    }

    return vec4(color, specStr);
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vFragPos);

    vec4 texData = getWindowTexture(vFragPos, normal, viewDir);
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
