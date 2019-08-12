import Sector from './Sector.js';

export default class ElevationTile {
    constructor(sector, level, row, column, imagePath) {
        this.sector = sector;
        this.level = level;
        this.row = row;
        this.column = column;
        this.imagePath = imagePath;

        this.tileWidth = level.tileWidth;
        this.tileHeight = level.tileHeight;

        this.tileKey = level.levelNumber.toString() + "." + row.toString() + "." + column.toString();
    }

    static computeSector(level, row, column) {
        var deltaLat = level.tileDelta.latitude,
            deltaLon = level.tileDelta.longitude,

            minLat = level.sector.minLatitude + row * deltaLat,
            minLon = level.sector.minLongitude + column * deltaLon,
            maxLat = minLat + deltaLat,
            maxLon = minLon + deltaLon;

        return new Sector(minLat, maxLat, minLon, maxLon);
    };
}
 