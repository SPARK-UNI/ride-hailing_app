// Utility functions for the ride booking app

/**
 * Geocode an address to coordinates
 */
async function geocode(address) {
    const url = `${CONFIG.api.geocoding}?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url, {
        headers: { 'User-Agent': CONFIG.api.userAgent }
    });
    
    if (!response.ok) {
        throw new Error(`Lỗi Geocoding: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.length === 0) {
        throw new Error(`Không tìm thấy địa chỉ: "${address}"`);
    }
    
    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
    };
}

/**
 * Reverse geocode coordinates to address
 */
async function reverseGeocode(latlng) {
    try {
        const url = `${CONFIG.api.reverseGeocoding}?format=json&lat=${latlng.lat}&lon=${latlng.lng}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': CONFIG.api.userAgent }
        });
        
        if (!response.ok) {
            throw new Error(`Lỗi Reverse Geocoding: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.display_name || `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
    } catch (error) {
        console.error("Reverse geocoding failed:", error);
        return `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
    }
}

/**
 * Get route between two points
 */
async function getRoute(startLatLng, endLatLng) {
    const url = `${CONFIG.api.routing}/${startLatLng.lng},${startLatLng.lat};${endLatLng.lng},${endLatLng.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, {
        headers: { 'User-Agent': CONFIG.api.userAgent }
    });
    
    if (!response.ok) {
        throw new Error(`Lỗi tìm đường: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
        throw new Error('Không thể tìm thấy tuyến đường.');
    }
    
    return data.routes[0];
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Calculate fare based on distance and vehicle type
 */
function calculateFare(distance, vehicleType) {
    let baseFare = 0;
    const surcharges = {};
    const now = new Date();
    const hour = now.getHours();
    const params = CONFIG.fareParams[vehicleType];

    if (vehicleType === 'car') {
        if (distance <= params.tier1_km) {
            baseFare = params.tier1_price;
        } else if (distance <= params.tier2_km) {
            baseFare = params.tier1_price + (distance - params.tier1_km) * params.tier2_rate;
        } else if (distance <= params.tier3_km) {
            baseFare = params.tier1_price + (params.tier2_km - params.tier1_km) * params.tier2_rate + 
                      (distance - params.tier2_km) * params.tier3_rate;
        } else {
            baseFare = params.tier1_price + (params.tier2_km - params.tier1_km) * params.tier2_rate + 
                      (params.tier3_km - params.tier2_km) * params.tier3_rate + 
                      (distance - params.tier3_km) * params.tier4_rate;
        }
        
        if (hour >= 22 || hour < 6) {
            surcharges['Phụ phí đêm'] = params.night_surcharge;
        }
    } else {
        if (distance <= params.tier1_km) {
            baseFare = params.tier1_price;
        } else {
            baseFare = params.tier1_price + (distance - params.tier1_km) * params.tier2_rate;
        }
        
        if (hour >= 22 || hour < 6) {
            surcharges['Phụ phí đêm'] = params.night_surcharge;
        }
    }

    const totalSurcharges = Object.values(surcharges).reduce((sum, value) => sum + value, 0);
    
    return {
        baseFare: Math.round(baseFare),
        surcharges,
        totalFare: Math.round(baseFare + totalSurcharges)
    };
}

/**
 * Calculate real travel time considering traffic conditions
 */
function calculateRealTravelTime(coordinates, totalDistance, vehicleType) {
    const params = CONFIG.vehicleParams[vehicleType];
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    const STOP_AND_GO_PENALTY = params.stopAndGoPenalty;
    const REALISM_MULTIPLIER = params.realismMultiplier;
    
    let totalRollingTime = 0;
    let totalStopTime = 0;
    let segmentDetails = [];
    
    const step = Math.max(1, Math.floor(coordinates.length / 20));
    
    for (let i = 0; i < coordinates.length - step; i += step) {
        const startPoint = coordinates[i];
        const endPoint = coordinates[Math.min(i + step, coordinates.length - 1)];
        const segmentDistance = calculateDistance(startPoint[0], startPoint[1], endPoint[0], endPoint[1]);
        const midLat = (startPoint[0] + endPoint[0]) / 2;
        const midLng = (startPoint[1] + endPoint[1]) / 2;
        
        const speedInfo = calculateRealtimeSpeed(midLat, midLng, hour, minute, vehicleType);
        totalRollingTime += (segmentDistance / speedInfo.speed) * 60;
        totalStopTime += (segmentDistance * STOP_AND_GO_PENALTY[speedInfo.areaType]) / 60;
        
        segmentDetails.push({
            distance: segmentDistance,
            time: (segmentDistance / speedInfo.speed) * 60,
            area: speedInfo.areaType,
            condition: speedInfo.trafficCondition,
            underConstruction: speedInfo.underConstruction
        });
    }
    
    const finalTotalTime = (totalRollingTime + totalStopTime) * REALISM_MULTIPLIER;
    const avgSpeed = totalDistance > 0 ? totalDistance / (totalRollingTime / 60) : 0;
    
    return {
        totalTime: Math.round(finalTotalTime),
        avgSpeed: Math.round(avgSpeed * 10) / 10,
        condition: getMajorTrafficCondition(segmentDetails),
        breakdown: generateDetailedBreakdown(segmentDetails),
        timestamp: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    };
}

