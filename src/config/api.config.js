// API Configuration
// Change these values to switch between local and production environments

const config = {
  // Set to 'local' for development, 'production' for live
  environment: 'local',

  // API URLs
  urls: {
    local: 'http://localhost:5000',
    production: 'https://api.0804.in',
  },

  // Demo mode - set to true to use mock data without backend
  demoMode: false,
};

// Get the current API URL based on environment
export const API_BASE_URL = config.urls[config.environment];

// Export demo mode setting
export const DEMO_MODE = config.demoMode;

// Export the full config for reference
export default config;
