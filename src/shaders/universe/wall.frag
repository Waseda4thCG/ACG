uniform vec3 uLightDirection;

varying vec3 vNormal;
varying vec3 vFragPos;

void main() {
    // Gold material properties
    vec3 baseColor = vec3(0.72, 0.53, 0.04); // Gold
    vec3 specularColor = vec3(1.0, 1.0, 0.8); // Bright pale yellow/white specular
    float shininess = 64.0;

    // Ambient
    float ambientStrength = 0.3;
    vec3 ambient = ambientStrength * baseColor;

    // Diffuse
    vec3 norm = normalize(vNormal);
    vec3 lightDir = normalize(uLightDirection);
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * baseColor;

    // Specular
    vec3 viewDir = normalize(cameraPosition - vFragPos);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = 1.5 * spec * specularColor; // Boost specular for extra shine

    vec3 result = ambient + diffuse + specular;
    gl_FragColor = vec4(result, 1.0);
}
