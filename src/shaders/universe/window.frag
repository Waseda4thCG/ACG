uniform vec3 uLightDirection;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vFragPos;

// Iridescent color based on angle - creates beetle-wing shimmer effect
vec3 iridescent(float angle, float intensity) {
    // Phase-shifted sine waves create rainbow color cycling
    vec3 color = vec3(
        sin(angle * 6.28318 + 0.0) * 0.5 + 0.5,
        sin(angle * 6.28318 + 2.094) * 0.5 + 0.5,
        sin(angle * 6.28318 + 4.188) * 0.5 + 0.5
    );
    return color * intensity;
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vFragPos);
    vec3 pos = vFragPos;

    // Base gray color for space station walls
    vec3 baseGray = vec3(0.4, 0.42, 0.45);

    // Grid pattern - creates panel edges
    float gridX = abs(fract(pos.x * 0.15) - 0.5);
    float gridY = abs(fract(pos.y * 0.15) - 0.5);
    float gridZ = abs(fract(pos.z * 0.15) - 0.5);
    
    // Combine grid edges (works for any wall orientation)
    float grid = min(gridX, min(gridY, gridZ));
    float gridLine = 1.0 - smoothstep(0.0, 0.03, grid);
    
    // Inside panels (not on grid lines)
    float insidePanel = smoothstep(0.03, 0.08, grid);

    // Fresnel effect - angle between view and surface normal
    float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
    fresnel = pow(fresnel, 2.0);

    // Iridescent effect inside grid cells
    // Use view angle + position for color variation
    float iriAngle = fresnel + dot(pos, vec3(0.1, 0.15, 0.12)) + uTime * 0.1;
    vec3 iriColor = iridescent(iriAngle, 0.6);

    // Lighting
    float diff = max(0.0, dot(normal, uLightDirection));
    diff = diff * 0.5 + 0.5; // soft ambient

    // Specular
    vec3 reflectDir = reflect(-uLightDirection, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

    // Combine colors
    // Grid lines are dark gray
    vec3 gridColor = vec3(0.15, 0.16, 0.18);
    
    // Panel interior: gray base + iridescent reflection
    vec3 panelColor = baseGray * diff;
    panelColor += iriColor * fresnel * insidePanel * 0.8;
    panelColor += vec3(0.9) * spec * 0.5;

    // Mix grid lines and panels
    vec3 result = mix(panelColor, gridColor, gridLine);

    gl_FragColor = vec4(result, 1.0);
}

