const UrbanConfig = {
    modelScale: 1.0,
    useSharedLights: true,

    floor: {
        floorSize: 500,
        floorColor: '#4a4a4a',
        gridColor1: '#ffff00',
        gridColor2: '#666666',
        showGrid: true
    },

    shader: {
        textureScale: 0.01,
        windowSize: 0.2,
    }
};

export const WorldConfig = {
    Camera: {
        yaw: 0.9,
        pitch: -0.3,
        // マウス操作設定
        moveSpeed: 0.5,
        lookSpeed: 0.002,
        rotateSpeed: 0.5,
        panSpeed: 1.0,
        zoomSpeed: 1.0,
        minDistance: 0.05,
        maxDistance: 500,
        minPanDistance: 20.0,  // 近距離でもパンが効く最低距離
        minY: 0.5,             // 地面より下に行かない最低高さ
        dampingFactor: 0.05,
        eyeHeight: 1.7,
        footHeight: 0.2,
        collisionDistance: 2.0,
        playerRadius: 1.0
    },

    Urban: UrbanConfig,

    Nature: {
        modelScale: 1.0,
        useSharedLights: true, // 共通ライトを使用

        floor: {
            floorSize: 500,
            floorColor: '#2d5016',  // 草地の緑
            gridColor1: '#4a7023',  // 明るい緑
            gridColor2: '#1a3d0a',  // 暗い緑
            showGrid: true
        },

        shader: {
            textureScale: 1.0,
        }
    },

    CyberPunk: {
        modelScale: 1.0,
        useSharedLights: true, // 共通ライトを使用

        floor: {
            floorSize: 500,
            floorColor: '#0a0a1a',  // ダークパープル
            gridColor1: '#ff00ff',  // マゼンタ
            gridColor2: '#00ffff',  // シアン
            showGrid: true
        },

        shader: {
            gridScale: 2.0,          // グリッドの密度
            scanlineIntensity: 0.15,  // 走査線の強度
            emissiveStrength: 1.5     // 発光の強さ
        }
    },

    Underwater: {
        modelScale: 1.0,
        useSharedLights: false, // 独自のライトを使用

        floor: {
            showGrid: false
        },


        // 魚が泳ぐ範囲
        bounds: {
            width: 400.0,
            height: 150.0,
            depth: 180.0
        },

        // フォグ
        fog: {
            near: 1.0,
            far: 180.0,
            density: 0.01
        },

        // 魚のメッシュサイズ（定数）
        fish: {
            count: 2500,
            baseScale: 1.5,
            meshRadius: 0.3, // 以前より少し太く
            meshLength: 1.2  // 長さ
        },

        // Boidアルゴリズムのパラメータ
        boid: {
            minHeight: 2.0,
            bodySize: 1.5,
            maxSpeed: 0.3,
            maxForce: 0.01,
            perceptionRadius: 15.0,
            collisionRadius: 5.0,
            avoidanceWeight: 2.5,
            separationWeight: 4.0,
            alignmentWeight: 0.3,
            cohesionWeight: 0.1
        },

        // シェーダー共通設定
        shader: {
            causticScale: 5.0,
            depthMin: -20.0,
            depthMax: 30.0
        },

        // 海底ライティング設定（全シェーダー共通）
        lighting: {
            lightDirection: { x: 0.5, y: 1.0, z: 0.5 },
            ambientColor: '#aed2f1',
            ambientIntensity: 0.4,
            diffuseIntensity: 1.1,
            causticColor: '#ffffff',
            causticIntensity: 0.4,
            // ゴッドレイ設定
            godRayIntensity: 0.5,   // 光の強さ（0.0〜2.0）
            godRaySpeed: 0.6,       // 移動速度（0.05〜0.3）
            godRayScale: 0.3       // 光の筋のサイズ（小さいほど大きな筋）
        },

        // 色設定
        colors: {
            deepWater: '#005cb2',
            shallowWater: '#53b4d7',
            sand: '#e1d3a7',
            sandDark: '#aaaaaa',
            rock: '#341c00',
            sediment: '#000000'
        }
    },

    Universe: {
        modelScale: 1.0,
        useSharedLights: false, // using original lights

        floor: {
            showFloor: false
        },

        // background sphere size
        backgroundRadius: 800.0,

        shader: {
            // building material
            baseColor: [0.3, 0.35, 0.4],
            emissiveColor: [0.2, 0.5, 1.0],
            metallic: 0.8,

            // starry sky
            starDensity: 0.85,
            nebulaColor1: [0.1, 0.0, 0.3],
            nebulaColor2: [0.0, 0.2, 0.4]
        }
    },

    X: {
        ...UrbanConfig,
        laser: {
            color: 0xff0000,
            transparent: true,
            opacity: 1.0,
            duration: 0.3,
            thickness: 0.1,
            strength: 8.0
        },
        crosshair: {
            color: 'rgba(255, 0, 0, 0.5)',
            glowColor: 'rgba(255, 0, 0, 0.8)',
            size: 30,
            dotSize: 4
        },
        explosion: {
            count: 1024,          // パーティクル数
            speed: 25.0,         // 飛散速度（倍率）
            size: 800.0,         // 基本サイズ（距離減衰前）
            gravity: 5.0,        // 重力定数
            duration: 1.5,       // 継続時間（秒）
            color: 0xff4411,     // 基本色
            resolution:  32.0     // ピクセル解像度
        }
    },

    Environments: [
        { id: 'Urban', name: 'Urban', icon: '🏙️' },
        { id: 'Nature', name: 'Nature', icon: '🌿' },
        { id: 'CyberPunk', name: 'CyberPunk', icon: '🤖' },
        { id: 'Underwater', name: 'Underwater', icon: '🌊' },
        { id: 'Universe', name: 'Universe', icon: '🌌' },
        { id: 'X', name: '???', icon: '❓' }
    ]
};
