/**
 * NFL STADIUM DATA - Phase 1 Weather Integration
 * Stadium locations and indoor/outdoor status for weather analysis
 */

const NFL_STADIUMS = {
    // AFC East
    'BUF': { name: 'Highmark Stadium', city: 'Orchard Park', state: 'NY', lat: 42.7738, lng: -78.7867, type: 'outdoor' },
    'MIA': { name: 'Hard Rock Stadium', city: 'Miami Gardens', state: 'FL', lat: 25.9580, lng: -80.2389, type: 'outdoor' },
    'NE': { name: 'Gillette Stadium', city: 'Foxborough', state: 'MA', lat: 42.0909, lng: -71.2643, type: 'outdoor' },
    'NYJ': { name: 'MetLife Stadium', city: 'East Rutherford', state: 'NJ', lat: 40.8135, lng: -74.0745, type: 'outdoor' },

    // AFC North
    'BAL': { name: 'M&T Bank Stadium', city: 'Baltimore', state: 'MD', lat: 39.2780, lng: -76.6227, type: 'outdoor' },
    'CIN': { name: 'Paycor Stadium', city: 'Cincinnati', state: 'OH', lat: 39.0955, lng: -84.5161, type: 'outdoor' },
    'CLE': { name: 'Cleveland Browns Stadium', city: 'Cleveland', state: 'OH', lat: 41.5061, lng: -81.6995, type: 'outdoor' },
    'PIT': { name: 'Heinz Field', city: 'Pittsburgh', state: 'PA', lat: 40.4468, lng: -80.0158, type: 'outdoor' },

    // AFC South
    'HOU': { name: 'NRG Stadium', city: 'Houston', state: 'TX', lat: 29.6847, lng: -95.4107, type: 'retractable' },
    'IND': { name: 'Lucas Oil Stadium', city: 'Indianapolis', state: 'IN', lat: 39.7601, lng: -86.1639, type: 'retractable' },
    'JAX': { name: 'TIAA Bank Field', city: 'Jacksonville', state: 'FL', lat: 30.3238, lng: -81.6374, type: 'outdoor' },
    'TEN': { name: 'Nissan Stadium', city: 'Nashville', state: 'TN', lat: 36.1665, lng: -86.7713, type: 'outdoor' },

    // AFC West
    'DEN': { name: 'Empower Field at Mile High', city: 'Denver', state: 'CO', lat: 39.7439, lng: -105.0201, type: 'outdoor' },
    'KC': { name: 'Arrowhead Stadium', city: 'Kansas City', state: 'MO', lat: 39.0489, lng: -94.4839, type: 'outdoor' },
    'LV': { name: 'Allegiant Stadium', city: 'Las Vegas', state: 'NV', lat: 36.0909, lng: -115.1833, type: 'indoor' },
    'LAC': { name: 'SoFi Stadium', city: 'Los Angeles', state: 'CA', lat: 33.9535, lng: -118.3392, type: 'outdoor' },

    // NFC East
    'DAL': { name: 'AT&T Stadium', city: 'Arlington', state: 'TX', lat: 32.7473, lng: -97.0945, type: 'retractable' },
    'NYG': { name: 'MetLife Stadium', city: 'East Rutherford', state: 'NJ', lat: 40.8135, lng: -74.0745, type: 'outdoor' },
    'PHI': { name: 'Lincoln Financial Field', city: 'Philadelphia', state: 'PA', lat: 39.9008, lng: -75.1675, type: 'outdoor' },
    'WAS': { name: 'FedExField', city: 'Landover', state: 'MD', lat: 38.9076, lng: -76.8645, type: 'outdoor' },

    // NFC North
    'CHI': { name: 'Soldier Field', city: 'Chicago', state: 'IL', lat: 41.8623, lng: -87.6167, type: 'outdoor' },
    'DET': { name: 'Ford Field', city: 'Detroit', state: 'MI', lat: 42.3400, lng: -83.0456, type: 'indoor' },
    'GB': { name: 'Lambeau Field', city: 'Green Bay', state: 'WI', lat: 44.5013, lng: -88.0622, type: 'outdoor' },
    'MIN': { name: 'U.S. Bank Stadium', city: 'Minneapolis', state: 'MN', lat: 44.9738, lng: -93.2581, type: 'indoor' },

    // NFC South
    'ATL': { name: 'Mercedes-Benz Stadium', city: 'Atlanta', state: 'GA', lat: 33.7555, lng: -84.4006, type: 'retractable' },
    'CAR': { name: 'Bank of America Stadium', city: 'Charlotte', state: 'NC', lat: 35.2258, lng: -80.8533, type: 'outdoor' },
    'NO': { name: 'Caesars Superdome', city: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0812, type: 'indoor' },
    'TB': { name: 'Raymond James Stadium', city: 'Tampa', state: 'FL', lat: 27.9759, lng: -82.5033, type: 'outdoor' },

    // NFC West
    'ARI': { name: 'State Farm Stadium', city: 'Glendale', state: 'AZ', lat: 33.5276, lng: -112.2626, type: 'retractable' },
    'LAR': { name: 'SoFi Stadium', city: 'Los Angeles', state: 'CA', lat: 33.9535, lng: -118.3392, type: 'outdoor' },
    'SF': { name: 'Levi\'s Stadium', city: 'Santa Clara', state: 'CA', lat: 37.4032, lng: -121.9696, type: 'outdoor' },
    'SEA': { name: 'Lumen Field', city: 'Seattle', state: 'WA', lat: 47.5952, lng: -122.3316, type: 'outdoor' }
};

