uniform vec3 uLightDirection;
uniform vec3 uColor;
uniform vec3 uSpecularColor;
uniform float uShininess;

varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPos);

    // ambient
    vec3 ambient = vec3(0.1) * uColor;

    // diffuse
    float diff = max(0.0, dot(normal, uLightDirection));
    vec3 diffuse = diff * uColor;

    // specular
    vec3 reflectDir = reflect(-uLightDirection, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
    vec3 specular = spec * uSpecularColor;

    // result
    vec3 result = ambient + diffuse + specular;

    gl_FragColor = vec4(result, 1.0);
}