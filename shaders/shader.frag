uniform vec3 uLightDirection;
uniform sampler2D uTexture;
uniform vec3 uSpecularColor;
uniform float uShininess;

varying vec3 vNormal;
varying vec3 vFragPos;
varying vec3 vColor;
varying vec2 vUv;

// lighting is calculated in world space
void main() {
    vec3 normal = normalize(vNormal);

    vec4 texColor = texture2D(uTexture, vUv);
    if (texColor.a < 0.5) discard;
    vec3 finalBaseColor = texColor.rgb * vColor;

    // ambient
    vec3 ambient = vec3(0.5) * finalBaseColor;

    // diffuse
    float diff = max(0.0, dot(normal, uLightDirection));
    vec3 diffuse = diff * finalBaseColor;
    // specular
    vec3 viewDir = normalize(cameraPosition - vFragPos);
    vec3 reflectDir = reflect(-uLightDirection, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
    vec3 specular = spec * uSpecularColor;

    // result
    vec3 result = ambient + diffuse + specular;

    gl_FragColor = vec4(result, texColor.a);
}