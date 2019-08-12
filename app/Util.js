export default class Util {
    static fract(s) {
        return s - Math.floor(s);
    }

    static mod(number, modulus) {
        return ((number % modulus) + modulus) % modulus;
    }

    static clamp(value, minimum, maximum) {
        return value < minimum ? minimum : value > maximum ? maximum : value;
    }
}