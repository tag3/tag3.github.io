export default class ElevationImage {
    constructor(imagePath, sector, imageWidth, imageHeight) {
        this.imagePath = imagePath;
        this.sector = sector;
        this.imageWidth = imageWidth;
        this.imageHeight = imageHeight;
    }

    pixel(x, y) {
        if (x < 0 || x >= this.imageWidth) {
            return 0;
        }

        if (y < 0 || y >= this.imageHeight) {
            return 0;
        }

        y = this.imageHeight - y - 1; // flip the y coordinate origin to the lower left corner
        return this.imageData[x + y * this.imageWidth];
    };

    findMinAndMaxElevation() {
        if (this.imageData && (this.imageData.length > 0)) {
            this.minElevation = Number.MAX_VALUE;
            this.maxElevation = -this.minElevation;

            var pixels = this.imageData,
                pixelCount = this.imageWidth * this.imageHeight;

            for (var i = 0; i < pixelCount; i++) {
                var p = pixels[i];

                if (this.minElevation > p) {
                    this.minElevation = p;
                }

                if (this.maxElevation < p) {
                    this.maxElevation = p;
                }
            }
        } else {
            this.minElevation = 0;
            this.maxElevation = 0;
        }
    };
}
 