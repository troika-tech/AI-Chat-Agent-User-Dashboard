# API Configuration Guide

## Overview

All API configuration for the User Dashboard is now centralized in a single file:

📁 **`src/config/api.config.js`**

## Quick Start

### Switching Between Backends

Open `src/config/api.config.js` and change the `BACKEND_MODE` value:

```javascript
const BACKEND_MODE = 'OLD';  // Change this to 'NEW', 'OLD', or 'LOCALHOST'
```

**Options:**
- `'OLD'` (default) - Use old backend (https://chat-apiv3.0804.in)
- `'NEW'` - Use new backend (https://chat-apiv3.in)
- `'LOCALHOST'` - Use localhost backend (http://localhost:5000)

### Customizing URLs

You can update the backend URLs in the same file:

```javascript
const BACKEND_URLS = {
  NEW: 'https://chat-apiv3.in',
  OLD: 'https://chat-apiv3.0804.in',
  LOCALHOST: 'http://localhost:5000'
};
```

## What Changed?

### Before ❌
- Environment variables via `.env` file
- Used `process.env.REACT_APP_BACKEND_MODE`
- Had to rebuild app to change backends
- Required `.env.example` and `.env` files

### After ✅
- Single centralized config file
- Easy to toggle backends by editing one line
- No `.env` file needed
- Built-in validation and error handling
- Development mode logging for debugging

## Configuration Details

### The Config File

Location: `src/config/api.config.js`

```javascript
// ============================================
// BACKEND CONFIGURATION
// ============================================
const BACKEND_MODE = 'OLD'; // Change to 'NEW', 'OLD', or 'LOCALHOST'

const BACKEND_URLS = {
  NEW: 'https://chat-apiv3.in',
  OLD: 'https://chat-apiv3.0804.in',
  LOCALHOST: 'http://localhost:5000'
};

// ============================================
// DO NOT MODIFY BELOW THIS LINE
// ============================================
```

### How It Works

1. **Validation** - The config validates the BACKEND_MODE on load
2. **URL Selection** - Automatically selects the correct URL based on mode
3. **Development Logging** - Shows current configuration in console (dev mode only)
4. **Exports** - Provides clean exports for use throughout the app

### Exported Values

```javascript
import { 
  API_BASE_URL,           // The selected backend URL
  CURRENT_BACKEND_MODE,   // Current mode ('NEW', 'OLD', or 'LOCALHOST')
  BACKEND_URLS,           // All available URLs
  DEMO_MODE               // Always false (kept for compatibility)
} from './config/api.config';
```

## Usage in Components

### 1. Import the Config

```javascript
import { API_BASE_URL } from '../config/api.config';
```

### 2. Use the Base URL

```javascript
const response = await fetch(`${API_BASE_URL}/api/user/analytics`);
```

### 3. Console Logging (Development Only)

When the app loads in development mode, you'll see:

```
============================================================
🔧 API Configuration
============================================================
Backend Mode: OLD
API Base URL: https://chat-apiv3.0804.in
============================================================
```

## Best Practices

1. **Never hardcode URLs** - Always use `API_BASE_URL`
2. **Check the console** - Verify the correct URL is loaded on startup (dev mode)
3. **Update URLs in one place** - All URLs defined in `api.config.js`
4. **Test before deploying** - Switch to target backend and test locally

## Deployment

### For Production (New Backend)

1. Open `src/config/api.config.js`
2. Change line 6:
   ```javascript
   const BACKEND_MODE = 'NEW';
   ```
3. Build the app:
   ```bash
   npm run build
   ```
4. Deploy the `dist` folder

### For Production (Old Backend)

1. Keep the default configuration:
   ```javascript
   const BACKEND_MODE = 'OLD';
   ```
2. Build and deploy as normal

### For Local Testing

1. Change to localhost mode:
   ```javascript
   const BACKEND_MODE = 'LOCALHOST';
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Issue: API calls failing

**Solution:** Check that `BACKEND_MODE` in `api.config.js` matches your setup:
- Using new backend? Set to `'NEW'`
- Using old backend? Set to `'OLD'`
- Testing locally? Set to `'LOCALHOST'`

### Issue: Wrong URL being used

**Solution:** 
1. Check the console logs on app startup (development mode)
2. Verify `BACKEND_MODE` value in `api.config.js`
3. Restart the dev server after making changes

### Issue: Invalid BACKEND_MODE error

**Solution:** 
- The `BACKEND_MODE` must be exactly `'NEW'`, `'OLD'`, or `'LOCALHOST'`
- Check for typos or extra spaces
- Value is case-sensitive

## Migration from Environment Variables

If you're migrating from the old `.env` setup:

1. ❌ **Don't use** `process.env.REACT_APP_*` anymore
2. ❌ **Don't create** `.env` or `.env.example` files
3. ❌ **Don't use** `import.meta.env.*` (except NODE_ENV)
4. ✅ **Do use** `import { API_BASE_URL } from '../config/api.config'`
5. ✅ **Do edit** `src/config/api.config.js` directly

### What to Delete

You can safely delete these files if they exist:
- `.env`
- `.env.example`
- `.env.local`
- `.env.production`

## Advanced Configuration

### Adding a New Backend

1. Open `src/config/api.config.js`
2. Add your URL to the `BACKEND_URLS` object:
   ```javascript
   const BACKEND_URLS = {
     NEW: 'https://chat-apiv3.in',
     OLD: 'https://chat-apiv3.0804.in',
     LOCALHOST: 'http://localhost:5000',
     STAGING: 'https://staging.chat-apiv3.in'  // New!
   };
   ```
3. Update the `BACKEND_MODE` to use it:
   ```javascript
   const BACKEND_MODE = 'STAGING';
   ```

### Conditional Configuration

The config automatically handles:
- ✅ Invalid mode detection with error messages
- ✅ Development-only console logging
- ✅ Type-safe exports

## Security Notes

- ✅ No sensitive data in environment variables
- ✅ No `.env` files to accidentally commit
- ✅ Easy to audit backend URLs in one file
- ✅ Built-in validation prevents typos

## Need Help?

Common tasks:

**Switch to new backend:**
```javascript
const BACKEND_MODE = 'NEW';
```

**Switch to old backend:**
```javascript
const BACKEND_MODE = 'OLD';
```

**Test locally:**
```javascript
const BACKEND_MODE = 'LOCALHOST';
```

**Add custom URL:**
1. Add to `BACKEND_URLS`
2. Update `BACKEND_MODE`
3. Restart dev server

---

**Last Updated:** December 4, 2025
**No Environment Variables Required** ✅
