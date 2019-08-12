export default class Matrix {
    constructor() {
        this.m = [];

        this.m[0] = 1;
        this.m[1] = 0;
        this.m[2] = 0;
        this.m[3] = 0;

        this.m[4] = 0;
        this.m[5] = 1;
        this.m[6] = 0;
        this.m[7] = 0;

        this.m[8] = 0;
        this.m[9] = 0;
        this.m[10] = 1;
        this.m[11] = 0;

        this.m[12] = 0;
        this.m[13] = 0;
        this.m[14] = 0;
        this.m[15] = 1;
    }

    multiplyByTranslation(x, y, z) {

        this.multiply(
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1);

        return this;
    };

    multiplyByRotation(x, y, z, angleDegrees) {

        const c = Math.cos(angleDegrees * Math.PI / 180);
        const s = Math.sin(angleDegrees * Math.PI / 180);

        this.multiply(
            c + (1 - c) * x * x, (1 - c) * x * y - s * z, (1 - c) * x * z + s * y, 0,
            (1 - c) * x * y + s * z, c + (1 - c) * y * y, (1 - c) * y * z - s * x, 0,
            (1 - c) * x * z - s * y, (1 - c) * y * z + s * x, c + (1 - c) * z * z, 0,
            0, 0, 0, 1);

        return this;
    };

    multiply(m00, m01, m02, m03,
             m10, m11, m12, m13,
             m20, m21, m22, m23,
             m30, m31, m32, m33) {

        var ma = this.m,
            ma0, ma1, ma2, ma3;

        // Row 1
        ma0 = ma[0];
        ma1 = ma[1];
        ma2 = ma[2];
        ma3 = ma[3];
        ma[0] = (ma0 * m00) + (ma1 * m10) + (ma2 * m20) + (ma3 * m30);
        ma[1] = (ma0 * m01) + (ma1 * m11) + (ma2 * m21) + (ma3 * m31);
        ma[2] = (ma0 * m02) + (ma1 * m12) + (ma2 * m22) + (ma3 * m32);
        ma[3] = (ma0 * m03) + (ma1 * m13) + (ma2 * m23) + (ma3 * m33);

        // Row 2
        ma0 = ma[4];
        ma1 = ma[5];
        ma2 = ma[6];
        ma3 = ma[7];
        ma[4] = (ma0 * m00) + (ma1 * m10) + (ma2 * m20) + (ma3 * m30);
        ma[5] = (ma0 * m01) + (ma1 * m11) + (ma2 * m21) + (ma3 * m31);
        ma[6] = (ma0 * m02) + (ma1 * m12) + (ma2 * m22) + (ma3 * m32);
        ma[7] = (ma0 * m03) + (ma1 * m13) + (ma2 * m23) + (ma3 * m33);

        // Row 3
        ma0 = ma[8];
        ma1 = ma[9];
        ma2 = ma[10];
        ma3 = ma[11];
        ma[8] = (ma0 * m00) + (ma1 * m10) + (ma2 * m20) + (ma3 * m30);
        ma[9] = (ma0 * m01) + (ma1 * m11) + (ma2 * m21) + (ma3 * m31);
        ma[10] = (ma0 * m02) + (ma1 * m12) + (ma2 * m22) + (ma3 * m32);
        ma[11] = (ma0 * m03) + (ma1 * m13) + (ma2 * m23) + (ma3 * m33);

        // Row 4
        ma0 = ma[12];
        ma1 = ma[13];
        ma2 = ma[14];
        ma3 = ma[15];
        ma[12] = (ma0 * m00) + (ma1 * m10) + (ma2 * m20) + (ma3 * m30);
        ma[13] = (ma0 * m01) + (ma1 * m11) + (ma2 * m21) + (ma3 * m31);
        ma[14] = (ma0 * m02) + (ma1 * m12) + (ma2 * m22) + (ma3 * m32);
        ma[15] = (ma0 * m03) + (ma1 * m13) + (ma2 * m23) + (ma3 * m33);

        return this;
    };

    multiplyPoint(point) {
        let x = this.m[0] * point[0] + this.m[1] * point[1] + this.m[2] * point[2] + this.m[3],
            y = this.m[4] * point[0] + this.m[5] * point[1] + this.m[6] * point[2] + this.m[7],
            z = this.m[8] * point[0] + this.m[9] * point[1] + this.m[10] * point[2] + this.m[11],
            w = this.m[12] * point[0] + this.m[13] * point[1] + this.m[14] * point[2] + this.m[15];

        return [x / w, y / w, z / w];
    }
}
