import QRCode from 'qrcode';

/**
 * QR Code Generator Utility
 * Generates QR codes with customer data for verification
 * 
 * Design Decisions:
 * 1. Encodes critical data: customerId + queueNumber
 * 2. Returns base64 data URL for direct frontend rendering
 * 3. High error correction level (H) - up to 30% damage tolerance
 * 4. Optimal size for mobile scanning (300x300)
 * 
 * Interview Talking Points:
 * - Why base64? Eliminates need for separate file storage and CDN
 * - Error correction: Ensures QR works even if partially damaged/dirty
 * - Security: Can add digital signature in production (HMAC/JWT)
 * - Scalability: Consider moving to separate microservice for high load
 * 
 * @param {Object} data - Customer data to encode
 * @returns {Promise<string>} Base64 QR code data URL
 */

export const generateQRCode = async (data) => {
  try {
    // Prepare QR code payload
    // In production, consider adding:
    // - Timestamp for expiry validation
    // - Digital signature (HMAC) for tamper detection
    // - Encrypted data for sensitive information
    const qrPayload = JSON.stringify({
      customerId: data.customerId,
      queueNumber: data.queueNumber,
      timestamp: new Date().toISOString(), // For future expiry checks
      // signature: generateHMAC(data) // Add in production
    });

    // QR Code generation options
    const options = {
      errorCorrectionLevel: 'H', // High (30% error tolerance)
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300, // Optimal for mobile scanning
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    // Generate QR code as base64 data URL
    // Format: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
    const qrCodeDataURL = await QRCode.toDataURL(qrPayload, options);

    return qrCodeDataURL;

  } catch (error) {
    console.error('QR Code Generation Error:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Decode QR Code Data
 * Parses QR code payload and validates structure
 * 
 * @param {string} qrData - Raw QR code data
 * @returns {Object} Parsed customer data
 */
export const decodeQRData = (qrData) => {
  try {
    const parsedData = JSON.parse(qrData);

    // Validate required fields
    if (!parsedData.customerId || !parsedData.queueNumber) {
      throw new Error('Invalid QR code: Missing required fields');
    }

    // Additional validations
    if (!parsedData.customerId.match(/^SM-\d+$/)) {
      throw new Error('Invalid customer ID format');
    }

    if (typeof parsedData.queueNumber !== 'number' || parsedData.queueNumber < 1) {
      throw new Error('Invalid queue number');
    }

    return parsedData;

  } catch (error) {
    console.error('QR Code Decode Error:', error);
    throw new Error('Invalid QR code format');
  }
};

/**
 * Validate QR Code Timestamp (Future Enhancement)
 * Checks if QR code is within valid time window
 * 
 * @param {string} timestamp - ISO timestamp from QR code
 * @param {number} expiryHours - Hours until expiry (default 24)
 * @returns {boolean} Whether QR code is still valid
 */
export const isQRCodeExpired = (timestamp, expiryHours = 24) => {
  const qrTime = new Date(timestamp);
  const now = new Date();
  const hoursDiff = (now - qrTime) / (1000 * 60 * 60);

  return hoursDiff > expiryHours;
};

/**
 * Generate HMAC Signature (Production Enhancement)
 * Adds cryptographic signature to prevent QR code tampering
 * 
 * Note: Requires crypto module and secret key
 * Implementation left for production deployment
 */
export const generateHMACSignature = (data, secretKey) => {
  // Implementation:
  // const crypto = require('crypto');
  // const hmac = crypto.createHmac('sha256', secretKey);
  // hmac.update(JSON.stringify(data));
  // return hmac.digest('hex');
  
  // Placeholder for now
  return 'signature_placeholder';
};
