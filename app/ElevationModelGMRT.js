export default class ElevationModelGMRT {
    constructor() {
        this.retrievalInProgress = false;
        this.tiffImage = null;
        this.tiffData = null;
        this.error = null;
    }

    getElevations(tileData, locations, callbacks) {
        this.continueElevationLookup(tileData, locations, [], callbacks);
    }

    continueElevationLookup(tileData, locations, elevations, callbacks) {
        if (this.error) {
            callbacks.error(this.error);
            return;
        }

        this.lookupElevations(tileData, locations, callbacks, elevations);

        if (elevations.length === locations.length) {
            callbacks.done(locations, elevations);
        } else {
            let self = this;
            setTimeout(function () {
                self.continueElevationLookup(tileData, locations, elevations, callbacks);
            }, 500)
        }
    }

    async lookupElevations(tileData, locations, callbacks, elevations) {
        if (!this.tiffData) {
            this.retrieveElevations(tileData);
            return;
        }

        if (this.error) {
            return;
        }

        while (elevations.length < locations.length) {
            let elevation = this.getElevation(tileData, locations[elevations.length]);

            elevations.push(elevation);

            callbacks.progress(elevations.length / locations.length);
        }
    }

    getElevation(tileData, location) {
        let latitude = location[0],
            longitude = location[1];

        if (latitude >= 83 || latitude <= -83) {
            console.log("Requested unavailable latitude " + latitude);
            return 0; // The elevation services does not provide latitudes at the poles.
        }

        let x = Math.round(this.tiffImage.getWidth() * (longitude - tileData.minLon) / (tileData.maxLon - tileData.minLon)),
            y = this.getMercatorRow(tileData, latitude);

        if (x >= this.tiffImage.getWidth()) {
            x = this.tiffImage.getWidth() - 1;
        }
        if (y >= this.tiffImage.getHeight()) {
            y = this.tiffImage.getHeight() - 1;
        }

        let elevation = this.tiffData[0][x + y * this.tiffImage.getWidth()];

        // if (isNaN(elevation)) {
        //     this.error = "NaN for " + latitude + ", " + longitude;
        //     console.log(this.error);
        //     return 0;
        // }

        return elevation;
    }

    getMercatorRow(tileData, latitude) {
        let tMin = ElevationModelGMRT.gudermannianInverse(tileData.minLat),
            tMax = ElevationModelGMRT.gudermannianInverse(tileData.maxLat),
            g = ElevationModelGMRT.gudermannianInverse(latitude),
            dy = ElevationModelGMRT.clamp(1 - (g - tMin) / (tMax - tMin), 0, 1),
            row = Math.floor(dy * (this.tiffImage.getHeight() - 1));

        return row;
    }

    static gudermannianInverse(latitude) {
        // Calculates the Gudermannian inverse used to unproject Mercator projections.
        let degToRad = Math.PI / 180;

        return Math.log(Math.tan(Math.PI / 4 + (latitude * degToRad) / 2)) / Math.PI;
    };

    static clamp(value, minimum, maximum) {
        return value < minimum ? minimum : value > maximum ? maximum : value;
    };

    retrieveElevations(tileData) {
        if (!this.retrievalInProgress) {
            this.retrievalInProgress = true;

            let url = this.urlForTile(tileData),
                xhr = new XMLHttpRequest(),
                elevationModel = this;

            xhr.open("GET", url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        elevationModel.loadElevationImage(tileData, xhr);
                    } else {
                        elevationModel.error = "Elevations retrieval failed.\n" + xhr.statusText;
                        console.error("Elevations retrieval failed (" + xhr.statusText + "): " + url);
                    }
                    elevationModel.retrievalInProgress = false;
                }
            };

            xhr.onerror = function () {
                elevationModel.error = "Elevations retrieval failed: " + url;
                console.error(elevationModel.error);
                elevationModel.retrievalInProgress = false;
            };

            xhr.ontimeout = function () {
                elevationModel.error = "Elevations retrieval timed out: " + url;
                console.error(elevationModel.error);
                elevationModel.retrievalInProgress = false;
            };

            xhr.send(null);

        }
    }

    async loadElevationImage(tileData, xhr) {
        try {
            this.tiff = await GeoTIFF.fromArrayBuffer(xhr.response);
            this.tiffImage = await this.tiff.getImage(0);
            this.tiffData = await this.tiffImage.readRasters();
        } catch (e) {
            this.error = "Failed to parse elevations data.\n" + e.message;
        }
    }

    urlForTile(tileData) {
        let sb = "https://www.gmrt.org:443/services/GridServer?";

        sb = sb + "minlongitude=" + tileData.minLon;
        sb = sb + "&maxlongitude=" + tileData.maxLon;
        sb = sb + "&minlatitude=" + tileData.minLat;
        sb = sb + "&maxlatitude=" + tileData.maxLat;
        sb = sb + "&format=geotiff";
        sb = sb + "&resolution=max";
        sb = sb + "&layer=topo";

        return sb;
    }
}