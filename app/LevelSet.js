import Location from './Location.js';
import Sector from './Sector.js';
import Level from './Level.js';

export default class LevelSet {
    constructor(sector, levelZeroDelta, numLevels, tileWidth, tileHeight) {
        this.sector = sector;
        this.levelZeroDelta = levelZeroDelta;
        this.numLevels = numLevels;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;

        this.levels = [];

        for (let i = 0; i < numLevels; i++) {
            let n = Math.pow(2, i),
                latDelta = levelZeroDelta.latitude / n,
                lonDelta = levelZeroDelta.longitude / n,
                tileDelta = new Location(latDelta, lonDelta),
                level = new Level(i, tileDelta, this);

            this.levels[i] = level;
        }
    }

    lastLevel() {
        return this.levels[this.numLevels - 1];
    }
}
 