const modal = document.getElementById("markerModal");
const closeBtn = document.querySelector(".close");
const cancelBtn = document.getElementById("cancelMarker");
const addBtn = document.getElementById("addMarker");
const nameInput = document.getElementById("markerName");
const descriptionInput = document.getElementById("markerDescription");
const logoutBtn = document.getElementById("logoutBtn");
const usernameDisplay = document.getElementById("usernameDisplay");

var current_username = "";

const SERVER_URL = "http://192.168.167.220:1447/api";

const socket = io("ws://192.168.167.220:1448", {
    ackTimeout: 10000,
    retries: 3,
});

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

let pollingInterval;
let lastMarkerCheck = 0;

var polygon;
var map;
var markers = [];
var currentMarkerPosition = null;

async function sendMarkerData(markerData) {
    try {
        const response = await fetch(`${SERVER_URL}/points`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("token", ""),
            },
            body: JSON.stringify(markerData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log("Marker data sent successfully");
        return true;
    } catch (error) {
        console.error("Error sending marker data:", error);
        return false;
    }
}

function showMarkerModal(lat, lon) {
    currentMarkerPosition = { lat, lon };
    const modal = document.getElementById("markerModal");
    const nameInput = document.getElementById("markerName");
    const descriptionInput = document.getElementById("markerDescription");

    nameInput.value = "";
    descriptionInput.value = "";

    modal.classList.add("show");
    nameInput.focus();
}

function showLoginModal() {
    console.log("Attempting to show login modal...");
    const modal = document.getElementById("loginModal");
    if (!modal) {
        console.error("Login modal element not found!");
        return;
    }

    const nameInput = document.getElementById("modalUsername");
    const passwordInput = document.getElementById("modalPassword");

    if (nameInput) nameInput.value = "";
    if (passwordInput) passwordInput.value = "";

    modal.classList.add("show");
    console.log("Login modal should now be visible");

    if (nameInput) {
        nameInput.focus();
    }
}

function hideMarkerModal() {
    const modal = document.getElementById("markerModal");
    modal.classList.remove("show");
    currentMarkerPosition = null;
}

function hideLoginModal() {
    const modal = document.getElementById("loginModal");
    modal.classList.remove("show");
}

async function registerUser(username, password) {
    try {
        const response = await fetch(`${SERVER_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: username,
                password: password,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(
                `HTTP error! status: ${response.status} - ${errorData}`
            );
        }

        const data = await response.json();
        console.log("Registration successful:", data);

        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", username);
            current_username = username;
            console.log("Current username set to:", current_username);
            hideLoginModal();
            return true;
        } else {
            throw new Error("No token received from server");
        }
    } catch (error) {
        console.error("Error registering user:", error);
        alert(`Registration failed: ${error.message}`);
        return false;
    }
}

async function loginUser(username, password) {
    try {
        const response = await fetch(`${SERVER_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: username,
                password: password,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(
                `HTTP error! status: ${response.status} - ${errorData}`
            );
        }

        const data = await response.json();
        console.log("Login successful:", data);

        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", username);
            current_username = username;
            console.log("Current username set to:", current_username);
             usernameDisplay.textContent = current_username
                ? `@${current_username}`
                : "@Guest";
            if (!current_username) {
                logoutBtn.style.display = "none";
            } else {
                logoutBtn.style.display = "inline-block";
            }
            hideLoginModal();
            return true;
        } else {
            throw new Error("No token received from server");
        }
    } catch (error) {
        console.error("Error logging in user:", error);
        alert(`Login failed: ${error.message}`);
        return false;
    }
}

function setupModalEventListeners() {
    closeBtn.addEventListener("click", hideMarkerModal);
    cancelBtn.addEventListener("click", hideMarkerModal);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            hideMarkerModal();
        }
    });

    const loginModal = document.getElementById("loginModal");
    const loginCloseBtn = loginModal.querySelector(".close");
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const usernameInput = document.getElementById("modalUsername");
    const passwordInput = document.getElementById("modalPassword");

    if (loginCloseBtn) {
        loginCloseBtn.addEventListener("click", hideLoginModal);
    }

    if (loginBtn) {
        loginBtn.addEventListener("click", async () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                alert("Username and password cannot be empty.");
                return;
            }

            await loginUser(username, password);
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener("click", async () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                alert("Username and password cannot be empty.");
                return;
            }

            await registerUser(username, password);
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                passwordInput.focus();
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                loginBtn.click();
            }
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && loginModal.classList.contains("show")) {
            hideLoginModal();
        }
    });

    addBtn.addEventListener("click", async () => {
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();

        if (!name || !description) {
            alert("Marker name and description cannot be empty.");
            return;
        }

        if (currentMarkerPosition) {
            const { lat, lon } = currentMarkerPosition;

            addMarker(
                lat,
                lon,
                `<b>${name}</b><br>Coordinates: ${lat}, ${lon}<br>${description}`,
                name,
                false
            );

            const markerData = {
                name: name,
                description: description,
                latitude: parseFloat(lat),
                longitude: parseFloat(lon),
            };

            await sendMarkerData(markerData);
        }

        hideMarkerModal();
    });

    nameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            descriptionInput.focus();
        }
    });

    descriptionInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            addBtn.click();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("show")) {
            hideMarkerModal();
        }
    });
}

