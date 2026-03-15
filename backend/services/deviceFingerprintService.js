/**
 * Device Fingerprinting and Geolocation Service
 * Tracks devices, locations, and implements velocity checks
 * Critical for fraud prevention and adaptive authentication
 */

const crypto = require('crypto');
const geoip = require('geoip-lite');

class DeviceFingerprintService {
  constructor() {
    this.deviceStore = new Map(); // In production, use database
    this.velocityWindow = 60 * 60 * 1000; // 1 hour
    this.maxTransactionsPerHour = 10;
    this.maxLocationChanges = 3; // Max location changes per hour
  }

  /**
   * Generate device fingerprint from request
   * @param {Object} req - Express request object
   * @returns {string} - Device fingerprint hash
   */
  generateFingerprint(req) {
    const components = {
      userAgent: req.headers['user-agent'] || '',
      acceptLanguage: req.headers['accept-language'] || '',
      acceptEncoding: req.headers['accept-encoding'] || '',
      platform: req.body?.deviceInfo?.platform || '',
      screenResolution: req.body?.deviceInfo?.screenResolution || '',
      timezone: req.body?.deviceInfo?.timezone || '',
      plugins: req.body?.deviceInfo?.plugins || [],
      canvas: req.body?.deviceInfo?.canvasFingerprint || '',
      webgl: req.body?.deviceInfo?.webglFingerprint || ''
    };

    // Create hash from components
    const fingerprintString = JSON.stringify(components);
    const hash = crypto
      .createHash('sha256')
      .update(fingerprintString)
      .digest('hex');

    return hash;
  }

  /**
   * Get geolocation from IP address
   * @param {string} ipAddress - IP address
   * @returns {Object} - Location data
   */
  getLocationFromIP(ipAddress) {
    // Remove IPv6 prefix if present
    const cleanIP = ipAddress.replace(/^::ffff:/, '');
    
    const geo = geoip.lookup(cleanIP);

    if (!geo) {
      return {
        ip: cleanIP,
        country: 'Unknown',
        city: 'Unknown',
        coordinates: null,
        timezone: null
      };
    }

    return {
      ip: cleanIP,
      country: geo.country,
      countryName: this.getCountryName(geo.country),
      city: geo.city || 'Unknown',
      region: geo.region,
      coordinates: {
        latitude: geo.ll[0],
        longitude: geo.ll[1]
      },
      timezone: geo.timezone
    };
  }

  /**
   * Get country name from code
   * @param {string} code - Country code
   * @returns {string}
   */
  getCountryName(code) {
    const countries = {
      'NG': 'Nigeria',
      'US': 'United States',
      'GB': 'United Kingdom',
      'GH': 'Ghana',
      'KE': 'Kenya',
      'ZA': 'South Africa'
      // Add more as needed
    };
    return countries[code] || code;
  }

  /**
   * Register or update device for user
   * @param {string} userId - User ID
   * @param {string} fingerprint - Device fingerprint
   * @param {Object} deviceInfo - Device information
   * @param {Object} location - Location data
   * @returns {Object}
   */
  async registerDevice(userId, fingerprint, deviceInfo, location) {
    const deviceKey = `${userId}_${fingerprint}`;
    const now = Date.now();

    const device = {
      userId,
      fingerprint,
      deviceInfo: {
        name: deviceInfo.name || 'Unknown Device',
        type: deviceInfo.type || 'web', // web, mobile, tablet
        os: deviceInfo.os || 'Unknown',
        browser: deviceInfo.browser || 'Unknown',
        ...deviceInfo
      },
      location,
      firstSeen: now,
      lastSeen: now,
      trusted: false,
      loginCount: 1,
      transactionCount: 0
    };

    // Check if device exists
    const existing = this.deviceStore.get(deviceKey);
    if (existing) {
      device.firstSeen = existing.firstSeen;
      device.loginCount = existing.loginCount + 1;
      device.transactionCount = existing.transactionCount;
      device.trusted = existing.trusted;
    }

    this.deviceStore.set(deviceKey, device);

    return {
      success: true,
      device,
      isNewDevice: !existing,
      message: existing ? 'Device updated' : 'New device registered'
    };
  }

