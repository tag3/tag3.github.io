import TileLookup from './TileLookup.js';
import GlobeTile from './GlobeTile.js';
import KMLGenerator from "./KMLGenerator.js";

export default class Controller {

    constructor() {
        let self = this;

        this.tileLookup = new TileLookup();

        this.currentTileId = ["0", "0", "0", "0", "0", "0", "0",];

        for (let column = 1; column <= 7; column++) {
            let id = "#column-" + column;
            $(id).on('change', function (event) {
                self.handleTileButtonClick(event)
            });
        }

        $('#latitude').on("input", function (event) {
            let text = $('#latitude').val();

            if (!isNaN(text)) {
                self.latitude = parseFloat(text);
                self.handleAngleChange(event);
            }
        });

        $('#longitude').on("input", function (event) {
            let text = $('#longitude').val();

            if (!isNaN(text)) {
                self.longitude = parseFloat(text);
                self.handleAngleChange(event);
            }
        });

        $('#buildButton').on('click', function (event) {
            self.buildCurrentTile();
        });
        //
        // $('#determineTileButton').on('click', function (event) {
        //     self.determineTile();
        // });
    }

    determineTile() {
        let tileName = this.tileLookup.locationToName(this.latitude, this.longitude);

        for (let i = 0; i < this.currentTileId.length; i++) {
            this.currentTileId[i] = tileName.charAt(i);
            $('#column-' + (i + 1)).val(this.currentTileId[i]);
        }

        $("#buildButton").attr('disabled', !this.currentTileIdValid());
    }

    handleAngleChange(event) {
        $("#stlDisplay").text("");
        $("#progress").attr('style', "width:0%;");
        this.showVertexLocations(false);

        let valid = this.latitude >= -90 && this.latitude <= 90 && this.longitude >= -180 && this.longitude <= 180;
        if (valid) {
            this.determineTile();
        } else {
            this.zeroTile();
        }
        // $("#determineTileButton").attr('disabled', !valid);
    }

    zeroTile() {
        for (let i = 0; i < this.currentTileId.length; i++) {
            $('#column-' + (i + 1)).val(0);
        }
    }

    currentTileIdValid() {
        for (let i = 0; i < this.currentTileId.length; i++) {
            if (this.currentTileId[i] === "0") {
                return false;
            }
        }

        return true;
    }

    handleTileButtonClick(event) {
        let e = event.target;

        $("#stlDisplay").text("");
        $("#progress").attr('style', "width:0%;");
        this.showVertexLocations(false);

        let index;
        switch (e.id) {
            case "column-1":
                index = 0;
                break;
            case "column-2":
                index = 1;
                break;
            case "column-3":
                index = 2;
                break;
            case "column-4":
                index = 3;
                break;
            case "column-5":
                index = 4;
                break;
            case "column-6":
                index = 5;
                break;
            case "column-7":
                index = 6;
                break;
        }

        this.currentTileId[index] = e.options[e.selectedIndex].value === 0 ? "0" : e.options[e.selectedIndex].value;

        $("#buildButton").attr('disabled', !this.currentTileIdValid());
    }

    buildCurrentTile() {
        let tileName = this.currentTileId.join(""),
            cornerLocations = this.tileLookup.nameToLocations(tileName);

        // console.log(tileName);
        // console.log(cornerLocations[0][0] + ", " + cornerLocations[0][1]);
        // console.log(cornerLocations[1][0] + ", " + cornerLocations[1][1]);
        // console.log(cornerLocations[2][0] + ", " + cornerLocations[2][1]);

        let tile = new GlobeTile(tileName, cornerLocations);

        let self = this;
        this.startTime = Date.now();
        tile.build({
            done: function (tile, stl, modelInfo) {
                self.buildDone(tile, stl, modelInfo, cornerLocations);
            },
            progress: function (progress) {
                $("#progress").attr('style', "width:" + progress * 100 + "%;");
            }
        })
    }

    buildDone(tile, stl, modelInfo, cornerLocations) {
        console.log(tile.tileName + " " + (Date.now() - this.startTime) + " ms");

        $("#stlDisplay").text(modelInfo.title);
        this.showVertexLocations(true, cornerLocations);

        Controller.saveText(tile.tileName + ".stl", stl);

        let kml = new KMLGenerator(tile);
        Controller.saveText(tile.tileName + ".kml", kml.generateKML());
    }

    showVertexLocations(show, cornerLocations) {
        if (show && cornerLocations) {
            $('#vertexA').text("A: Latitude " + cornerLocations[0][0].toFixed(6) + "\xB0" +
                " Longitude " + cornerLocations[0][1].toFixed(6) + "\xB0");
            $('#vertexB').text("B: Latitude " + cornerLocations[1][0].toFixed(6) + "\xB0" +
                " Longitude " + cornerLocations[1][1].toFixed(6) + "\xB0");
            $('#vertexC').text("C: Latitude " + cornerLocations[2][0].toFixed(6) + "\xB0" +
                " Longitude " + cornerLocations[2][1].toFixed(6) + "\xB0");
        } else {
            $('#vertexA').text("");
            $('#vertexB').text("");
            $('#vertexC').text("");
        }
    }

    static saveText2(filename, text) {
        let tempElem = document.createElement('a');
        tempElem.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        tempElem.setAttribute('download', filename);
        tempElem.click();
    }

    static saveText(filename, text) {
        let blob = new Blob([text], {type: 'text/plain;charset=utf-8'}),
            url = URL.createObjectURL(blob),
            tempElem = document.createElement('a');

        tempElem.setAttribute('href', url);
        tempElem.setAttribute('download', filename);
        tempElem.click();
    }
}