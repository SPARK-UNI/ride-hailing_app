// Main application initialization and global variables

let currentVehicle = 'motorbike';

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    initEventListeners();
    console.log('RideMap application initialized successfully');
});

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Vehicle type selection
    document.querySelectorAll('input[name="vehicle"]').forEach(radio => {
        radio.addEventListener('change', function() {
            setVehicleType(this.value);
        });
    });
    
    // Payment method selection
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function() {
            handlePaymentSelection(this.value);
        });
    });
}

/**
 * Set vehicle type and refresh calculations if needed
 */
function setVehicleType(type) {
    currentVehicle = type;
    console.log(`Vehicle type changed to: ${type}`);
    
    // If there's an existing route, refresh traffic calculations
    if (currentRoute) {
        refreshTraffic();
    }
}