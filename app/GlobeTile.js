import Location from './Location.js';
import ElevationModel from './ElevationModelGMRT.js';
import Matrix from './Matrix.js';

export default class GlobeTile {
    constructor(tileName, cornerLocations) {

        this.EARTH_RADIUS = 6397000;
        this.GLOBE_RADIUS = 63.97;
        this.SCALE = this.GLOBE_RADIUS / this.EARTH_RADIUS;
        this.BASE_HEIGHT = 0.002; // thickness between base bottom and lowest terrain point
        this.EDGE_SEGMENTS = 120;

        this.tileName = tileName;
        this.cornerLocations = cornerLocations;
        this.decimation = this.EDGE_SEGMENTS;

        let degToRad = Math.PI / 180,
            cLat = this.cornerLocations[0][0] * degToRad / 3 +
                this.cornerLocations[1][0] * degToRad / 3 +
                this.cornerLocations[2][0] * degToRad / 3,
            cLon = this.cornerLocations[0][1] * degToRad / 3 +
                this.cornerLocations[1][1] * degToRad / 3 +
                this.cornerLocations[2][1] * degToRad / 3;

        this.center = [cLat / degToRad, cLon / degToRad];

        let minLat = this.cornerLocations[0][0],
            maxLat = this.cornerLocations[0][0],
            minLon = this.cornerLocations[0][1],
            maxLon = this.cornerLocations[0][1];

        for (let i = 1; i < 3; i++) {
            if (this.cornerLocations[i][0] < minLat) {
                minLat = this.cornerLocations[i][0];
            }
            if (this.cornerLocations[i][0] > maxLat) {
                maxLat = this.cornerLocations[i][0];
            }
            if (this.cornerLocations[i][1] < minLon) {
                minLon = this.cornerLocations[i][1];
            }
            if (this.cornerLocations[i][1] > maxLon) {
                maxLon = this.cornerLocations[i][1];
            }
        }

        this.tileData = {
            tileName: tileName,
            // geotiff.js does not handle the top and bottom edges of an image correctly, so make the tile larger in
            // latitude than it needs to be to avoid accessing the top and bottom rows. Yes, this is an ugly hack but
            // fixing it involves a significant change to the geotiffjs code, which should be done at some point.
            // Note that this hack assumes the tile's latitude bounds are somewhat less than the canonical
            // latitude limits of +/-90 degrees.
            minLat: minLat -=  1.005 * (maxLat - minLat),
            maxLat: maxLat +=  1.005 * (maxLat - minLat),
            minLon: minLon,
            maxLon: maxLon
        }
    }

    build(callbacks) {
        this.computeEdges();
        this.computeLocations();
        callbacks.progress(0.1);

        let elevationModel = new ElevationModel();
        let self = this;
        elevationModel.getElevations(this.tileData, this.locations, {
            done: function (locations, elevations) {
                self.elevations = elevations;
                elevationModel.getElevations(self.tileData,[self.center], {
                    done: function (center, centerElevation) {
                        self.centerElevation = centerElevation[0];
                        self.coninueBuild(callbacks);
                    },
                    progress: function (progress) {
                        callbacks.progress(0.1 + 0.5 * (progress));
                    },
                    error(message) {
                        alert(message);
                    }
                });
            },
            progress: function (progress) {
                callbacks.progress(0.1 + 0.5 * (progress));
            },
            error(message) {
                alert(message);
            }
        });
    }

    coninueBuild(callbacks) {
        this.computeVertices();
        callbacks.progress(0.6);
        this.rotateToStandardPosition();
        this.translateToMinZ();

        // Raise the terrain so that the lowest point is the base height above the X-Y plane.
        let m = new Matrix();
        m.multiplyByTranslation(0, 0, this.BASE_HEIGHT);
        this.transformPoints(m, this.vertices, this.vertices);
        callbacks.progress(0.7);

        // Add the base vertices. The base is in the X-Y plane.
        this.baseVertices = [];
        for (let i = 0; i < this.vertices.length; i++) {
            this.baseVertices.push([this.vertices[i][0], this.vertices[i][1], 0]);
        }

        this.computeEdgeVertices();
        callbacks.progress(0.8);

        this.computeSurfaceIndices();
        this.computeEdgeIndices();
        callbacks.progress(0.9);

        let returnInfo = {},
            stl = this.createSTLString(returnInfo);
        callbacks.progress(1.0);

        callbacks.done(this, stl, returnInfo);
    }

    computeEdges() {
        this.llAB = this.computeEdge(this.cornerLocations[0], this.cornerLocations[1], this.decimation);
        this.llBC = this.computeEdge(this.cornerLocations[1], this.cornerLocations[2], this.decimation);
        this.llAC = this.computeEdge(this.cornerLocations[0], this.cornerLocations[2], this.decimation);
    }

