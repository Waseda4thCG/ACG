uniform vec3 uColor;
varying float vLife;
varying float vSeed;

void main() {
    float flicker = (sin(vLife * 40.0 + vSeed * 10.0) + 1.0) * 0.5 + 0.5;

    vec3 finalColor = uColor * 2.0 * vLife * flicker;

    gl_FragColor = vec4(finalColor, vLife);
}
