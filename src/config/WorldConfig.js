export const WorldConfig = {
    Urban: {
        modelScale: 1.0,

        shader: {
            textureScale: 0.01,
            windowSize: 0.2,
        }
    },

    Underwater: {
        modelScale: 1.0,

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
