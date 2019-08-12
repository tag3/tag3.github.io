import Location from './Location.js';
import Sector from './Sector.js';

export default class Level {
    constructor(levelNumber, tileDelta, parent) {
        this.levelNumber = levelNumber;
        this.tileDelta = tileDelta;
        this.parent = parent;

        this.texelSize = (tileDelta.latitude * Math.PI / 180) / parent.tileHeight;
        this.tileWidth = parent.tileWidth;
        this.tileHeight = parent.tileHeight;
        this.sector = parent.sector;
    }
}
 