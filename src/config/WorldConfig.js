export const WorldConfig = {
    Urban: {
        modelScale: 1.0,

        floor: {
            floorSize: 500,
            floorColor: '#4a4a4a',  // アスファルト
            gridColor1: '#ffff00',   // 黄色
            gridColor2: '#666666',   // グレー
            showGrid: true
        },

        shader: {
            textureScale: 0.01,
            windowSize: 0.2,
        }
    },

    Nature: {
        modelScale: 1.0,

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

        floor: {
            floorSize: 500,
            floorColor: '#1a3a52',  // 深海の青
            gridColor1: '#2a5a7a',  // 明るい青
            gridColor2: '#0a2a42',  // 暗い青
            showGrid: true
        },

        // 魚が泳ぐ範囲
        bounds: {
            width: 400.0,
            height: 50.0,
            depth: 180.0
        },

        // フォグ
        fog: {
            near: 1.0,
            far: 250.0
        },

        // 魚のメッシュサイズ
        fish: {
            meshRadius: 0.3,
            meshLength: 1.2,
            count: 500
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

        shader: {
            causticScale: 5.0,
            depthMin: -15.0,
            depthMax: 40.0
        }
    }
};
