// 参考
// https://www.shadertoy.com/view/lldGzr

uniform float uTime;
uniform float uStartTime;
uniform float uResolution;
uniform float uGravity;
uniform float uSpeed;
uniform float uBaseSize;
uniform float uDuration;

attribute vec3 aRandom;
attribute float aSeed;

varying float vLife;
varying float vSeed;

void main() {
    float realT = uTime - uStartTime;
    float t = realT / uDuration;

    // パーティクルの寿命
    vLife = 1.0 - t;
    vSeed = aSeed;

    if (t < 0.0 || t > 1.0) {
        gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    vec3 pos = position;

    // 放物線運動
    pos.x += aRandom.x * t * uSpeed;
    pos.z += aRandom.z * t * uSpeed;
    pos.y += aRandom.y * t * uSpeed - (uGravity * 0.5 * t * t * 10.0);

    // ピクセル解像度
    float invRes = 1.0 / uResolution;
    pos = floor(pos * uResolution) * invRes;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // ポイントのサイズ計算
    gl_PointSize = (uBaseSize / -mvPosition.z) * vLife;
    gl_Position = projectionMatrix * mvPosition;
}
