// L-System (Lindenmayer System) - フラクタル構造生成
import * as THREE from 'three';

export class LSystem {
    constructor(axiom, rules, iterations) {
        this.axiom = axiom;
        this.rules = rules;
        this.iterations = iterations;
        this.sentence = axiom;
    }

    generate() {
        for (let i = 0; i < this.iterations; i++) {
            let nextSentence = '';
            for (let char of this.sentence) {
                nextSentence += this.rules[char] || char;
            }
            this.sentence = nextSentence;
        }
        return this.sentence;
    }

    // L-Systemから3Dメッシュを生成（タートルグラフィックス）
    createMesh(material, options = {}) {
        const {
            length = 2,
            angle = 25,
            thickness = 0.1,
            thicknessDecay = 0.9
        } = options;

        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const indices = [];

        // タートルの状態
        const stack = [];
        let position = new THREE.Vector3(0, 0, 0);
        let direction = new THREE.Vector3(0, 1, 0);
        let currentLength = length;
        let currentThickness = thickness;
        let vertexIndex = 0;

        // L-System文字列を解釈
        for (let char of this.sentence) {
            switch (char) {
                case 'F': // 前進して線を描く
                    {
                        const startPos = position.clone();
                        const endPos = position.clone().add(direction.clone().multiplyScalar(currentLength));

                        // 円柱を作る
                        const cylinderGeo = new THREE.CylinderGeometry(
                            currentThickness,
                            currentThickness * thicknessDecay,
                            currentLength,
                            6
                        );

                        // 回転と位置を調整
                        const quaternion = new THREE.Quaternion();
                        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

                        const matrix = new THREE.Matrix4();
                        matrix.compose(
                            startPos.clone().add(direction.clone().multiplyScalar(currentLength / 2)),
                            quaternion,
                            new THREE.Vector3(1, 1, 1)
                        );

                        cylinderGeo.applyMatrix4(matrix);

                        // ジオメトリを結合
                        const posAttr = cylinderGeo.attributes.position;
                        for (let i = 0; i < posAttr.count; i++) {
                            positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
                        }

                        const indexArray = cylinderGeo.index ? cylinderGeo.index.array : [];
                        for (let i = 0; i < indexArray.length; i++) {
                            indices.push(indexArray[i] + vertexIndex);
                        }

                        vertexIndex += posAttr.count;

                        position = endPos;
                        currentThickness *= thicknessDecay;
                    }
                    break;

                case '+': // 左回転
                    {
                        const rotationAxis = new THREE.Vector3(0, 0, 1);
                        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, THREE.MathUtils.degToRad(angle));
                        direction.applyMatrix4(rotationMatrix);
                    }
                    break;

                case '-': // 右回転
                    {
                        const rotationAxis = new THREE.Vector3(0, 0, 1);
                        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, THREE.MathUtils.degToRad(-angle));
                        direction.applyMatrix4(rotationMatrix);
                    }
                    break;

                case '&': // 下回転
                    {
                        const rotationAxis = new THREE.Vector3(1, 0, 0);
                        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, THREE.MathUtils.degToRad(angle));
                        direction.applyMatrix4(rotationMatrix);
                    }
                    break;