    computeEdge(a, b, n) {
        let distanceRadians = Location.greatCircleDistance(a, b),
            azimuthDegrees = Location.greatCircleAzimuth(a, b),
            deltaRadians = distanceRadians / n;

        let edgeLocations = [];
        edgeLocations.push(a);
        for (let i = 1; i < n; i++) {
            edgeLocations.push(Location.greatCircleLocation(a, azimuthDegrees, i * deltaRadians));
        }
        edgeLocations.push(b);

        return edgeLocations;
    }

    getNumPositions() {
        if (!this.numPositions) {
            let np = 0,
                n = this.decimation + 1;

            while (n > 0) {
                np += n--;
            }

            this.numPositions = np;
        }

        return this.numPositions;
    }

    getNumTriangles() {
        if (!this.numTriangles) {
            let nt = 0;

            for (let n = 2 * this.decimation - 1; n > 0; n -= 2) {
                nt += n;
            }

            this.numTriangles = nt;
        }

        return this.numTriangles;
    }

    computeLocations() {
        this.locations = [];

        for (let i = 0; i < this.llAB.length; i++) {
            this.locations.push(this.llAB[i]);
        }

        for (let n = 1; n < this.decimation; n++) {
            let row = this.computeEdge(this.llAC[n], this.llBC[n], this.decimation - n);
            for (let i = 0; i < row.length; i++) {
                this.locations.push(row[i]);
            }
        }

        this.locations.push(this.cornerLocations[2]);
    }

    computeVertices() {
        let degToRad = Math.PI / 180,
            r = this.GLOBE_RADIUS + this.SCALE * this.centerElevation,
            cx = r * Math.cos(this.center[1] * degToRad) * Math.cos(this.center[0] * degToRad),
            cy = r * Math.sin(this.center[1] * degToRad) * Math.cos(this.center[0] * degToRad),
            cz = r * Math.sin(this.center[0] * degToRad);

        this.centerPoint = [cx, cy, cz];

        this.vertices = [];
        for (let i = 0; i < this.locations.length; i++) {
            r = this.GLOBE_RADIUS + this.SCALE * this.elevations[i];
            let vertex = [
                r * Math.cos(this.locations[i][1] * degToRad) * Math.cos(this.locations[i][0] * degToRad) - this.centerPoint[0],
                r * Math.sin(this.locations[i][1] * degToRad) * Math.cos(this.locations[i][0] * degToRad) - this.centerPoint[1],
                r * Math.sin(this.locations[i][0] * degToRad) - this.centerPoint[2]
            ];
            this.vertices.push(vertex);
        }
    }

    rotateToStandardPosition() {
        // Rotate the tile about the parallel through its center to put in the XY plane. Then rotate it so that North
        // is along the Y axis and the X axis runs North to South. In other words, the northern-most parallel that
        // intersects the tile becomes coincident with the Y axis.

        let m = new Matrix();

        // Rotate around centroid to put piece parallel to X-Y plane.
        m.multiplyByRotation(0, -1, 0, 90 - this.center[0]);
        m.multiplyByRotation(0, 0, 1, -this.center[1]);

        this.transformPoints(m, this.vertices, this.vertices);
    }

    translateToMinZ() {
        // Move the tile in the XY plane so that its northern-most point is at X = 0 and its western-most point is at
        // Y = 0;

        let extent = this.computeExtentOfVertices(),
            min = extent[0],
            m = new Matrix();

        m.multiplyByTranslation(-min[0], -min[1], -min[2]);

        this.transformPoints(m, this.vertices, this.vertices);
    }

    computeEdgeVertices() {
        this.edgeVertices = [];

        for (let i = 0; i <= this.decimation; i++) {
            this.edgeVertices.push(this.vertices[i]);
            this.edgeVertices.push(this.baseVertices[i]);
        }

        for (let i = 2 * this.decimation, m = this.decimation; m > 0; i += --m) {
            this.edgeVertices.push(this.vertices[i]);
            this.edgeVertices.push(this.baseVertices[i]);
        }

        for (let i = this.getNumPositions() - 3, m = 3; i >= 0; i -= m++) {
            this.edgeVertices.push(this.vertices[i]);
            this.edgeVertices.push(this.baseVertices[i]);
        }
    }

    computeSurfaceIndices() {
        this.surfaceIndices = [];

        // Compute the indices of the primary triangles of each row.
        let k = 0;
        for (let m = this.decimation; m >= 1; m--) {
            for (let i = 0; i < m; i++) {
                this.surfaceIndices.push([k, k + 1, k + m + 1]);
                ++k;
            }
            ++k;
        }

        k = 1;
        for (let m = this.decimation; m >= 2; m--) {
            for (let i = 0; i < m - 1; i++) {
                this.surfaceIndices.push([k, k + m + 1, k + m]);
                ++k
            }
            k += 2;
        }
    }

    computeEdgeIndices() {
        this.edgeIndices = [];

        for (let i = 0; i < this.edgeVertices.length - 2; i += 2) {
            this.edgeIndices.push([i, i + 1, i + 2]);
            this.edgeIndices.push([i + 1, i + 3, i + 2]);
        }
    }

    transformPoints(m, verticesIn, verticesOut) {
        for (let i = 0; i < verticesIn.length; i++) {
            verticesOut[i] = m.multiplyPoint(verticesIn[i]);
        }
    }

