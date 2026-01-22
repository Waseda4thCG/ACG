uniform float uTime;
uniform vec3 uLightDirection;
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
uniform vec3 uGridColor;
uniform float uGridScale;
uniform float uScanlineIntensity;
uniform float uEmissiveStrength;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

// マテリアルタイプ（uniform経由で識別）
uniform int uMaterialType; // 0: wall, 1: window, 2: roof

// ハッシュ関数（ノイズ生成用）
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// グリッドパターン
float gridPattern(vec2 coord, float scale) {
    vec2 grid = fract(coord * scale);
    float line = min(
        step(0.95, grid.x) + step(grid.x, 0.05),
        step(0.95, grid.y) + step(grid.y, 0.05)
    );
    return line;
}

// 走査線エフェクト（CRT風）
float scanline(vec2 coord, float time) {
    float line = sin(coord.y * 800.0 + time * 2.0) * 0.5 + 0.5;
    return line * uScanlineIntensity + (1.0 - uScanlineIntensity);
}

// フレネル効果（エッジ発光）
float fresnel(vec3 normal, vec3 viewDir, float power) {
    return pow(1.0 - max(0.0, dot(normal, viewDir)), power);
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // ベースカラー（マテリアルタイプで変える）
    vec3 baseColor;
    vec3 emissiveColor = vec3(0.0);

    if (uMaterialType == 1) {
        // Window - ネオンウィンドウ
        // マゼンタ/シアン/紫のグラデーション
        float windowGrid = gridPattern(vUv, 5.0);

        // 時間で色を変化
        float hue = sin(uTime * 0.5 + vPosition.y * 0.1) * 0.5 + 0.5;
        vec3 neonColor = mix(
            vec3(1.0, 0.0, 1.0), // マゼンタ
            vec3(0.0, 1.0, 1.0), // シアン
            hue
        );

        // グリッドがある部分を光らせる
        baseColor = mix(vec3(0.05, 0.05, 0.1), neonColor, windowGrid);
        emissiveColor = neonColor * windowGrid * uEmissiveStrength;

    } else if (uMaterialType == 2) {
        // Roof - オレンジ/紫のグラデーション
        float roofPattern = hash(floor(vUv * 10.0));

        vec3 color1 = vec3(1.0, 0.3, 0.0); // オレンジ
        vec3 color2 = vec3(0.5, 0.0, 1.0); // 紫

        baseColor = mix(color1, color2, roofPattern);

        // 輝きを追加
        emissiveColor = baseColor * 0.3 * uEmissiveStrength;

    } else {
        // Wall - ダークグレー with グリッドライン
        float wallGrid = gridPattern(vec2(vPosition.x, vPosition.y), uGridScale);

        baseColor = mix(
            vec3(0.1, 0.1, 0.15),
            uGridColor,
            wallGrid
        );

        // グリッドライン部分を発光
        emissiveColor = uGridColor * wallGrid * uEmissiveStrength * 0.5;
    }

    // フラットシェーディング風のライティング
    float diffuse = max(0.0, dot(normal, uLightDirection));
    // トゥーンシェーディング風に段階をつける
    diffuse = floor(diffuse * 3.0) / 3.0;

    // リムライト（エッジ発光）
    float rim = fresnel(normal, viewDir, 3.0);
    vec3 rimColor = mix(uSunColor, vec3(1.0, 0.0, 1.0), 0.5); // マゼンタ寄り

    // 最終カラー合成
    vec3 finalColor = baseColor * (0.3 + diffuse * 0.7);
    finalColor += rimColor * rim * 0.4;
    finalColor += emissiveColor;

    // 走査線エフェクト
    float scan = scanline(gl_FragCoord.xy, uTime);
    finalColor *= scan;

    // ビネット効果（画面端を暗く）
    vec2 screenUv = gl_FragCoord.xy / vec2(1920.0, 1080.0); // おおよその画面サイズ
    float vignette = 1.0 - length(screenUv - 0.5) * 0.5;
    finalColor *= vignette;

    // ビビッドな色を保つ
    finalColor = pow(finalColor, vec3(0.9)); // ガンマ補正

    gl_FragColor = vec4(finalColor, 1.0);
}