                case '^': // 上回転
                    {
                        const rotationAxis = new THREE.Vector3(1, 0, 0);
                        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, THREE.MathUtils.degToRad(-angle));
                        direction.applyMatrix4(rotationMatrix);
                    }
                    break;

                case '[': // 状態を保存
                    stack.push({
                        position: position.clone(),
                        direction: direction.clone(),
                        length: currentLength,
                        thickness: currentThickness
                    });
                    break;

                case ']': // 状態を復元
                    if (stack.length > 0) {
                        const state = stack.pop();
                        position = state.position;
                        direction = state.direction;
                        currentLength = state.length;
                        currentThickness = state.thickness;
                    }
                    break;
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return new THREE.Mesh(geometry, material);
    }

    // 枝の先端位置も返すバージョン
    createMeshWithTips(material, options = {}) {
        const {
            length = 2,
            angle = 25,
            thickness = 0.1,
            thicknessDecay = 0.9
        } = options;

        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const indices = [];
        const tips = []; // 枝の先端位置

        const stack = [];
        let position = new THREE.Vector3(0, 0, 0);
        let direction = new THREE.Vector3(0, 1, 0);
        let currentLength = length;
        let currentThickness = thickness;
        let vertexIndex = 0;
        let depth = 0;

        for (let char of this.sentence) {
            switch (char) {
                case 'F':
                    {
                        const startPos = position.clone();
                        const endPos = position.clone().add(direction.clone().multiplyScalar(currentLength));

                        const cylinderGeo = new THREE.CylinderGeometry(
                            currentThickness,
                            currentThickness * thicknessDecay,
                            currentLength,
                            6
                        );

                        const quaternion = new THREE.Quaternion();
                        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

                        const matrix = new THREE.Matrix4();
                        matrix.compose(
                            startPos.clone().add(direction.clone().multiplyScalar(currentLength / 2)),
                            quaternion,
                            new THREE.Vector3(1, 1, 1)
                        );

                        cylinderGeo.applyMatrix4(matrix);

                        const posAttr = cylinderGeo.attributes.position;
                        for (let i = 0; i < posAttr.count; i++) {
                            positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
                        }

                        const indexArray = cylinderGeo.index ? cylinderGeo.index.array : [];
                        for (let i = 0; i < indexArray.length; i++) {
                            indices.push(indexArray[i] + vertexIndex);
                        }

                        vertexIndex += posAttr.count;
                        position = endPos;
                        currentThickness *= thicknessDecay;
                    }
                    break;

                case '+':
                    {
                        const rotationAxis = new THREE.Vector3(0, 0, 1);
                        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, THREE.MathUtils.degToRad(angle));
                        direction.applyMatrix4(rotationMatrix);
                    }
                    break;

                case '-':
                    {
                        const rotationAxis = new THREE.Vector3(0, 0, 1);
                        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, THREE.MathUtils.degToRad(-angle));
                        direction.applyMatrix4(rotationMatrix);
                    }
                    break;

                case '&':
                    {
                        const rotationAxis = new THREE.Vector3(1, 0, 0);
                        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, THREE.MathUtils.degToRad(angle));
                        direction.applyMatrix4(rotationMatrix);
                    }
                    break;

                case '^':
                    {
                        const rotationAxis = new THREE.Vector3(1, 0, 0);
                        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, THREE.MathUtils.degToRad(-angle));
                        direction.applyMatrix4(rotationMatrix);
                    }
                    break;

                case '[':
                    stack.push({
                        position: position.clone(),
                        direction: direction.clone(),
                        length: currentLength,
                        thickness: currentThickness
                    });
                    depth++;
                    break;

                case ']':
                    // 枝の先端位置を記録（深さが浅いとき）
                    if (depth >= 2) {
                        tips.push(position.clone());
                    }
                    if (stack.length > 0) {
                        const state = stack.pop();
                        position = state.position;
                        direction = state.direction;
                        currentLength = state.length;
                        currentThickness = state.thickness;
                    }
                    depth--;
                    break;
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return {
            mesh: new THREE.Mesh(geometry, material),
            tips: tips
        };
    }
}

// プリセット
export const LSystemPresets = {
    // フラクタルツリー
    tree: {
        axiom: 'F',
        rules: {
            'F': 'F[+F]F[-F]F'
        },
        iterations: 4,
        angle: 25
    },

    // ドラゴンカーブ
    dragon: {
        axiom: 'FX',
        rules: {
            'X': 'X+YF+',
            'Y': '-FX-Y'
        },
        iterations: 10,
        angle: 90
    },

    // 3D植物
    plant3D: {
        axiom: 'F',
        rules: {
            'F': 'F[&+F][&-F][^+F][^-F]'
        },
        iterations: 4,
        angle: 30
    },

    // フラクタルタワー
    tower: {
        axiom: 'F',
        rules: {
            'F': 'F[+F]F[-F][^F][&F]F'
        },
        iterations: 3,
        angle: 20
    }
};
