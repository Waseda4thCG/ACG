varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vFragPos;

uniform float uTime;
uniform float uCollapseStartTime;
uniform vec3 uMeshCenter;

mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

attribute vec3 aStaticPos;
attribute vec3 aStaticNormal;
attribute vec3 aCenterLocal;
attribute vec3 aRandom;

void main() {
    vUv = uv;

    vec3 pos = position;
    vec3 localNormal = normal;

    // 崩壊アニメーション
    if (uCollapseStartTime > 0.0) {
        float t = uTime - uCollapseStartTime;
        if (t > 0.0) {

            // 各三角形の重心へ原点を移動
            pos -= aCenterLocal;

            // 各三角形固有の軸で回転
            vec3 rotAxis = normalize(aRandom + 0.1);
            float rotAngle = t * (length(aRandom) * 10.0 + 2.0);
            mat4 rot = rotationMatrix(rotAxis, rotAngle);

            pos = (rot * vec4(pos, 1.0)).xyz;
            localNormal = (rot * vec4(localNormal, 0.0)).xyz;

            pos += aCenterLocal;

            // 飛散と重力落下
            pos += aRandom * t * 15.0;
            pos.y -= 9.8 * 0.5 * t * t;

            // 地面の下に行ったら削除
            vec3 currentCenterLocal = aCenterLocal + aRandom * t * 15.0 - vec3(0.0, 9.8 * 0.5 * t * t, 0.0);
            vec4 currentCenterWorld = modelMatrix * vec4(currentCenterLocal, 1.0);

            if (currentCenterWorld.y < -1.0) {
                pos = aCenterLocal;
                pos = (pos - aCenterLocal) * 0.0 + aCenterLocal;
            }
        }
    }

    // 法線
    if (uCollapseStartTime > 0.0 && length(aStaticNormal) > 0.0) {
        vNormal = normalize(aStaticNormal);
    } else {
        vNormal = normalize(mat3(modelMatrix) * localNormal);
    }

     // テクスチャ
    if (uCollapseStartTime > 0.0 && length(aStaticPos) > 0.0) {
        vFragPos = aStaticPos;
    } else {
        vFragPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}