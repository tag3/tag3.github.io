export default class TileLookup {

    constructor() {
        this.facets = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];

        this.vico = [
            /*0*/ [0, 0, 1.],
            /*1*/ [0.89442719099991587856, 0, 0.44721359549995793],
            /*2*/ [0.27639320225002104342, 0.85065080835203993366, 0.44721359549995793],
            /*3*/ [-0.72360679774997893378, 0.52573111211913365982, 0.44721359549995793],
            /*4*/ [-0.72360679774997893378, -0.52573111211913365982, 0.44721359549995793],
            /*5*/ [0.27639320225002104342, -0.85065080835203993366, 0.44721359549995793],
            /*6*/ [0.72360679774997893378, 0.52573111211913365982, -0.44721359549995793],
            /*7*/ [-0.27639320225002104342, 0.85065080835203993366, -0.44721359549995793],
            /*8*/ [-0.89442719099991587856, 0, -0.44721359549995793],
            /*9*/ [-0.27639320225002104342, -0.85065080835203993366, -0.44721359549995793],
            /*10*/ [0.72360679774997893378, -0.52573111211913365982, -0.44721359549995793],
            /*11*/ [0, 0, -1.]
        ];

        this.fico = [
            [2, 0, 1], /* A */
            [3, 0, 2], /* B */
            [4, 0, 3], /* C */
            [5, 0, 4], /* D */
            [1, 0, 5], /* E */
            [1, 6, 2], /* F */
            [7, 2, 6], /* G */
            [2, 7, 3], /* H */
            [8, 3, 7], /* I */
            [3, 8, 4], /* J */
            [9, 4, 8], /* K */
            [4, 9, 5], /* L */
            [10, 5, 9], /* M */
            [5, 10, 1], /* N */ /* N exchanged with O, 96.09.13, slevy */
            [6, 1, 10], /* O */ /* to put equatorial row in consistent order. */
            [6, 11, 7], /* P */
            [7, 11, 8], /* Q */
            [8, 11, 9], /* R */
            [9, 11, 10], /* S */
            [10, 11, 6]       /* T */
        ];

        /*
         * Subdivision pattern:
         *
         * The plane triangle (v0,v1,v2) is subdivided uniformly in thirds, then all
         * vertices are raised to lie on the unit sphere.
         * So e.g. v3 = normalized( (2/3)*v0 + (1/3)*v1 ).
         * We could instead have subdivided uniformly on the sphere itself, but doing
         * it this way actually yields triangles that are more-nearly equilateral.
         *
         * Here's the labelling for subdivided vertices and triangles:

         v0
         /  \
         /  9 \
         v3----v8
         / \  8 / \
         / 4 \  / 7 \
         v4----v9----v7
         / \ 3 /  \ 6 / \
         / 1 \ /  2 \ / 5 \
         v1----v5----v6----v2

         */

        this.subvert = [
            [0, 0, 1], /* v3 */
            [0, 1, 1], /* v4 */
            [1, 1, 2], /* v5 */
            [1, 2, 2], /* v6 */
            [0, 2, 2], /* v7 */
            [0, 0, 2], /* v8 */
            [0, 1, 2]     /* v9 */
        ];

        this.subface = [
            [0, 1, 2], /* Not really used */
            [4, 1, 5], /* facet 1 */
            [9, 5, 6], /* facet 2 */
            [5, 9, 4], /* facet 3 */
            [3, 4, 9], /* facet 4 */
            [7, 6, 2], /* facet 5 */
            [6, 7, 9], /* facet 6 */
            [8, 9, 7], /* facet 7 */
            [9, 8, 3], /* facet 8 */
            [0, 3, 8]     /* facet 9 */
        ];
    }

    locationToName(latitude, longitude) {
        return this.pointToName(TileLookup.geoToPoint(latitude, longitude), 6);
    }

    pointToName(p, depth) {
        let i = 0,
            facet,
            verts = [],
            facetId = "";

        for (facet = 0; facet < 20; facet++) {
            for (i = 0; i < 3; i++) {
                verts[i] = this.vico[this.fico[facet][i]];
            }

            if (TileLookup.within(p, verts[0], verts[1], verts[2])) {
                break;
            }
        }

        if (i > 20) {
            console.log("Trouble: " + p[0] + ", " + p[1] + ", " + p[2] + " not within any triangle");
            return null;
        }

        facetId += this.facets[facet];

        for (i = 0; i < depth; i++) {
            facet = this.findTri(verts, p, verts);
            if (facet < 0) {
                break;
            }

            facetId += facet;
        }

        return facetId;
    }

    findTri(t, p, subt) {
        // Assuming that triangle t[] contains point p, in which of t[]'s facets does it lie? Return the facet number,
        // and leave the facet's vertices in subt[].

        // Fill v[] with the 10 vertices of the subdivision.
        let v = [];

        v[0] = t[0];
        v[1] = t[1];
        v[2] = t[2];
        for (let i = 0; i < 10 - 3; i++) {
            v[i + 3] = TileLookup.interp(t[this.subvert[i][0]], t[this.subvert[i][1]], t[this.subvert[i][2]]);
        }


        // This decision tree discovers in which sub-facet point "p" lies. We take advantage of the fact that edges
        // which look straight in the subdivision diagram are actually straight, since we're doing linear interpolation
        // on the plane (the flat triangle between the vertices). So we get subdivision points which are colinear on
        // the plane; when raised to the sphere, those points lie on the same great circle. This wouldn't be true if,
        // say, the subdivision rule divided each great-circle arc into equal pieces. We go for equal chords, not equal
        // angles.

        // "Is p on the right-hand side of the line from vertex a to b?"
        let facet;

        if (TileLookup.rightSide(p, v[6], v[3])) {
            if (TileLookup.rightSide(p, v[9], v[5])) {
                facet = 2;
            } else if (TileLookup.rightSide(p, v[5], v[4])) {
                facet = 1;
            } else if (TileLookup.rightSide(p, v[4], v[9])) {
                facet = 4;
            } else {
                facet = 3;
            }
        } else {
            if (TileLookup.rightSide(p, v[7], v[9])) {
                if (TileLookup.rightSide(p, v[6], v[7])) {
                    facet = 6;
                } else {
                    facet = 5;
                }
            } else {
                if (TileLookup.rightSide(p, v[8], v[9])) {
                    facet = 7;
                } else if (TileLookup.rightSide(p, v[8], v[3])) {
                    facet = 8;
                } else {
                    facet = 9;
                }
            }
        }

        for (let i = 0; i < 3; i++) {
            subt[i] = v[this.subface[facet][i]];
        }

        if (!TileLookup.within(p, subt[0], subt[1], subt[2])) {
            console.log("findTri: missed by " + TileLookup.withinBy(p, subt[0], subt[1], subt[2]) + " Thought " + facet);
            console.log(p);

            for (let i = 0; i < 3; i++) {
                console.log("p" + i + "=v" + this.subface[facet][i] + " " + subt[1]);
            }

            return -1;
        }

        return facet;
    }

    nameToLocations(name) {
        let verts = this.nameToFacet(name);

        return [
            TileLookup.pointToGeo(verts[0]),
            TileLookup.pointToGeo(verts[1]),
            TileLookup.pointToGeo(verts[2])
        ];
    }

    nameToFacet(name) {
        let major = this.facets.indexOf(name.charAt(0)),
            verts = [];

        for (let i = 0; i < 3; i++) {
            verts[i] = this.vico[this.fico[major][i]];
        }

        for (let i = 1; i < name.length; i++) {
            let facet = parseInt(name.charAt(i));

            this.subTri(verts, facet, verts);
        }

        return verts;
    }

    static geoToPoint(latitude, longitude) {
        latitude *= Math.PI / 180;
        longitude *= Math.PI / 180;

        let r = Math.cos(latitude);

        return [r * Math.cos(longitude), r * Math.sin(longitude), Math.sin(latitude)]
    }

    static pointToGeo(point) {
        let r = Math.sqrt(point[0] * point[0] + point[1] * point[1]),
            lat = Math.atan2(point[2], r),
            lon = r === 0 ? 0 : Math.atan2(point[1], point[0]);

        lat *= 180 / Math.PI;
        lon *= 180 / Math.PI;

        lat = Math.abs(lat) > 90 ? Math.sign(lat) * 90 : lat;
        lon = Math.abs(lon) > 180 ? Math.sign(lon) * 180 : lon;

        return [lat, lon];
    }

    static within(v, va, vb, vc) {
        // Does point v lie within triangle (va, vb, vc)?

        return TileLookup.rightSide(v, va, vb) && TileLookup.rightSide(v, vb, vc) && TileLookup.rightSide(v, vc, va);
    }

    static rightSide(v, va, vb) {
        // On which side of the great circle (va, vb) does point v lie? Computes as (va cross vb) dot v.
        // Note we use >= 0 to ensure we're on the "right side" of both (va, vb) and (vb, va) if we happen to lie just
        // on the line.

        return TileLookup.dot(TileLookup.cross(va, vb), v) >= 0;
    }

    static rightBy(v, va, vb, moved) {
        // Returns distance(v, line(va, vb)). Used for checking the algorithm. If a point should lie within some
        // triangle, but testing shows it lies slightly outside due to numerical error, this routine can push it back
        // in. If v lies leftward of (va, vb), this routine sets moved[0] to the nearest point to v lying on (va, vb).

        let axb = TileLookup.cross(va, vb);
        axb = TileLookup.normalize(axb);

        let d = TileLookup.dot(v, axb);
        if (d < 0) {
            moved[0] = TileLookup.comb(v, -d, axb);
        } else {
            moved[0] = v;
        }

        return d;
    }

    static withinBy(v, va, vb, vc) {
        let moved = [],
            dist = TileLookup.rightBy(v, va, vb, moved);

        v = moved[0];
        let d = TileLookup.rightBy(v, vb, vc, moved);

        v = moved[0];

        if (d < dist) {
            dist = d;
        }

        d = TileLookup.rightBy(v, vc, va, moved);
        if (d < dist) {
            dist = d;
        }

        return dist;
    }

    subTri(tri, facet, subt) {
        let t = [tri[0], tri[1], tri[2]];

        for (let i = 0; i < 3; i++) {
            let k = this.subface[facet][i];

            subt[i] = k < 3 ? t[k] : TileLookup.interp(
                t[this.subvert[k - 3][0]],
                t[this.subvert[k - 3][1]],
                t[this.subvert[k - 3][2]]
            )
        }
    }

    static interp(v1, v2, v3) {
        let x = v1[0] + v2[0] + v3[0],
            y = v1[1] + v2[1] + v3[1],
            z = v1[2] + v2[2] + v3[2],
            m = Math.sqrt(x * x + y * y + z * z);

        return [x / m, y / m, z / m];
    }

    static comb(v1, s, v2) {
        return [v1[0] + s * v2[0], v1[1] + s * v2[1], v1[2] + s * v2[2]];
    }

    static normalize(v) {
        let m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

        return [v[0] / m, v[1] / m, v[2] / m];
    }

    static dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    static cross(a, b) {
        return [
            (a[1] * b[2]) - (a[2] * b[1]),
            (a[2] * b[0]) - (a[0] * b[2]),
            (a[0] * b[1]) - (a[1] * b[0])
        ]
    }
}