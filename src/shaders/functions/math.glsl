// =============================================
// Math Utility Functions
// =============================================

// 2D回転行列
mat2 rot2D(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}
