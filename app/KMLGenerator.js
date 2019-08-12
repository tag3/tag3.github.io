import TileLookup from './TileLookup.js';

export default class KMLGenerator {
    constructor(tile) {
        this.tile = tile;
        this.tileLookup = new TileLookup();
    }

    generateKML() {
        let locations = [];

        locations[0] = this.tileLookup.nameToLocations(this.tile.tileName);

        for (let i = 1; i <= 9; i++) {
            locations[i] = this.tileLookup.nameToLocations(this.tile.tileName + i.toString());
        }

        return this.generateKMLString(locations);
    }

    generateKMLString(locations) {
        let kmlString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";

        kmlString += "<kml xmlns=\"http://www.opengis.net/kml/2.2\">\n";
        kmlString += "<Document>\n";
        kmlString += "<name>Globe Tiles</name>\n";
        kmlString += "<Style id=\"black\">\n";
        kmlString += "<LineStyle>\n";
        kmlString += "<color>ff000000</color>\n";
        kmlString += "<width>3</width>\n";
        kmlString += "</LineStyle>\n";
        kmlString += "</Style>\n";

        // kmlString += "<Placemark>\n";
        // kmlString += "<name>" + this.tile.tileName + "</name>\n";
        // kmlString += "<Point>\n";
        // kmlString += "<coordinates>" + this.tile.center[1] + "," + this.tile.center[0] + "</coordinates>\n";
        // kmlString += "</Point>\n";
        // kmlString += "</Placemark>\n";

        for (let i = 0; i < locations.length; i++) {
            kmlString += "<Placemark>\n";
            kmlString += "<name>" + (i === 0 ? this.tile.tileName : (this.tile.tileName + i)) + "</name>\n";
            kmlString += "<description>" + (this.tile.tileName + i) + "</description>\n";
            kmlString += "<styleUrl>#black</styleUrl>\n";
            kmlString += "<LineString>\n";
            kmlString += "<tessellate>1</tessellate>\n";
            kmlString += "<altitudeMode>clampToGround</altitudeMode>\n";
            kmlString += "<coordinates>\n";

            let location = locations[i];
            for (let j = 0; j < 3; j++) {
                kmlString += location[j][1].toFixed(6) + "," + location[j][0].toFixed(6) + ",0\n"
            }
            kmlString += location[0][1].toFixed(6) + "," + location[0][0].toFixed(6) + ",0\n";

            kmlString += "</coordinates>\n";
            kmlString += "</LineString>\n";
            kmlString += "</Placemark>\n";
        }


        kmlString += "</Document>\n";
        kmlString += "</kml>\n";

        return kmlString;
    }
}