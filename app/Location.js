export default class Location {
    constructor(latitude, longitue) {
        this.latitude = latitude;
        this.longitude = longitue;
    }

    static fromRadians(latRadians, lonRadians) {
        return new Location(latRadians * 180 / Math.PI, lonRadians * 180 / Math.PI);
    }

    static greatCircleDistance(location1, location2) {
        let lat1Radians = location1[0] * Math.PI / 180,
            lat2Radians = location2[0] * Math.PI / 180,
            lon1Radians = location1[1] * Math.PI / 180,
            lon2Radians = location2[1] * Math.PI / 180,
            a,
            b,
            c,
            distanceRadians;

        if (lat1Radians == lat2Radians && lon1Radians == lon2Radians) {
            return 0;
        }

        // "Haversine formula," taken from http://en.wikipedia.org/wiki/Great-circle_distance#Formul.C3.A6
        a = Math.sin((lat2Radians - lat1Radians) / 2.0);
        b = Math.sin((lon2Radians - lon1Radians) / 2.0);
        c = a * a + Math.cos(lat1Radians) * Math.cos(lat2Radians) * b * b;
        distanceRadians = 2.0 * Math.asin(Math.sqrt(c));

        return isNaN(distanceRadians) ? 0 : distanceRadians;
    };

    static greatCircleAzimuth(location1, location2) {
        let lat1Radians = location1[0] * Math.PI / 180,
            lat2Radians = location2[0] * Math.PI / 180,
            lon1Radians = location1[1] * Math.PI / 180,
            lon2Radians = location2[1] * Math.PI / 180,
            x,
            y,
            azimuthRadians;

        if (lat1Radians == lat2Radians && lon1Radians == lon2Radians) {
            return 0;
        }

        if (lon1Radians == lon2Radians) {
            return lat1Radians > lat2Radians ? 180 : 0;
        }

        // Taken from "Map Projections - A Working Manual", page 30, equation 5-4b.
        // The atan2() function is used in place of the traditional atan(y/x) to simplify the case when x == 0.
        y = Math.cos(lat2Radians) * Math.sin(lon2Radians - lon1Radians);
        x = Math.cos(lat1Radians) * Math.sin(lat2Radians) - Math.sin(lat1Radians) *
            Math.cos(lat2Radians) * Math.cos(lon2Radians - lon1Radians);
        azimuthRadians = Math.atan2(y, x);

        return isNaN(azimuthRadians) ? 0 : azimuthRadians * 180 / Math.PI;
    };

    static greatCircleLocation(location, greatCircleAzimuthDegrees, pathLengthRadians) {
        let result = [];

        if (pathLengthRadians == 0) {
            result[0] = location[0];
            result[1] = location[1];
            return result;
        }

        var latRadians = location[0] * Math.PI / 180,
            lonRadians = location[1] * Math.PI / 180,
            azimuthRadians = greatCircleAzimuthDegrees * Math.PI / 180,
            endLatRadians,
            endLonRadians;

        // Taken from "Map Projections - A Working Manual", page 31, equation 5-5 and 5-6.
        endLatRadians = Math.asin(Math.sin(latRadians) * Math.cos(pathLengthRadians) +
            Math.cos(latRadians) * Math.sin(pathLengthRadians) * Math.cos(azimuthRadians));
        endLonRadians = lonRadians + Math.atan2(
                Math.sin(pathLengthRadians) * Math.sin(azimuthRadians),
                Math.cos(latRadians) * Math.cos(pathLengthRadians) -
                Math.sin(latRadians) * Math.sin(pathLengthRadians) * Math.cos(azimuthRadians));

        if (isNaN(endLatRadians) || isNaN(endLonRadians)) {
            result[0] = location[0];
            result[1] = location[1];
        } else {
            result[0] = Location.normalizedDegreesLatitude(endLatRadians * 180 / Math.PI);
            result[1] = Location.normalizedDegreesLongitude(endLonRadians * 180 / Math.PI);
        }

        return result;
    };

    static normalizedDegreesLatitude(degrees) {
        var lat = degrees % 180;

        return lat > 90 ? 180 - lat : lat < -90 ? -180 - lat : lat;
    };

    static normalizedDegreesLongitude(degrees) {
        var lon = degrees % 360;

        return lon > 180 ? lon - 360 : lon < -180 ? 360 + lon : lon;
    };
}
 