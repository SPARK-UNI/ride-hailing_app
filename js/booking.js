// Booking-related functionality

// Booking state variables
let bookingState = 'idle';
let drivers = [];
let selectedDriver = null;
let driverAnimation = null;
let currentRating = 0;

/**
 * Find route by address input
 */
async function findRouteByAddress() {
    const startAddr = document.getElementById('startLocation').value;
    const endAddr = document.getElementById('endLocation').value;
    
    if (!startAddr || !endAddr) {
        alert('Vui lòng nhập cả điểm đi và điểm đến');
        return;
    }
    
    try {
        const [startData, endData] = await Promise.all([
            geocode(startAddr),
            geocode(endAddr)
        ]);
        
        const startPoint = {
            latlng: L.latLng(startData.lat, startData.lon),
            address: startAddr
        };
        const endPoint = {
            latlng: L.latLng(endData.lat, endData.lon),
            address: endAddr
        };
        
        initiateRouteFinding(startPoint, endPoint);
    } catch (error) {
        document.getElementById('routeInfo').innerHTML = 
            `<div class="error-info">❌ Lỗi: ${error.message}</div>`;
    }
}

/**
 * Initiate route finding process
 */
async function initiateRouteFinding(startPoint, endPoint) {
    // Clear temporary markers
    tempMarkers.forEach(marker => map.removeLayer(marker));
    tempMarkers = [];

    const routeInfo = document.getElementById('routeInfo');
    routeInfo.innerHTML = '<div class="loading">⏳ Đang tìm và tính toán...</div>';
    document.getElementById('trip-details-card').style.display = 'block';
    document.getElementById('driver-info-card').style.display = 'none';

    try {
        const routeData = await getRoute(startPoint.latlng, endPoint.latlng);
        const latLngs = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        const distance = (routeData.distance / 1000);

        // Clear existing route and markers
        if (currentRoute) map.removeLayer(currentRoute);
        currentRoute = L.polyline(latLngs, {
            color: '#3b82f6',
            weight: 7,
            opacity: 0.85
        }).addTo(map);
        currentRoute.routeDistance = distance;
        
        // Add start and end markers
        if (startMarker) map.removeLayer(startMarker);
        startMarker = L.marker(startPoint.latlng, { icon: greenIcon })
            .addTo(map)
            .bindPopup(`<b>Điểm đón:</b><br>${startPoint.address}`)
            .openPopup();
            
        if (endMarker) map.removeLayer(endMarker);
        endMarker = L.marker(endPoint.latlng, { icon: redIcon })
            .addTo(map)
            .bindPopup(`<b>Điểm đến:</b><br>${endPoint.address}`);
        
        // Fit map to route bounds
        map.fitBounds(currentRoute.getBounds(), { padding: [50, 50] });

        // Calculate time and fare
        const timeInfo = calculateRealTravelTime(latLngs, distance, currentVehicle);
        const fareInfo = calculateFare(distance, currentVehicle);
        routeInfo.innerHTML = getRouteInfoHTML(distance, timeInfo, fareInfo);
        
        // Show booking section
        document.getElementById('booking-section').style.display = 'block';
        document.getElementById('bookBtn').style.display = 'block';
        document.getElementById('initialBookingStatus').style.display = 'none';
        document.getElementById('payment-options').style.display = 'block';
        handlePaymentSelection('cash');
        bookingState = 'ready_to_book';
        
    } catch (error) {
        routeInfo.innerHTML = `<div class="error-info">❌ Lỗi: ${error.message}</div>`;
        document.getElementById('booking-section').style.display = 'none';
    }
}

/**
 * Handle booking button click
 */
function handleBookingClick() {
    if (bookingState === 'ready_to_book') {
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        if (paymentMethod === 'card') {
            if (!document.getElementById('card-number').value || 
                !document.getElementById('card-expiry').value || 
                !document.getElementById('card-cvv').value) {
                alert('Vui lòng điền đầy đủ thông tin thẻ.');
                return;
            }
        }
        confirmBooking();
    }
}

/**
 * Handle payment method selection
 */
