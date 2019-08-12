import Location from './Location.js';
import Sector from './Sector.js';
import LevelSet from './LevelSet.js';
import Util from './Util.js';
import ElevationTile from './ElevationTile.js';
import ElevationImage from './ElevationImage.js';

export default class ElevationModel {
    constructor() {
        this.coverageSector = new Sector(-90, 90, -180, 180);
        this.levelZeroDelta = new Location(45, 45);
        this.numLevels = 11;
        this.retrievalImageFormat = "application/bil16";
        this.cachePath = "EarthElevations";
        this.tileWidth = 256;
        this.tileHeight = 256;
        this.minElevation = -11000;
        this.maxElevation = 8850;
        this.levelSet = new LevelSet(this.coverageSector, this.levelZeroDelta, this.numLevels, this.tileWidth, this.tileHeight);

        this.currentTiles = [];
        this.tileCache = {};
        this.imageCache = {};
        this.currentRetrievals = [];
    }

    getElevations(locations, callbacks) {
        this.continueElevationLookup(locations, [], callbacks);
    }

    continueElevationLookup(locations, elevations, callbacks) {
        this.lookupElevations(locations, elevations);

        if (elevations.length === locations.length) {
            callbacks.done(locations, elevations);
        } else {
            callbacks.progress(elevations.length / locations.length);
            let self = this;
            setTimeout(function () {
                self.continueElevationLookup(locations, elevations, callbacks);
            }, 500)
        }
    }

    lookupElevations(locations, elevations) {
        while (elevations.length < locations.length) {
            let elevation = this.getElevation(locations[elevations.length]);
            if (elevation) {
                elevations.push(elevation[0]);
            } else {
                break;
            }
        }
    }

    getElevation(location, result, resultIndex) {
        let latitude = location[0],
            longitude = location[1],
            s = (longitude + 180) / 360,
            t = (latitude + 90) / 180,
            level = this.levelSet.lastLevel(),
            levelWidth = Math.round(level.tileWidth * 360 / level.tileDelta.longitude),
            levelHeight = Math.round(level.tileHeight * 180 / level.tileDelta.latitude),
            tMin = 1 / (2 * levelHeight),
            tMax = 1 - tMin,
            u = levelWidth * Util.fract(s),
            v = levelHeight * Util.clamp(t, tMin, tMax),
            x0 = Util.mod(Math.floor(u - 0.5), levelWidth),
            x1 = Util.mod(x0 + 1, levelWidth),
            y0 = Util.mod(Math.floor(v - 0.5), levelHeight),
            y1 = Util.mod(y0 + 1, levelHeight),
            xf = Util.fract(u - 0.5),
            yf = Util.fract(v - 0.5),
            pixels = new Float64Array(4);

        if (this.lookupPixels(x0, x1, y0, y1, level, pixels)) {
            let result = (1 - xf) * (1 - yf) * pixels[0] +
                xf * (1 - yf) * pixels[1] +
                (1 - xf) * yf * pixels[2] +
                xf * yf * pixels[3];
            return [result];
        } else {
            return null;
        }
    }

    lookupPixels(x0, x1, y0, y1, level, pixels) {
        let tileWidth = level.tileWidth,
            tileHeight = level.tileHeight,
            row0 = Math.floor(y0 / tileHeight),
            row1 = Math.floor(y1 / tileHeight),
            col0 = Math.floor(x0 / tileWidth),
            col1 = Math.floor(x1 / tileWidth),
            r0c0, r0c1, r1c0, r1c1;

        if (this.cachedImage && row0 == row1 && row0 == this.cachedRow && col0 == col1 && col0 == this.cachedCol) {
            r0c0 = r0c1 = r1c0 = r1c1 = this.cachedImage; // use results from previous lookup
        } else if (row0 == row1 && col0 == col1) {
            r0c0 = this.lookupImage(level, row0, col0); // only need to lookup one image
            if (r0c0) {
                r0c1 = r1c0 = r1c1 = r0c0; // re-use the single image
                this.cachedRow = row0;
                this.cachedCol = col0;
                this.cachedImage = r0c0; // note the results for subsequent lookups
            }
        } else {
            r0c0 = this.lookupImage(level, row0, col0);
            r0c1 = this.lookupImage(level, row0, col1);
            r1c0 = this.lookupImage(level, row1, col0);
            r1c1 = this.lookupImage(level, row1, col1);
        }

        if (r0c0 && r0c1 && r1c0 && r1c1) {
            pixels[0] = r0c0.pixel(x0 % tileWidth, y0 % tileHeight);
            pixels[1] = r0c1.pixel(x1 % tileWidth, y0 % tileHeight);
            pixels[2] = r1c0.pixel(x0 % tileWidth, y1 % tileHeight);
            pixels[3] = r1c1.pixel(x1 % tileWidth, y1 % tileHeight);
            return true;
        }

        return false;
    }

