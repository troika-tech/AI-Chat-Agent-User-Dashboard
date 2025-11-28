# API Configuration Guide

## Overview

All API configuration for the User Dashboard is now centralized in a single file:

📁 **`src/config/api.config.js`**

## Quick Start

### Switching Between Environments

Open `src/config/api.config.js` and change the `environment` value:

```javascript
const config = {
  environment: 'local',  // Change this to 'local' or 'production'
  // ...
};
```

**Options:**
- `'local'` - Use localhost backend (http://localhost:5000)
- `'production'` - Use live backend (https://api.0804.in)

### Customizing URLs

You can update the backend URLs in the same file:

```javascript
urls: {
  local: 'http://localhost:5000',      // Your local backend
  production: 'https://api.0804.in',   // Your production backend
}
```

### Demo Mode

To test the UI without a running backend, enable demo mode:

```javascript
demoMode: true,  // Shows mock data
```

## What Changed?

### Before ❌
- Environment variables scattered across multiple files
- Had to use `.env` file
- Hard to find and change API URLs
- Used `import.meta.env.VITE_API_URL` everywhere

### After ✅
- Single centralized config file
- Easy to toggle environments
- No `.env` file needed
- Clear documentation

## Files Updated

The following files were updated to use the new config:

1. ✅ `src/config/api.config.js` - Main config file (enhanced with docs)
2. ✅ `src/components/AdminCreditManagement.jsx` - Removed env usage
3. ✅ `src/components/Campaigns.jsx` - Removed env usage
4. ✅ `src/components/LiveStatus.jsx` - Removed env usage
5. ✅ `vite.config.js` - Removed define section
6. ✅ `.env` - Deprecated (can be deleted)

## How It Works

### 1. Import the Config

```javascript
import { API_BASE_URL } from '../config/api.config';
```

### 2. Use the Base URL

```javascript
const response = await fetch(`${API_BASE_URL}/api/v1/users`);
```

### 3. Console Logging

When the app loads, you'll see:

```
🔧 API Configuration Loaded
  Environment: local
  Base URL: http://localhost:5000
  Demo Mode: OFF (Real Backend)
  💡 To change: Edit src/config/api.config.js
```

## Best Practices

1. **Never hardcode URLs** - Always use `API_BASE_URL`
2. **Check the console** - Verify the correct URL is loaded on startup
3. **Use demo mode** - Great for UI development without backend
4. **Update both URLs** - Keep local and production URLs current

## Troubleshooting

### Issue: API calls failing

**Solution:** Check that `environment` in `api.config.js` matches your setup:
- Using local backend? Set to `'local'`
- Using production? Set to `'production'`

### Issue: Wrong URL being used

**Solution:** Check the console logs on app startup to see which URL is active

### Issue: Still seeing .env errors

**Solution:** You can safely delete the `.env` file - it's no longer used

## Migration Notes

If you're coming from the old setup:

1. ❌ **Don't use** `import.meta.env.VITE_API_URL` anymore
2. ❌ **Don't edit** `.env` file
3. ✅ **Do use** `import { API_BASE_URL } from '../config/api.config'`
4. ✅ **Do edit** `src/config/api.config.js`

## Need Help?

If you need to add a new backend URL or environment:

1. Open `src/config/api.config.js`
2. Add your new URL to the `urls` object
3. Update the `environment` value or add a new option
4. Follow the existing pattern

---

**Last Updated:** November 28, 2025
