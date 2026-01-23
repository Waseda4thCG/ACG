uniform vec3 uLightDirection;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vFragPos;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vFragPos);

    // Fresnel reflection - stronger at glancing angles
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    fresnel = 0.3 + 0.7 * fresnel;

    // Base mirror color (silver/chrome)
    vec3 baseColor = vec3(0.7, 0.75, 0.8);

    // Strong specular highlight
    vec3 reflectDir = reflect(-uLightDirection, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 64.0);

    // Pseudo environment reflection based on view direction
    vec3 reflectedView = reflect(-viewDir, normal);
    float envReflect = reflectedView.y * 0.5 + 0.5;
    vec3 envColor = mix(vec3(0.1, 0.1, 0.15), vec3(0.3, 0.35, 0.4), envReflect);

    // Subtle panel lines
    float panelX = abs(fract(vFragPos.x * 0.2) - 0.5);
    float panelZ = abs(fract(vFragPos.z * 0.2) - 0.5);
    float panelLine = smoothstep(0.48, 0.5, panelX) + smoothstep(0.48, 0.5, panelZ);
    panelLine = min(panelLine, 1.0);

    // Combine
    vec3 mirrorColor = mix(envColor, baseColor, 0.5);
    mirrorColor = mirrorColor * fresnel + vec3(1.0) * spec * 2.0;
    mirrorColor = mix(mirrorColor, vec3(0.2, 0.22, 0.25), panelLine * 0.3);

    gl_FragColor = vec4(mirrorColor, 1.0);
}
