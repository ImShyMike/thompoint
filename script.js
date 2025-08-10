const ISLAND_POLYGON = [
    ["42.3187", "-71.0094"],
    ["42.3204", "-71.0074"],
    ["42.3210", "-71.0051"],
    ["42.3214", "-71.0025"],
    ["42.3213", "-71.0006"],
    ["42.3208", "-70.9995"],
    ["42.3205", "-70.9994"],
    ["42.3198", "-70.9997"],
    ["42.3193", "-70.9996"],
    ["42.3191", "-70.9997"],
    ["42.3190", "-71.0002"],
    ["42.3194", "-71.0009"],
    ["42.3198", "-71.0016"],
    ["42.3195", "-71.0032"],
    ["42.3183", "-71.0047"],
    ["42.3173", "-71.0055"],
    ["42.3163", "-71.0064"],
    ["42.3155", "-71.0068"],
    ["42.3146", "-71.0069"],
    ["42.3143", "-71.0073"],
    ["42.3137", "-71.0072"],
    ["42.3136", "-71.0075"],
    ["42.3136", "-71.0078"],
    ["42.3133", "-71.0085"],
    ["42.3127", "-71.0087"],
    ["42.3116", "-71.0098"],
    ["42.3113", "-71.0102"],
    ["42.3103", "-71.0107"],
    ["42.3096", "-71.0112"],
    ["42.3088", "-71.0115"],
    ["42.3088", "-71.0117"],
    ["42.3095", "-71.0122"],
    ["42.3101", "-71.0131"],
    ["42.3104", "-71.0138"],
    ["42.3101", "-71.0151"],
    ["42.3097", "-71.0142"],
    ["42.3097", "-71.0138"],
    ["42.3097", "-71.0130"],
    ["42.3095", "-71.0133"],
    ["42.3094", "-71.0140"],
    ["42.3097", "-71.0152"],
    ["42.3104", "-71.0161"],
    ["42.3113", "-71.0167"],
    ["42.3121", "-71.0172"],
    ["42.3123", "-71.0170"],
    ["42.3122", "-71.0164"],
    ["42.3124", "-71.0165"],
    ["42.3125", "-71.0168"],
    ["42.3130", "-71.0171"],
    ["42.3140", "-71.0163"],
    ["42.3147", "-71.0146"],
    ["42.3160", "-71.0118"],
    ["42.3176", "-71.0100"],
];

const socket = new WebSocket("ws://localhost:5500");

var markers = [];

var map = L.map("map").setView([42.318, -71.0089], 18);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    minZoom: 16,
    maxZoom: 19,
    attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

var southWest = L.latLng(42.306, -70.9989);
var northEast = L.latLng(42.324, -71.0179);
var bounds = L.latLngBounds(southWest, northEast);

map.setMaxBounds(bounds);
map.on("drag", function () {
    map.panInsideBounds(bounds, { animate: false });
});

const polygon = L.polygon(ISLAND_POLYGON, { color: "transparent" }).addTo(map);
map.fitBounds(polygon.getBounds());

function addMarker(lat, lon, popupText, tooltip) {
    var newMarker = L.marker([lat, lon]);
    if (getClosestMarkerDistance([lat, lon]) < 0.0002) {
        return false;
    }
    if (tooltip) {
        newMarker
            .bindTooltip(tooltip, {
                permanent: true,
                direction: "top",
                offset: L.point(-15, -5),
            })
            .openTooltip();
    }
    newMarker.addTo(map);
    if (popupText) {
        newMarker.bindPopup(popupText);
    }
    return newMarker;
}

function isPosInsidePolygon(pos, poly) {
    var inside = false;
    var x = pos[0],
        y = pos[1];
    for (var ii = 0; ii < poly.getLatLngs().length; ii++) {
        var polyPoints = poly.getLatLngs()[ii];
        for (
            var i = 0, j = polyPoints.length - 1;
            i < polyPoints.length;
            j = i++
        ) {
            var xi = polyPoints[i].lat,
                yi = polyPoints[i].lng;
            var xj = polyPoints[j].lat,
                yj = polyPoints[j].lng;

            var intersect =
                yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
    }

    return inside;
}

function getClosestMarkerDistance(pos) {
    var closestDistance = Infinity;
    map.eachLayer(function (layer) {
        if (layer instanceof L.Marker) {
            var markerPos = layer.getLatLng();
            var distance = Math.sqrt(
                Math.pow(markerPos.lat - pos[0], 2) +
                    Math.pow(markerPos.lng - pos[1], 2)
            );
            if (distance < closestDistance) {
                closestDistance = distance;
            }
        }
    });
    return closestDistance;
}

function onMapClick(e) {
    var lat = e.latlng.lat.toFixed(4);
    var lon = e.latlng.lng.toFixed(4);
    if (
        !isPosInsidePolygon([lat, lon], polygon) ||
        getClosestMarkerDistance([lat, lon]) < 0.0002
    ) {
        return;
    }
    var markerName = prompt("Enter marker name:", "New Marker");
    var markerDescription = prompt("Enter marker description:");
    if (!markerName || !markerDescription) {
        alert("Marker name and description cannot be empty.");
        return;
    }
    var markerDescription = `Coordinates: ${lat}, ${lon}<br>${markerDescription}`;
    addMarker(
        lat,
        lon,
        `<b>${markerName}</b><br>${markerDescription}`,
        markerName
    );
}
map.on("click", onMapClick);

socket.addEventListener("message", (event) => {
    console.log("Message from server ", event.data);
    if (event.data.type != "text") {
        console.log("Unkown data received");
        return;
    }
    try {
        var parsedJson = JSON.parse(event.data.value);
    } catch {
        console.log("Received data is not JSON");
        return;
    }
    var eventType = parsedJson.eventType;
    var name = parsedJson.name;
    var description = parsedJson.description;
    var lat = parsedJson.lat;
    var lon = parsedJson.lon;
    if (!name || !description || !lat || !lon || !eventType) {
        console.log("Received JSON is missing required fields");
        return;
    }
    if (eventType == "addMarker") {
        var marker = addMarker(
            lat,
            lon,
            `<b>${name}</b><br>Coordinates: ${lat}, ${lon}<br>${description}`,
            name
        );
    }
});

function requestAddMarker(marker) {
    return; // TODO
}