/**
 * Calculate realtime speed based on location and time
 */
function calculateRealtimeSpeed(lat, lng, hour, minute, vehicleType) {
    const params = CONFIG.vehicleParams[vehicleType];
    const currentTime = hour + minute / 60;
    
    let areaType = 'rural';
    for (const city in CONFIG.cityInfo) {
        const cityInfo = CONFIG.cityInfo[city];
        const distance = calculateDistance(lat, lng, cityInfo.lat, cityInfo.lng);
        
        if (distance <= cityInfo.radius * 0.3) {
            areaType = 'downtown';
            break;
        } else if (distance <= cityInfo.radius) {
            areaType = 'suburban';
        }
    }
    
    const baseSpeed = params.baseSpeed[areaType];
    let trafficMultiplier = 1.0;
    const rushFactors = params.trafficMultiplierFactors.rushHour;
    const busyFactors = params.trafficMultiplierFactors.busy;
    
    // Rush hour traffic
    if ((currentTime >= 7 && currentTime <= 9) || (currentTime >= 17 && currentTime <= 19)) {
        trafficMultiplier = areaType === 'downtown' ? rushFactors.downtown : rushFactors.suburban;
    }
    // Busy periods
    else if ((currentTime >= 6 && currentTime < 7) || (currentTime > 9 && currentTime < 11) || 
             (currentTime >= 13 && currentTime < 17) || (currentTime > 19 && currentTime <= 21)) {
        trafficMultiplier = areaType === 'downtown' ? busyFactors.downtown : busyFactors.suburban;
    }
    // Late night/early morning
    else if (currentTime >= 23 || currentTime < 6) {
        trafficMultiplier = 1.15;
    }
    
    const randomFactor = 0.95 + Math.random() * 0.1;
    const weekendMultiplier = (new Date()).getDay() === 0 ? 1.1 : 1.0;
    
    let constructionMultiplier = 1.0;
    let underConstruction = false;
    if ((areaType === 'downtown' || areaType === 'suburban') && Math.random() < 0.15) {
        constructionMultiplier = 0.5;
        underConstruction = true;
    }
    
    const finalSpeed = baseSpeed * trafficMultiplier * randomFactor * weekendMultiplier * constructionMultiplier;
    
    return {
        speed: Math.max(vehicleType === 'car' ? 5 : 7, Math.round(finalSpeed * 10) / 10),
        areaType,
        trafficCondition: getTrafficCondition(trafficMultiplier),
        underConstruction
    };
}

/**
 * Get traffic condition based on multiplier
 */
function getTrafficCondition(multiplier) {
    if (multiplier <= 0.4) return {text: 'Ùn tắc nghiêm trọng', color: '#dc3545', icon: '🔴'};
    if (multiplier <= 0.6) return {text: 'Ùn tắc', color: '#fd7e14', icon: '🟠'};
    if (multiplier <= 0.8) return {text: 'Chậm', color: '#f59e0b', icon: '🟡'};
    if (multiplier <= 1.1) return {text: 'Bình thường', color: '#22c55e', icon: '🟢'};
    return {text: 'Thông thoáng', color: '#14b8a6', icon: '🟢'};
}

/**
 * Get major traffic condition from segment details
 */
function getMajorTrafficCondition(segments) {
    if (segments.length === 0) return {text: 'Bình thường', color: '#22c55e', icon: '🟢'};
    
    const conditions = {};
    segments.forEach(seg => {
        const condition = seg.condition.text;
        if (!conditions[condition]) conditions[condition] = 0;
        conditions[condition] += seg.distance;
    });
    
    let majorCondition = Object.keys(conditions).reduce((a, b) => 
        conditions[a] > conditions[b] ? a : b
    );
    
    return segments.find(seg => seg.condition.text === majorCondition)?.condition;
}

/**
 * Generate detailed breakdown of route segments
 */
function generateDetailedBreakdown(segments) {
    const summary = {
        downtown: {distance: 0, time: 0, construction: false},
        suburban: {distance: 0, time: 0, construction: false},
        rural: {distance: 0, time: 0, construction: false}
    };
    
    segments.forEach(seg => {
        const area = seg.area;
        summary[area].distance += seg.distance;
        summary[area].time += seg.time;
        if (seg.underConstruction) summary[area].construction = true;
    });
    
    let breakdown = '';
    Object.keys(summary).forEach(area => {
        if (summary[area].distance > 0) {
            const data = summary[area];
            const speed = data.distance / (data.time / 60);
            const constructionIcon = data.construction ? ' 🚧' : '';
            const areaNames = {
                downtown: 'Trung tâm',
                suburban: 'Ngoại thành',
                rural: 'Nông thôn/Cao tốc'
            };
            
            breakdown += `${areaNames[area]}: ${data.distance.toFixed(1)}km (~${Math.round(speed)}km/h)${constructionIcon}<br>`;
        }
    });
    
    return breakdown.trim() || 'N/A';
}