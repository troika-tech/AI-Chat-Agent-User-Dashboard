/**
 * API Configuration
 *
 * This file manages all API endpoint configurations for the User Dashboard.
 *
 * IMPORTANT: Toggle between environments by changing the 'environment' value below.
 *
 * SETUP INSTRUCTIONS:
 * 1. For LOCAL DEVELOPMENT: Set environment to 'local'
 * 2. For PRODUCTION: Set environment to 'production'
 * 3. Update the URLs below if your backend is hosted elsewhere
 *
 * DEMO MODE:
 * - Set demoMode to true to use mock data without hitting the backend
 * - Useful for UI development and testing without a running backend
 */

const config = {
  // ============================================
  // TOGGLE THIS VALUE TO SWITCH ENVIRONMENTS
  // ============================================
  // Options: 'local' | 'production'
  environment: 'production',

  // ============================================
  // API BACKEND URLS
  // ============================================
  urls: {
    // Local development backend
    local: 'http://localhost:5000',

    // Production/Live backend
    production: 'https://api.0804.in',
  },

  // ============================================
  // DEMO MODE (Mock Data for Chat Agent Dashboard)
  // ============================================
  // ⚠️ IMPORTANT: When converting from calling to chat agent dashboard
  // Set to true to use mock/demo data without hitting the backend
  // Set to false to connect to real backend API
  // 
  // When demoMode is true:
  // - All API calls return mock data
  // - No actual backend requests are made
  // - Perfect for UI development and testing
  // - Useful for converting calling agent → chat agent with demo data
  demoMode: false,
};

// ============================================
// EXPORTS - Don't modify below this line
// ============================================

// Get the current API URL based on environment
export const API_BASE_URL = config.urls[config.environment];

// Export demo mode setting
export const DEMO_MODE = config.demoMode;

// Export the full config for reference
export default config;

// Log configuration on first import (helps with debugging)
if (typeof window !== 'undefined' && !window.__API_CONFIG_LOGGED__) {
  window.__API_CONFIG_LOGGED__ = true;
  
  if (DEMO_MODE) {
    console.log('%c 🎭 DEMO MODE ENABLED ', 'background: #F59E0B; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 14px;');
    console.log('%c Using Mock Data - No Backend Connection ', 'background: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 4px;');
  } else {
    console.log('%c API Configuration Loaded ', 'background: #4F46E5; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  }
  
  console.log('  Environment:', config.environment);
  console.log('  Base URL:', API_BASE_URL);
  console.log('  Demo Mode:', DEMO_MODE ? '✅ ON (Mock Data)' : '❌ OFF (Real Backend)');
  console.log('  💡 To change: Edit src/config/api.config.js');
}