/**
 * Weather Impact Factors for Prediction Adjustments
 */
const WEATHER_IMPACT_FACTORS = {
    // Temperature effects (Fahrenheit)
    temperature: {
        'extreme_cold': { threshold: 20, impact: -8, description: 'Extreme cold affects ball handling and kicking' },
        'cold': { threshold: 32, impact: -4, description: 'Cold weather reduces offensive efficiency' },
        'hot': { threshold: 85, impact: -3, description: 'High heat increases fatigue' },
        'extreme_heat': { threshold: 100, impact: -6, description: 'Extreme heat significantly impacts performance' }
    },

    // Wind effects (mph)
    wind: {
        'light': { threshold: 10, impact: 0, description: 'Light wind has minimal impact' },
        'moderate': { threshold: 15, impact: -2, description: 'Moderate wind affects passing game' },
        'strong': { threshold: 25, impact: -6, description: 'Strong wind significantly impacts passing' },
        'extreme': { threshold: 35, impact: -12, description: 'Extreme wind favors running game heavily' }
    },

    // Precipitation effects
    precipitation: {
        'none': { impact: 0, description: 'Clear conditions' },
        'light_rain': { impact: -2, description: 'Light rain affects ball handling' },
        'rain': { impact: -5, description: 'Rain significantly affects passing and ball security' },
        'heavy_rain': { impact: -8, description: 'Heavy rain heavily favors running game' },
        'snow': { impact: -6, description: 'Snow affects visibility and footing' },
        'heavy_snow': { impact: -10, description: 'Heavy snow creates challenging conditions' }
    }
};

/**
 * Get stadium information for a team
 */
function getStadiumInfo(teamAbbr) {
    return NFL_STADIUMS[teamAbbr] || null;
}

/**
 * Check if stadium is affected by weather
 */
function isOutdoorStadium(teamAbbr) {
    const stadium = NFL_STADIUMS[teamAbbr];
    return stadium && (stadium.type === 'outdoor' || stadium.type === 'retractable');
}

/**
 * Get weather impact factors
 */
function getWeatherImpactFactors() {
    return WEATHER_IMPACT_FACTORS;
}

// Make available globally
window.NFL_STADIUMS = NFL_STADIUMS;
window.WEATHER_IMPACT_FACTORS = WEATHER_IMPACT_FACTORS;
window.getStadiumInfo = getStadiumInfo;
window.isOutdoorStadium = isOutdoorStadium;
window.getWeatherImpactFactors = getWeatherImpactFactors;