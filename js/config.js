// Application Configuration
const CONFIG = {
    // Map configuration
    map: {
        defaultCenter: [10.7769, 106.7009], // Ho Chi Minh City
        defaultZoom: 13,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    },

    // Vehicle parameters
    vehicleParams: {
        motorbike: { 
            baseSpeed: { 
                downtown: 25, 
                suburban: 40, 
                rural: 55 
            }, 
            trafficMultiplierFactors: { 
                rushHour: { 
                    downtown: 0.3, 
                    suburban: 0.5 
                }, 
                busy: { 
                    downtown: 0.55, 
                    suburban: 0.7 
                } 
            }, 
            stopAndGoPenalty: { 
                downtown: 60, 
                suburban: 30, 
                rural: 10 
            }, 
            realismMultiplier: 1.18, 
            name: "Xe máy" 
        },
        car: { 
            baseSpeed: { 
                downtown: 25, 
                suburban: 65, 
                rural: 80 
            }, 
            trafficMultiplierFactors: { 
                rushHour: { 
                    downtown: 0.2, 
                    suburban: 0.4 
                }, 
                busy: { 
                    downtown: 0.45, 
                    suburban: 0.6 
                } 
            }, 
            stopAndGoPenalty: { 
                downtown: 75, 
                suburban: 35, 
                rural: 5 
            }, 
            realismMultiplier: 1.25, 
            name: "Ô tô" 
        }
    },

    // Fare calculation parameters
    fareParams: {
        car: {
            tier1_km: 2,
            tier1_price: 30500,
            tier2_km: 12,
            tier2_rate: 15200,
            tier3_km: 25,
            tier3_rate: 14700,
            tier4_rate: 13300,
            night_surcharge: 20000
        },
        motorbike: {
            tier1_km: 2,
            tier1_price: 12200,
            tier2_rate: 4200,
            night_surcharge: 10000
        }
    },

    // API endpoints
    api: {
        geocoding: 'https://nominatim.openstreetmap.org/search',
        reverseGeocoding: 'https://nominatim.openstreetmap.org/reverse',
        routing: 'https://router.project-osrm.org/route/v1/driving',
        userAgent: 'RideMapApp/1.0'
    },

    // Driver names for simulation
    driverNames: [
        "Sơn Tùng", "Tấn Tài", "Hoàn Hảo", "Văn Nam", "Minh Hiếu", 
        "Nhật Minh", "Bảo Long", "Hoàng Nhi", "Thái Hà", "Khải Nghi"
    ],

    // City information for area calculation
    cityInfo: {
        hcm: {
            lat: 10.7769,
            lng: 106.7009,
            radius: 15
        }
    }
};