  /**
   * Check if device is trusted
   * @param {string} userId - User ID
   * @param {string} fingerprint - Device fingerprint
   * @returns {boolean}
   */
  isDeviceTrusted(userId, fingerprint) {
    const deviceKey = `${userId}_${fingerprint}`;
    const device = this.deviceStore.get(deviceKey);
    
    if (!device) return false;

    // Auto-trust after 5 successful logins over 7 days
    const daysSinceFirstSeen = (Date.now() - device.firstSeen) / (1000 * 60 * 60 * 24);
    if (device.loginCount >= 5 && daysSinceFirstSeen >= 7) {
      device.trusted = true;
      this.deviceStore.set(deviceKey, device);
      return true;
    }

    return device.trusted;
  }

  /**
   * Mark device as trusted
   * @param {string} userId - User ID
   * @param {string} fingerprint - Device fingerprint
   * @returns {Object}
   */
  trustDevice(userId, fingerprint) {
    const deviceKey = `${userId}_${fingerprint}`;
    const device = this.deviceStore.get(deviceKey);

    if (!device) {
      return {
        success: false,
        error: 'Device not found'
      };
    }

    device.trusted = true;
    this.deviceStore.set(deviceKey, device);

    return {
      success: true,
      message: 'Device marked as trusted'
    };
  }

  /**
   * Velocity check - detect rapid transactions
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @returns {Object}
   */
  async checkVelocity(userId, action = 'transaction') {
    const now = Date.now();
    const windowStart = now - this.velocityWindow;

    // Get user's recent activity (from database in production)
    const recentActivity = this.getUserActivity(userId, windowStart);

    const violations = [];
    let blocked = false;

    // Check transaction velocity
    if (recentActivity.transactions >= this.maxTransactionsPerHour) {
      violations.push(`Too many transactions (${recentActivity.transactions}/${this.maxTransactionsPerHour} per hour)`);
      blocked = true;
    }

    // Check location changes
    if (recentActivity.locationChanges >= this.maxLocationChanges) {
      violations.push(`Suspicious location changes (${recentActivity.locationChanges} in 1 hour)`);
      blocked = true;
    }

    // Check for impossible travel
    if (recentActivity.impossibleTravel) {
      violations.push('Impossible travel detected');
      blocked = true;
    }

    return {
      passed: !blocked,
      blocked,
      violations,
      recentActivity,
      message: blocked 
        ? 'Velocity check failed - suspicious activity detected' 
        : 'Velocity check passed'
    };
  }

  /**
   * Get user activity in time window
   * @param {string} userId - User ID
   * @param {number} windowStart - Start timestamp
   * @returns {Object}
   */
  getUserActivity(userId, windowStart) {
    // Mock implementation - in production, query database
    return {
      transactions: 3,
      locationChanges: 1,
      impossibleTravel: false,
      devices: 1
    };
  }

  /**
   * Detect impossible travel
   * @param {Object} location1 - Previous location
   * @param {Object} location2 - Current location
   * @param {number} timeDiff - Time difference in milliseconds
   * @returns {boolean}
   */
  detectImpossibleTravel(location1, location2, timeDiff) {
    if (!location1?.coordinates || !location2?.coordinates) {
      return false;
    }

    // Calculate distance between coordinates (Haversine formula)
    const distance = this.calculateDistance(
      location1.coordinates.latitude,
      location1.coordinates.longitude,
      location2.coordinates.latitude,
      location2.coordinates.longitude
    );

    // Calculate required speed (km/h)
    const hours = timeDiff / (1000 * 60 * 60);
    const requiredSpeed = distance / hours;

    // Flag if speed > 800 km/h (faster than commercial flight)
    return requiredSpeed > 800;
  }

  /**
   * Calculate distance between two coordinates (Haversine)
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get all devices for user
   * @param {string} userId - User ID
   * @returns {Array}
   */
  getUserDevices(userId) {
    const devices = [];
    
    for (const [key, device] of this.deviceStore.entries()) {
      if (device.userId === userId) {
        devices.push({
          fingerprint: device.fingerprint,
          name: device.deviceInfo.name,
          type: device.deviceInfo.type,
          os: device.deviceInfo.os,
          browser: device.deviceInfo.browser,
          location: device.location,
          trusted: device.trusted,
          firstSeen: device.firstSeen,
          lastSeen: device.lastSeen,
          loginCount: device.loginCount
        });
      }
    }

    return devices;
  }

  /**
   * Remove device
   * @param {string} userId - User ID
   * @param {string} fingerprint - Device fingerprint
   * @returns {Object}
   */
  removeDevice(userId, fingerprint) {
    const deviceKey = `${userId}_${fingerprint}`;
    const deleted = this.deviceStore.delete(deviceKey);

    return {
      success: deleted,
      message: deleted ? 'Device removed' : 'Device not found'
    };
  }
}

module.exports = new DeviceFingerprintService();
