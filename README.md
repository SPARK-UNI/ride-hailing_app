# RideMap - Ride Booking Application

A comprehensive ride booking web application with real-time traffic simulation, fare calculation, and driver tracking functionality.

## Features

- **Interactive Map Interface**: Click-to-select pickup/dropoff locations or search by address
- **Real-time Traffic Simulation**: Dynamic traffic conditions based on time of day and location
- **Multi-vehicle Support**: Choose between motorbike and car options
- **Fare Calculation**: Accurate pricing based on distance, vehicle type, and time of day
- **Driver Simulation**: Real-time driver spawning, selection, and movement animation
- **Payment Integration**: Multiple payment options (cash, e-wallet, card)
- **Trip Tracking**: Live trip status updates and driver information
- **Rating System**: Post-trip driver rating functionality

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js with OpenStreetMap tiles
- **APIs**: 
  - OpenStreetMap Nominatim (geocoding)
  - OSRM (routing)
- **Styling**: CSS Custom Properties, Flexbox, Grid

## File Structure

```
ridemap/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Application styles
├── js/
│   ├── config.js           # Configuration and constants
│   ├── utils.js            # Utility functions
│   ├── map.js              # Map-related functionality
│   ├── booking.js          # Booking and driver management
│   └── app.js              # Main application initialization
├── assets/
│   └── qr-placeholder.jpg  # QR code placeholder image
└── README.md               # This file
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ridemap.git
   cd ridemap
   ```

2. Create the assets directory and add a QR code placeholder image:
   ```bash
   mkdir assets
   # Add qr-placeholder.jpg to the assets folder
   ```

3. Serve the application using a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js http-server
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```

4. Open your browser and navigate to `http://localhost:8000`

## Usage

### Basic Booking Flow

1. **Select Vehicle**: Choose between motorbike or car
2. **Set Route**: Either:
   - Click two points on the map (pickup → destination)
   - Enter addresses in the input fields
3. **Review Details**: Check route info, travel time, and fare
4. **Choose Payment**: Select cash, e-wallet, or card payment
5. **Book Ride**: Click "Đặt Xe Ngay" to start driver search
6. **Track Driver**: Monitor driver arrival and trip progress
7. **Complete Trip**: Rate your driver after trip completion

### Advanced Features

- **Traffic Simulation**: The app simulates realistic traffic conditions based on:
  - Time of day (rush hour, normal, late night)
  - Area type (downtown, suburban, rural)
  - Random construction delays
  - Vehicle-specific speed characteristics

- **Dynamic Pricing**: Fare calculation includes:
  - Base fare by vehicle type
  - Distance-based tiered pricing
  - Night surcharges (10 PM - 6 AM)
  - Real-time traffic adjustments

## Configuration

### Vehicle Parameters

You can modify vehicle characteristics in `js/config.js`:

```javascript
vehicleParams: {
    motorbike: {
        baseSpeed: { downtown: 25, suburban: 40, rural: 55 },
        // ... other parameters
    },
    car: {
        baseSpeed: { downtown: 25, suburban: 65, rural: 80 },
        // ... other parameters
    }
}
```

### Fare Structure

Pricing can be adjusted in the `fareParams` section of `js/config.js`.

## API Dependencies

This application relies on free, public APIs:

- **OpenStreetMap Nominatim**: For address geocoding
- **OSRM**: For route calculation
- **OpenStreetMap**: For map tiles

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Development

### Adding New Features

1. **Map Features**: Extend `js/map.js`
2. **Booking Logic**: Modify `js/booking.js`
3. **Calculations**: Update utility functions in `js/utils.js`
4. **Styling**: Edit `css/styles.css`

### Code Structure

The application follows a modular architecture:

- **config.js**: Contains all configuration constants
- **utils.js**: Pure utility functions for calculations
- **map.js**: Map initialization and route handling
- **booking.js**: Driver simulation and booking workflow
- **app.js**: Application initialization and event binding

## Known Limitations

- Driver simulation is for demonstration purposes only
- Traffic data is simulated, not real-time
- Payment processing is UI-only (no actual transactions)
- Works best in Ho Chi Minh City area (coordinates optimized for this region)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Acknowledgments

- OpenStreetMap contributors for map data
- Leaflet.js for the mapping library
- OSRM project for routing services
- Nominatim for geocoding services