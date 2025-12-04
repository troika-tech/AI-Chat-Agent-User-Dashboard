// ============================================
// BACKEND CONFIGURATION
// ============================================
// To switch backends, simply change the BACKEND_MODE value below
// Options: 'NEW', 'OLD', 'LOCALHOST'

const BACKEND_MODE = 'NEW'; // Change to 'NEW' for new backend, 'LOCALHOST' for local testing

// API URLs
const BACKEND_URLS = {
  NEW: 'https://chat-apiv3.0804.in',           // New backend (Chat-Agent-Backend-V3)
  OLD: 'https://api.0804.in',      // Old backend (chatbot-backend-old on port 5001)
  LOCALHOST: 'http://localhost:5000'      // Local development (new backend)
};

// ============================================
// DO NOT MODIFY BELOW THIS LINE
// ============================================

// Validate backend mode
if (!BACKEND_URLS[BACKEND_MODE]) {
  console.error(`Invalid BACKEND_MODE: ${BACKEND_MODE}. Must be one of: NEW, OLD, LOCALHOST`);
  throw new Error(`Invalid BACKEND_MODE: ${BACKEND_MODE}`);
}

// Export the selected URL
export const API_BASE_URL = BACKEND_URLS[BACKEND_MODE];

// Export current mode for debugging
export const CURRENT_BACKEND_MODE = BACKEND_MODE;

// Demo mode (kept for compatibility, always false)
export const DEMO_MODE = false;

// Log current configuration (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('='.repeat(60));
  console.log('🔧 API Configuration');
  console.log('='.repeat(60));
  console.log(`Backend Mode: ${BACKEND_MODE}`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('='.repeat(60));
}

export default {
  API_BASE_URL,
  BACKEND_MODE,
  BACKEND_URLS,
  CURRENT_BACKEND_MODE,
  DEMO_MODE,
};