function handlePaymentSelection(method) {
    const detailsDiv = document.getElementById('payment-details');
    const cardForm = document.getElementById('card-form');
    const walletQr = document.getElementById('wallet-qr');
    
    detailsDiv.style.display = 'block';
    
    if (method === 'card') {
        cardForm.style.display = 'block';
        walletQr.style.display = 'none';
    } else if (method === 'wallet') {
        cardForm.style.display = 'none';
        walletQr.style.display = 'block';
    } else {
        detailsDiv.style.display = 'none';
    }
}

/**
 * Confirm booking and start driver search
 */
function confirmBooking() {
    if (!startMarker) return;
    
    bookingState = 'finding';
    const bookingStatus = document.getElementById('initialBookingStatus');
    bookingStatus.innerHTML = '🔎 Đang tìm tài xế xung quanh bạn...';
    bookingStatus.style.display = 'block';
    document.getElementById('bookBtn').style.display = 'none';
    document.getElementById('payment-options').style.display = 'none';
    
    spawnDrivers(startMarker.getLatLng());
    
    setTimeout(() => { 
        if (bookingState === 'finding') {
            selectClosestDriver(startMarker.getLatLng());
        }
    }, 4000);
}

/**
 * Spawn nearby drivers for simulation
 */
function spawnDrivers(center) {
    clearDrivers();
    
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * 0.015;
        const driverLatLng = L.latLng(
            center.lat + distance * Math.cos(angle),
            center.lng + distance * Math.sin(angle)
        );
        
        const iconHTML = `<div class="driver-icon ${currentVehicle === 'car' ? 'driver-icon-car' : 'driver-icon-motorbike'}">${currentVehicle === 'car' ? '🚗' : '🏍️'}</div>`;
        
        const driverMarker = L.marker(driverLatLng, {
            icon: L.divIcon({
                html: iconHTML,
                className: 'driver-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);
        
        driverMarker.driverData = {
            name: CONFIG.driverNames[i % CONFIG.driverNames.length],
            distance: calculateDistance(center.lat, center.lng, driverLatLng.lat, driverLatLng.lng)
        };
        
        driverMarker.bindPopup(
            `Tài xế ${driverMarker.driverData.name}<br>Cách bạn: ${driverMarker.driverData.distance.toFixed(1)} km`
        );
        
        drivers.push(driverMarker);
    }
}

/**
 * Select the closest driver and start pickup animation
 */
async function selectClosestDriver(pickupLatLng) {
    if (drivers.length === 0) { 
        document.getElementById('initialBookingStatus').innerHTML = 
            'Rất tiếc, không có tài xế nào gần bạn.';
        setTimeout(resetBookingUI, 3000);
        return;
    }
    
    // Select closest driver
    selectedDriver = drivers.sort((a, b) => 
        a.driverData.distance - b.driverData.distance
    )[0];
    
    // Remove other drivers from map
    drivers.forEach(driver => {
        if (driver !== selectedDriver) map.removeLayer(driver);
    });
    
    selectedDriver.getPopup().close();
    L.DomUtil.addClass(selectedDriver._icon, 'selected-driver');
    
    // Show driver information
    document.getElementById('initialBookingStatus').style.display = 'none';
    const driverCard = document.getElementById('driver-info-card');
    document.getElementById('driver-name-display').textContent = selectedDriver.driverData.name;
    document.getElementById('vehicle-info-display').textContent = 
        `${CONFIG.vehicleParams[currentVehicle].name} - BS: 59-T1 ${Math.floor(10000 + Math.random() * 90000)}`;
    driverCard.style.display = 'block';
    
    try {
        const routeData = await getRoute(selectedDriver.getLatLng(), pickupLatLng);
        const latLngs = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        bookingState = 'confirmed';
        animateDriver(selectedDriver, latLngs, routeData.duration * 1000, true);
    } catch (error) {
        document.getElementById('trip-status-display').innerHTML = 
            `Lỗi khi tìm đường cho tài xế: ${error.message}`;
        setTimeout(resetBookingUI, 3000);
    }
}

/**
 * Animate driver movement
 */
function animateDriver(driver, routeLatLngs, duration, isPickupPhase) {
    if (driverAnimation) driverAnimation.stop();
    if (!routeLatLngs || routeLatLngs.length < 1) {
        console.error("Animation cancelled.");
        return;
    }
    
    let startTime = performance.now();
    let frame;
    
    // Show route on map
    if (animatedRoutePolyline) map.removeLayer(animatedRoutePolyline);
    animatedRoutePolyline = L.polyline(routeLatLngs, {
        color: isPickupPhase ? '#22c55e' : '#3b82f6',
        weight: isPickupPhase ? 5 : 7,
        opacity: 0.9,
        dashArray: isPickupPhase ? '5, 5' : null
    }).addTo(map);
    
    const tripStatusDisplay = document.getElementById('trip-status-display');

    function animationStep(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const currentIndex = Math.floor(progress * (routeLatLngs.length - 1));
        const currentPoint = routeLatLngs[currentIndex];

        if (isPickupPhase) {
            const remainingTime = Math.max(0, (duration - elapsedTime) / 1000 / 60).toFixed(0);
            tripStatusDisplay.innerHTML = 
                `✅ Tài xế đang đến, dự kiến tới trong <b>${remainingTime} phút</b>.`;
        }

        if (currentPoint) {
            driver.setLatLng(currentPoint);
            animatedRoutePolyline.setLatLngs(routeLatLngs.slice(currentIndex));
        }

        if (progress < 1) {
            frame = requestAnimationFrame(animationStep);
        } else {
            // Animation complete
            map.removeLayer(animatedRoutePolyline);
            animatedRoutePolyline = null;
            
            if (isPickupPhase) {
                tripStatusDisplay.innerHTML = `✅ Tài xế đã đến điểm đón!`;
                L.DomUtil.removeClass(driver._icon, 'selected-driver');
                document.getElementById('cancelBtn').style.display = 'none';
                
                setTimeout(() => {
                    if (bookingState !== 'confirmed') return;
                    
                    tripStatusDisplay.innerHTML = `👍 Đang thực hiện chuyến đi...`;
                    const mainTripLatLngs = currentRoute.getLatLngs().map(latlng => 
                        [latlng.lat, latlng.lng]
                    );
                    const timeInfo = calculateRealTravelTime(
                        mainTripLatLngs, 
                        currentRoute.routeDistance, 
                        currentVehicle
                    );
                    const mainTripDuration = timeInfo.totalTime * 60 * 1000;
                    
                    currentRoute.setStyle({ opacity: 0 });
                    animateDriver(driver, mainTripLatLngs, mainTripDuration, false);
                }, 5000);
            } else {
                tripStatusDisplay.innerHTML = `🏁 Chuyến đi đã hoàn tất.`;
                showRatingModal(selectedDriver.driverData.name);
            }
        }
    }
    
    frame = requestAnimationFrame(animationStep);
    driverAnimation = { stop: () => cancelAnimationFrame(frame) };
}

/**
 * Show rating modal after trip completion
 */
function showRatingModal(driverName) {
    bookingState = 'rating';
    document.getElementById('driver-name-rating').textContent = driverName;
    document.getElementById('rating-modal').style.display = 'flex';
    
    const stars = document.querySelectorAll('.rating-stars span');
    stars.forEach(star => {
        star.className = '';
        star.onclick = () => {
            currentRating = star.dataset.value;
            stars.forEach(s => 
                s.classList.toggle('selected', s.dataset.value <= currentRating)
            );
        };
    });
}

/**
 * Submit rating and reset app
 */
function submitRating() {
    document.getElementById('rating-modal').style.display = 'none';
    clearAll();
}

/**
 * Clear drivers from map
 */
function clearDrivers() {
    drivers.forEach(driver => map.removeLayer(driver));
    drivers = [];
}

/**
 * Reset booking UI to initial state
 */
function resetBookingUI() {
    bookingState = 'idle';
    document.getElementById('trip-details-card').style.display = 'none';
    document.getElementById('driver-info-card').style.display = 'none';
    document.getElementById('cancelBtn').style.display = 'block';
    document.getElementById('rating-modal').style.display = 'none';
}