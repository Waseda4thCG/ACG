// =============================================
// Hex Tiling Functions
// =============================================

vec4 hexCoord(vec2 uv) {
    const vec2 s = vec2(1.0, 1.732050808); // 1, sqrt(3)
    const vec2 h = s * 0.5;

    vec2 a = mod(uv, s) - h;
    vec2 b = mod(uv + h, s) - h;

    vec2 gv = length(a) < length(b) ? a : b;
    vec2 id = uv - gv;

    return vec4(gv, id);
}
