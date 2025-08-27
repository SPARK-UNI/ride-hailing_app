// Map-related functionality

// Global map variables
let map;
let currentRoute = null;
let startMarker = null;
let endMarker = null;
let animatedRoutePolyline = null;
let tempMarkers = [];

// Ensure minimal app-level globals exist (fallbacks when not provided by app.js)
if (typeof routePoints === 'undefined') window.routePoints = [];
if (typeof bookingState === 'undefined') window.bookingState = 'idle';
if (typeof CONFIG === 'undefined') window.CONFIG = {
    map: {
        defaultCenter: [10.762622, 106.660172],
        defaultZoom: 13,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
};

// Custom map icons
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

/**
 * Initialize the map
 */
function initializeMap() {
    map = L.map('map').setView(CONFIG.map.defaultCenter, CONFIG.map.defaultZoom);
    L.tileLayer(CONFIG.map.tileLayer).addTo(map);
    
    // Add click event listener for map
    map.on('click', handleMapClick);
}

/**
 * Handle map click events for route selection
 */
async function handleMapClick(e) {
    if (bookingState === 'finding' || bookingState === 'confirmed') return;
    
    if (bookingState !== 'idle') { 
        clearAll(); 
    }
    
    routePoints.push({latlng: e.latlng});
    const address = await reverseGeocode(e.latlng);
    routePoints[routePoints.length - 1].address = address;

    if (routePoints.length === 1) {
        const tempMarker = L.marker(e.latlng, { icon: greenIcon }).addTo(map);
        tempMarkers.push(tempMarker);
        document.getElementById('startLocation').value = address;
        tempMarker.bindPopup(`<b>Điểm đón:</b><br>${address}<br><i>Click chọn điểm đến.</i>`, { 
            autoClose: false, 
            closeOnClick: false 
        }).openPopup();
    } else if (routePoints.length === 2) {
        const tempMarker = L.marker(e.latlng, { icon: redIcon }).addTo(map);
        tempMarkers.push(tempMarker);
        document.getElementById('endLocation').value = address;
        tempMarker.bindPopup(`<b>Điểm đến:</b><br>${address}`, { 
            autoClose: false, 
            closeOnClick: false 
        }).openPopup();
        
        initiateRouteFinding(routePoints[0], routePoints[1]);
        routePoints = [];
    }
}

/**
 * Create route info HTML display
 */
function getRouteInfoHTML(distance, timeInfo, fareInfo) { 
    return `
        <div class="route-summary">
            <div class="info-box">
                <div class="label">⏱️ Thời gian</div>
                <div class="value">~${timeInfo.totalTime} phút</div>
            </div>
            <div class="info-box">
                <div class="label">📏 Khoảng cách</div>
                <div class="value">${distance.toFixed(1)} km</div>
            </div>
            <div class="info-box traffic-status">
                 <span style="font-size: 20px;">${timeInfo.condition.icon}</span>
                 <span class="value" style="color: ${timeInfo.condition.color};">${timeInfo.condition.text}</span>
            </div>
        </div>
        <div class="fare-details">
            <div class="label">Giá cước dự kiến</div>
            <div class="price">${fareInfo.totalFare.toLocaleString('vi-VN')} VNĐ</div>
            <div class="breakdown">
                <em style="opacity: 0.8;">*Giá cuối cùng có thể thay đổi một chút.</em>
            </div>
        </div>
    `;
}

/**
 * Clear all map markers and routes
 */
function clearMapElements() {
    if (currentRoute) map.removeLayer(currentRoute);
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    if (animatedRoutePolyline) map.removeLayer(animatedRoutePolyline);
    
    tempMarkers.forEach(marker => map.removeLayer(marker));
    tempMarkers = [];
    
    currentRoute = null;
    startMarker = null;
    endMarker = null;
    animatedRoutePolyline = null;
}

// Provide clearAll alias used elsewhere
function clearAll() {
    clearMapElements();
    routePoints = [];
    bookingState = 'idle';
    const elStart = document.getElementById('startLocation');
    const elEnd = document.getElementById('endLocation');
    const elInfo = document.getElementById('routeInfo');
    if (elStart) elStart.value = '';
    if (elEnd) elEnd.value = '';
    if (elInfo) elInfo.innerHTML = '';
}

/**
 * Set vehicle type and refresh route if needed
 */
function setVehicleType(type) {
    currentVehicle = type;
    if (currentRoute) {
        refreshTraffic();
    }
}

/**
 * Refresh traffic information
 */
function refreshTraffic() {
    if (currentRoute && startMarker && endMarker) {
        initiateRouteFinding(
            {latlng: startMarker.getLatLng(), address: document.getElementById('startLocation').value},
            {latlng: endMarker.getLatLng(), address: document.getElementById('endLocation').value}
        );
    }
}

// Fallback reverse geocode if app doesn't provide one
async function reverseGeocode(latlng) {
    try {
        const lat = latlng.lat ?? latlng[0];
        const lon = latlng.lng ?? latlng[1];
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'RideMap/1.0' } });
        if (!res.ok) throw new Error('Geocode failed');
        const data = await res.json();
        return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    } catch (err) {
        return `${(latlng.lat ?? latlng[0]).toFixed(5)}, ${(latlng.lng ?? latlng[1]).toFixed(5)}`;
    }
}

// Basic initiateRouteFinding fallback (uses OSRM public server)
async function initiateRouteFinding(start, end) {
    if (!map) return console.warn('Map not initialized');
    bookingState = 'finding';
    try {
        clearMapElements();

        const a = start.latlng;
        const b = end.latlng;
        const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const json = await res.json();
        if (!json.routes || !json.routes.length) throw new Error('No route');

        const route = json.routes[0];
        const distanceMeters = route.distance;
        const durationSec = route.duration;
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]); // to [lat,lng]

        // Draw polyline
        const poly = L.polyline(coords, { color: '#007bff', weight: 5 }).addTo(map);
        currentRoute = poly;

        // Add start/end markers
        startMarker = L.marker([a.lat, a.lng], { icon: greenIcon }).addTo(map);
        endMarker = L.marker([b.lat, b.lng], { icon: redIcon }).addTo(map);

        // Fit view
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds.pad(0.2));

        // Simple fare calculation
        const km = distanceMeters / 1000;
        const rates = {
            motorbike: { base: 12000, perKm: 2500 },
            car: { base: 15000, perKm: 4000 }
        };
        const rate = rates[currentVehicle] || rates.motorbike;
        const totalFare = Math.round(rate.base + (rate.perKm * km));

        const timeMinutes = Math.max(1, Math.round(durationSec / 60));
        // Simple traffic condition heuristic
        const avgSpeedKph = (km / (durationSec / 3600)) || 0;
        const condition = avgSpeedKph < 15 ? { text: 'Tắc nghẽn', color: 'crimson', icon: '⚠️' } :
                          avgSpeedKph < 35 ? { text: 'Kẹt nhẹ', color: 'orange', icon: '🚧' } :
                          { text: 'Lưu thông tốt', color: 'green', icon: '🟢' };

        const timeInfo = { totalTime: timeMinutes, condition };
        const fareInfo = { totalFare };

        // Show route info
        const container = document.getElementById('routeInfo');
        if (container) container.innerHTML = getRouteInfoHTML(km, timeInfo, fareInfo);

        bookingState = 'confirmed';
    } catch (err) {
        console.error('Route error', err);
        bookingState = 'idle';
    }
}