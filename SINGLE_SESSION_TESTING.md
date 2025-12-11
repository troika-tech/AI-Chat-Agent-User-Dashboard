# Single-Session-Per-User Testing Guide

## How to Test

### Step 1: Open Two Browser Tabs/Windows
1. Open your application in **Tab 1** (e.g., `http://localhost:3000`)
2. Open the same application in **Tab 2** (same URL)

### Step 2: Login on Tab 1
1. In **Tab 1**, log in with your credentials
2. **Open Browser Console (F12)** in Tab 1
3. You should see:
   ```
   🔐 Login successful, user data: {...}
   🆔 Extracted user ID: 693a599dc928d2854da141ab
   ✅ Session initialized with ID: session_1234567890_abc123
   🔔 Broadcasting new login: {...}
   📡 Sent BroadcastChannel message: {...}
   📦 Updated localStorage key: user_session_new_login {...}
   ```

### Step 3: Login on Tab 2 (Same User)
1. In **Tab 2**, log in with the **SAME** user credentials
2. **Open Browser Console (F12)** in Tab 2
3. You should see the same login logs as Tab 1

### Step 4: Verify Tab 1 Logs Out
1. **Check Tab 1 Console** - You should see:
   ```
   📨 Received NEW_LOGIN event: {...}
   🚪 New login detected in another tab. Logging out current session...
   📊 Logout reason: {...}
   🚪 SessionListener: Logout callback triggered
   ```
2. **Tab 1 should automatically:**
   - Show a toast notification: "You have been logged out because you logged in on another tab."
   - Redirect to the login page
   - Clear all session data

### Step 5: Verify Tab 2 Remains Logged In
1. **Tab 2 should:**
   - Remain logged in
   - Show the dashboard
   - Continue working normally

## Troubleshooting

### If Tab 1 Doesn't Log Out:

1. **Check Browser Console (F12) on Tab 1:**
   - Look for `📨 Received NEW_LOGIN event` - if you don't see this, the message isn't being received
   - Look for `📦 Storage event received` - this is the fallback method
   - Check if there are any errors

2. **Check Browser Console (F12) on Tab 2:**
   - Look for `🔔 Broadcasting new login` - confirms the broadcast is sent
   - Look for `📡 Sent BroadcastChannel message` - confirms BroadcastChannel is working
   - Look for `📦 Updated localStorage key` - confirms storage fallback is working

3. **Verify User IDs Match:**
   - In Tab 1 console, check: `currentUserId` should match `incomingUserId`
   - In Tab 2 console, check: the `userId` being broadcast should match Tab 1's `currentUserId`

4. **Verify Session IDs Are Different:**
   - Tab 1's `currentSessionId` should be different from Tab 2's `incomingSessionId`
   - If they're the same, the logout won't trigger

5. **Check if BroadcastChannel is Supported:**
   - Open console and type: `typeof BroadcastChannel`
   - Should return `"function"` (not `"undefined"`)
   - If undefined, the storage fallback will be used

### Common Issues:

**Issue: "Login event ignored: sameSession: true"**
- **Cause**: Both tabs have the same session ID
- **Fix**: Clear localStorage and try again, or wait a moment for session IDs to update

**Issue: "Login event ignored: sameUser: false"**
- **Cause**: User IDs don't match (might be different format)
- **Fix**: Check console logs to see the actual user IDs being compared

**Issue: No logs at all**
- **Cause**: Console might be filtered or code not running
- **Fix**: 
  - Make sure console is showing all log levels
  - Check if the app is running the latest code
  - Refresh both tabs

## Expected Console Output

### Tab 1 (First Login):
```
🔐 Login successful, user data: {...}
🆔 Extracted user ID: 693a599dc928d2854da141ab
✅ Session initialized with ID: session_1234567890_abc123
🔔 Broadcasting new login: {userId: "693a599dc928d2854da141ab", sessionId: "session_1234567890_abc123"}
📡 Sent BroadcastChannel message: {...}
📦 Updated localStorage key: user_session_new_login {...}
👂 SessionListener: Setting up cross-tab login listener
👤 Current session info: {userId: "693a599dc928d2854da141ab", sessionId: "session_1234567890_abc123"}
```

### Tab 2 (Second Login - Same User):
```
🔐 Login successful, user data: {...}
🆔 Extracted user ID: 693a599dc928d2854da141ab
✅ Session initialized with ID: session_1234567891_xyz789
🔔 Broadcasting new login: {userId: "693a599dc928d2854da141ab", sessionId: "session_1234567891_xyz789"}
📡 Sent BroadcastChannel message: {...}
```

### Tab 1 (Receives Logout Signal):
```
📨 Received NEW_LOGIN event: {
  incomingUserId: "693a599dc928d2854da141ab",
  incomingSessionId: "session_1234567891_xyz789",
  currentUserId: "693a599dc928d2854da141ab",
  currentSessionId: "session_1234567890_abc123"
}
🚪 New login detected in another tab. Logging out current session...
📊 Logout reason: {
  sameUser: true,
  currentSessionId: "session_1234567890_abc123",
  incomingSessionId: "session_1234567891_xyz789"
}
🚪 SessionListener: Logout callback triggered
```

## Manual Testing Checklist

- [ ] Tab 1: Login successful
- [ ] Tab 1: Session ID created and logged
- [ ] Tab 1: Broadcast message sent
- [ ] Tab 2: Login successful (same user)
- [ ] Tab 2: Different session ID created
- [ ] Tab 2: Broadcast message sent
- [ ] Tab 1: Receives NEW_LOGIN event
- [ ] Tab 1: User IDs match
- [ ] Tab 1: Session IDs are different
- [ ] Tab 1: Logout callback triggered
- [ ] Tab 1: Redirected to login page
- [ ] Tab 1: Toast notification shown
- [ ] Tab 2: Remains logged in

## Browser Compatibility

- ✅ Chrome/Edge: Full support (BroadcastChannel + Storage events)
- ✅ Firefox: Full support (BroadcastChannel + Storage events)
- ✅ Safari: Full support (BroadcastChannel + Storage events)
- ⚠️ Older browsers: Storage events only (BroadcastChannel not supported)