function deleteMarkerById(id) {
    try {
        fetch(`${SERVER_URL}/points/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("token", ""),
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log(`Marker with ID ${id} deleted successfully`);
                removeMarkerById(id);
            })
            .catch((error) => {
                console.error(`Error deleting marker with ID ${id}:`, error);
            });
    } catch (error) {
        console.error("Error in deleteMarkerById function:", error);
        console.error("Parameters:", { id });
    }
}

function logout() {
    try {
        fetch(`${SERVER_URL}/auth/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("token", ""),
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log("Logout successful");
                localStorage.removeItem("token");
                localStorage.removeItem("username");
                usernameDisplay.textContent = "@Guest";
                logoutBtn.style.display = "none";
                current_username = "";
                showLoginModal();
            })
            .catch((error) => {
                console.error("Error during logout:", error);
            });
    } catch (error) {
        console.error("Error in logout function:", error);
    }
}

function addMarker(id, lat, lon, popupText, tooltip, skipViewReset = false) {
    try {
        if (!map) {
            console.warn("Map not yet initialized, cannot add marker");
            return false;
        }
        var newMarker = L.marker([lat, lon], { id: id });
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
        if (!skipViewReset) {
            map.setView([lat, lon], map.getZoom());
        }
        return newMarker;
    } catch (error) {
        console.error("Error in addMarker function:", error);
        console.error("Parameters:", {
            lat,
            lon,
            popupText,
            tooltip,
            skipViewReset,
        });
        return false;
    }
}

function removeMarkerById(id) {
    try {
        if (!map) {
            console.warn("Map not yet initialized, cannot remove marker");
            return false;
        }

        let markerFound = false;
        map.eachLayer(function (layer) {
            if (layer instanceof L.Marker && layer.options.id === id) {
                map.removeLayer(layer);
                markerFound = true;
                console.log(`Marker with ID ${id} removed successfully`);
            }
        });

        if (!markerFound) {
            console.warn(`Marker with ID ${id} not found`);
        }

        return markerFound;
    } catch (error) {
        console.error("Error in removeMarkerById function:", error);
        console.error("Parameters:", { id });
        return false;
    }
}

// ty stack overflow
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
    if (!map) {
        return 0;
    }
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

function initializeUser() {
    console.log("Initializing user...");
    const storedUsername = localStorage.getItem("username");
    const token = localStorage.getItem("token");

    console.log("Stored username:", storedUsername);
    console.log("Token exists:", !!token);

    usernameDisplay.textContent = storedUsername
        ? `@${storedUsername}`
        : "@Guest";
    if (!storedUsername) {
        logoutBtn.style.display = "none";
    } else {
        logoutBtn.style.display = "inline-block";
    }

    if (storedUsername && token) {
        current_username = storedUsername;
        console.log("Loaded username from localStorage:", current_username);
    } else {
        localStorage.removeItem("username");
        localStorage.removeItem("token");
        current_username = "";
        console.log("No valid auth found, will show login modal");

        showLoginModal();
    }
}

function isAuthenticated() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    return token && username && current_username;
}

function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    current_username = "";
    console.log("User logged out");
    showLoginModal();
}

function main() {
    map = L.map("map", { preferCanvas: true }).setView([42.318, -71.0089], 18);

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

    polygon = L.polygon(ISLAND_POLYGON, { color: "transparent" }).addTo(map);

    map.on("click", function (e) {
        onMapClick(e);
    });

    setupModalEventListeners();
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

    if (!isAuthenticated()) {
        showLoginModal();
        return;
    }

    showMarkerModal(lat, lon);
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Content Loaded");
    initializeUser();
    main();

    setTimeout(() => {
        const modal = document.getElementById("loginModal");
        console.log("Modal element found:", !!modal);
        if (modal) {
            console.log("Modal classes:", modal.className);
        }
    }, 500);
});

socket.on("connect", () => {
    socket.on("NEW_POINT", (point) => {
        console.log("New point received:", point);
        var btn =
            point.createdBy == current_username
                ? `<button onclick=deleteMarkerById(${point.id}) class="delete-btn"></button>`
                : "";
        addMarker(
            point.id,
            point.latitude,
            point.longitude,
            `${btn}<b>${point.name}</b><br>Coordinates: ${point.latitude}, ${point.longitude}<br>Created by: ${point.createdBy}<br>${point.description}`,
            point.name,
            true
        );
    });

    socket.on("REMOVE_POINT", (pointId) => {
        console.log("Remove point received:", pointId);
        removeMarkerById(pointId);
    });

    socket.on("READY", (points) => {
        points.forEach((point) => {
            console.log("Received point:", point);
            var btn =
                point.createdBy == current_username
                    ? `<button onclick=deleteMarkerById(${point.id}) class="delete-btn">🗑️</button>`
                    : "";
            addMarker(
                point.id,
                point.latitude,
                point.longitude,
                `${btn}<b>${point.name}</b><br>Coordinates: ${point.latitude}, ${point.longitude}<br>Created by: ${point.createdBy}<br>${point.description}`,
                point.name,
                true
            );
        });
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from server");
    });
});
