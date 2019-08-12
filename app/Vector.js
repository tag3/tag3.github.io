export default class Vector {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    clone() {
        return new Vector(this.x, this.y, this.z);
    }

    normalize() {
        let m = this.length;

        this.x /= m;
        this.y /= m;
        this.z /= m;
    }

    length() {
        return Math.sqrt(this.dot(this));
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
        return new Vector(
            (this.y * v.z) - (this.z - v.y),
            (this.z * v.x) - (this.x * v.z),
            (this.x * v.y) - (this.y * v.x)
        );
    }

    combine(v, s) {
        return new Vector(
            this.x + s * v.x,
            this.y + s * v.y,
            this.z + s * v.z
        );
    }

    add(v) {
        return this.combine(this, 1, v);
    }

    subtract(v) {
        return new Vector(
            this.x - v.x,
            this.y - v.y,
            this.z - v.z
        );
    }
}