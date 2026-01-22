varying vec3 vNormal;

void main() {
    vec3 light = vec3(0.5, 1.0, 0.5);
    float d = max(0.0, dot(vNormal, normalize(light)));
    vec3 col = mix(vec3(0.1, 0.3, 0.6), vec3(0.8, 0.9, 1.0), d);
    gl_FragColor = vec4(col, 1.0);
}