    computeExtentOfVertices() {
        let v0 = this.vertices[0],
            xmin = v0[0],
            ymin = v0[1],
            zmin = v0[2],
            xmax = xmin,
            ymax = ymin,
            zmax = zmin;

        for (let i = 0; i < this.vertices.length; i++) {
            let v = this.vertices[i];

            if (v[0] < xmin) {
                xmin = v[0];
            }
            if (v[1] < ymin) {
                ymin = v[1];
            }
            if (v[2] < zmin) {
                zmin = v[2];
            }

            if (v[0] > xmax) {
                xmax = v[0];
            }
            if (v[1] > ymax) {
                ymax = v[1];
            }
            if (v[2] > zmax) {
                zmax = v[2];
            }
        }

        return [
            [xmin, ymin, zmin],
            [xmax, ymax, zmax]
        ]
    }

    computeMinElevation () {
        let minElevation = Number.MAX_VALUE;

        for (let i = 0; i < this.elevations.length; i++) {
            if (this.elevations[i] < minElevation) {
                minElevation = this.elevations[i];
            }
        }

        return minElevation;
    }

    createSTLString(returnInfo) {
        let s = 1e3;

        let title = this.tileName +
            " Latitude: " + this.center[0].toFixed(9) + "\xB0" +
            " Longitude: " + this.center[1].toFixed(9) + "\xB0" +
            " Min elevation: " + this.computeMinElevation().toFixed(3) + " meters";

        let stl = "solid " + title + "\n";

        for (let i = 0; i < this.surfaceIndices.length; i++) {
            let pa = this.vertices[this.surfaceIndices[i][0]],
                pb = this.vertices[this.surfaceIndices[i][1]],
                pc = this.vertices[this.surfaceIndices[i][2]],
                v1 = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]],
                v2 = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]],
                normal = GlobeTile.normalize(GlobeTile.cross(v1, v2));

            stl += "facet normal ";
            stl += normal[0].toFixed(9) + " ";
            stl += normal[1].toFixed(9) + " ";
            stl += normal[2].toFixed(9) + "\n";

            stl += "  outer loop" + "\n";
            stl += "    vertex " + (s * pa[0]).toFixed(9) + " " + (s * pa[1]).toFixed(9) + " " + (s * pa[2]).toFixed(9) + "\n";
            stl += "    vertex " + (s * pb[0]).toFixed(9) + " " + (s * pb[1]).toFixed(9) + " " + (s * pb[2]).toFixed(9) + "\n";
            stl += "    vertex " + (s * pc[0]).toFixed(9) + " " + (s * pc[1]).toFixed(9) + " " + (s * pc[2]).toFixed(9) + "\n";

            stl += "  endloop\nendfacet\n";

            stl += "facet normal ";
            stl += "0 0 -1\n";

            stl += "  outer loop" + "\n";
            stl += "    vertex " + (s * pa[0]).toFixed(9) + " " + (s * pa[1]).toFixed(9) + " 0\n";
            stl += "    vertex " + (s * pc[0]).toFixed(9) + " " + (s * pc[1]).toFixed(9) + " 0\n";
            stl += "    vertex " + (s * pb[0]).toFixed(9) + " " + (s * pb[1]).toFixed(9) + " 0\n";

            stl += "  endloop\nendfacet\n";
        }

        for (let i = 0; i < this.edgeIndices.length; i++) {
            let pa = this.edgeVertices[this.edgeIndices[i][0]],
                pb = this.edgeVertices[this.edgeIndices[i][1]],
                pc = this.edgeVertices[this.edgeIndices[i][2]],
                v1 = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]],
                v2 = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]],
                normal = GlobeTile.normalize(GlobeTile.cross(v1, v2));

            stl += "facet normal ";
            stl += normal[0].toFixed(9) + " ";
            stl += normal[1].toFixed(9) + " ";
            stl += normal[2].toFixed(9) + "\n";

            stl += "  outer loop" + "\n";
            stl += "    vertex " + (s * pa[0]).toFixed(9) + " " + (s * pa[1]).toFixed(9) + " " + (s * pa[2]).toFixed(9) + "\n";
            stl += "    vertex " + (s * pb[0]).toFixed(9) + " " + (s * pb[1]).toFixed(9) + " " + (s * pb[2]).toFixed(9) + "\n";
            stl += "    vertex " + (s * pc[0]).toFixed(9) + " " + (s * pc[1]).toFixed(9) + " " + (s * pc[2]).toFixed(9) + "\n";

            stl += "  endloop\nendfacet\n";
        }

        stl += "endsolid " + title;

        returnInfo.title = title;

        return stl;
    }

    static cross(a, b) {
        return [
            (a[1] * b[2]) - (a[2] * b[1]),
            (a[2] * b[0]) - (a[0] * b[2]),
            (a[0] * b[1]) - (a[1] * b[0])
        ]
    }

    static normalize(v) {
        let m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

        return [v[0] / m, v[1] / m, v[2] / m];
    }
}