    lookupImage(level, row, column) {
        let tile = this.tileForLevel(level, row, column),
            image = this.imageCache[tile.imagePath];

        if (image) {
            return image;
        } else {
            this.retrieveTileImage(tile);
        }
    };

    tileForLevel(level, row, column) {
        let tileKey = level.levelNumber + "." + row + "." + column,
            tile = this.tileCache[tileKey];

        if (tile) {
            return tile;
        }

        let sector = ElevationTile.computeSector(level, row, column);

        tile = this.createTile(sector, level, row, column);
        this.tileCache[tileKey] = tile;

        return tile;
    };

    createTile(sector, level, row, column) {
        let imagePath = this.cachePath + "/" + level.levelNumber + "/" + row + "/" + row + "_" + column;

        return new ElevationTile(sector, level, row, column, imagePath);
    };

    retrieveTileImage(tile) {
        if (this.currentRetrievals.indexOf(tile.imagePath) < 0) {
            let url = this.urlForTile(tile),
                xhr = new XMLHttpRequest(),
                elevationModel = this;

            if (!url)
                return;

            xhr.open("GET", url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    elevationModel.removeFromCurrentRetrievals(tile.imagePath);

                    let contentType = xhr.getResponseHeader("content-type");

                    if (xhr.status === 200) {
                        if (contentType === elevationModel.retrievalImageFormat)
                            try {
                                elevationModel.loadElevationImage(tile, xhr);
                            } catch (e) {
                                console.error("Exception loading elevations for" + url + ", " + e.message);
                            }
                    } else {
                        console.error("Elevations retrieval failed (" + xhr.statusText + "): " + url);
                    }
                }
            };

            xhr.onerror = function () {
                elevationModel.removeFromCurrentRetrievals(tile.imagePath);
                console.error("Elevations retrieval failed: " + url);
            };

            xhr.ontimeout = function () {
                elevationModel.removeFromCurrentRetrievals(tile.imagePath);
                console.error("Elevations retrieval timed out: " + url);
            };

            xhr.send(null);

            this.currentRetrievals.push(tile.imagePath);
        }
    };

    removeFromCurrentRetrievals(imagePath) {
        let index = this.currentRetrievals.indexOf(imagePath);
        if (index > -1) {
            this.currentRetrievals.splice(index, 1);
        }
    };

    loadElevationImage(tile, xhr) {
        var elevationImage = new ElevationImage(tile.imagePath, tile.sector, tile.tileWidth, tile.tileHeight);

        if (this.retrievalImageFormat == "application/bil16") {
            elevationImage.imageData = new Int16Array(xhr.response);
            elevationImage.size = elevationImage.imageData.length * 2;
        } else if (this.retrievalImageFormat == "application/bil32") {
            elevationImage.imageData = new Float32Array(xhr.response);
            elevationImage.size = elevationImage.imageData.length * 4;
        } else if (this.retrievalImageFormat == "image/tiff") {
            // let reader = new GeoTIFFHelper();
            // elevationImage.imageData = reader.createTypedElevationArray(xhr.response);
            // elevationImage.size = elevationImage.imageData.length * 2;
        }

        if (elevationImage.imageData) {
            elevationImage.findMinAndMaxElevation();
            this.imageCache[tile.imagePath] = elevationImage;
        }
    };

    urlForTile(tile) {
        let sector = tile.sector;
        let sb = "https://worldwind26.arc.nasa.gov/elev?service=WMS";

        sb = sb + "&request=GetMap";
        sb = sb + "&version=1.3.0";
        sb = sb + "&transparent=TRUE";
        sb = sb + "&layers=GEBCO,aster_v2,USGS-NED";
        sb = sb + "&format=application/bil16";
        sb = sb + "&width=" + tile.tileWidth;
        sb = sb + "&height=" + tile.tileHeight;
        sb = sb + "&crs=EPSG:4326";
        sb = sb + "&bbox=";
        sb = sb + sector.minLatitude + "," + sector.minLongitude + ",";
        sb = sb + sector.maxLatitude + "," + sector.maxLongitude;

        sb = sb.replace(" ", "%20");

        return sb;
    };
}
 