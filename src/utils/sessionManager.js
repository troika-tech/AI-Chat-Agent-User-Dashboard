/**
 * Session Manager for Single-Session-Per-User
 * 
 * This utility manages user sessions across browser tabs to ensure
 * only one active session per user at a time. When a user logs in
 * on a new tab, all other tabs with the same user are automatically logged out.
 */

// BroadcastChannel for cross-tab communication
let broadcastChannel = null;

// Initialize BroadcastChannel
const initBroadcastChannel = () => {
  if (typeof BroadcastChannel !== 'undefined' && !broadcastChannel) {
    broadcastChannel = new BroadcastChannel('user-session-channel');
  }
  return broadcastChannel;
};

/**
 * Generate a unique session ID
 */
export const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get current session ID from localStorage
 */
export const getCurrentSessionId = () => {
  return localStorage.getItem('sessionId');
};

/**
 * Get current user ID from localStorage
 * Normalizes the ID to string for consistent comparison
 */
export const getCurrentUserId = () => {
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const userObj = JSON.parse(user);
      const userId = userObj.id || userObj._id || null;
      // Normalize to string for consistent comparison
      return userId ? String(userId) : null;
    }
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
  }
  return null;
};

/**
 * Set session ID in localStorage
 */
export const setSessionId = (sessionId) => {
  localStorage.setItem('sessionId', sessionId);
};

/**
 * Clear session ID from localStorage
 */
export const clearSessionId = () => {
  localStorage.removeItem('sessionId');
};

/**
 * Broadcast new login event to all tabs
 */
export const broadcastNewLogin = (userId, sessionId) => {
  // Normalize userId to string for consistent comparison
  const normalizedUserId = userId ? String(userId) : null;
  
  if (!normalizedUserId || !sessionId) {
    console.error('❌ Cannot broadcast: missing userId or sessionId', { userId: normalizedUserId, sessionId });
    return;
  }
  
  console.log('🔔 Broadcasting new login:', { userId: normalizedUserId, sessionId });
  
  const message = {
    type: 'NEW_LOGIN',
    userId: normalizedUserId,
    sessionId,
    timestamp: Date.now(),
  };
  
  // Method 1: BroadcastChannel (works across tabs/windows in same browser)
  const channel = initBroadcastChannel();
  if (channel) {
    try {
      // Send immediately
      channel.postMessage(message);
      console.log('📡 Sent BroadcastChannel message:', message);
      
      // Send again after delays to ensure other tabs receive it
      setTimeout(() => {
        channel.postMessage({ ...message, timestamp: Date.now() });
        console.log('📡 Re-sent BroadcastChannel message (100ms delay)');
      }, 100);
      
      setTimeout(() => {
        channel.postMessage({ ...message, timestamp: Date.now() });
        console.log('📡 Re-sent BroadcastChannel message (500ms delay)');
      }, 500);
    } catch (error) {
      console.error('❌ Error sending BroadcastChannel message:', error);
    }
  } else {
    console.warn('⚠️ BroadcastChannel not available, using storage fallback only');
  }
  
  // Method 2: localStorage events (fallback for browsers without BroadcastChannel)
  // This triggers storage events in other tabs
  try {
    const eventData = { 
      userId: normalizedUserId, 
      sessionId,
      timestamp: Date.now()
    };
    
    // Use a consistent key that gets updated (triggers storage event)
    const storageKey = 'user_session_new_login';
    // Change the value to trigger storage event (even if same data, use new timestamp)
    const newValue = JSON.stringify({ ...eventData, _trigger: Date.now() });
    localStorage.setItem(storageKey, newValue);
    console.log('📦 Updated localStorage key:', storageKey, eventData);
    
    // Also use timestamp-based keys as backup
    const eventKey = `new_login_${Date.now()}`;
    localStorage.setItem(eventKey, JSON.stringify(eventData));
    console.log('📦 Created backup storage key:', eventKey);
    
    // Clean up timestamp-based keys after a delay
    setTimeout(() => {
      try {
        localStorage.removeItem(eventKey);
      } catch (e) {
        // Ignore cleanup errors
      }
    }, 3000);
  } catch (error) {
    console.error('❌ Error broadcasting new login via storage:', error);
  }
};

/**
 * Listen for new login events from other tabs
 * @param {Function} callback - Callback function to execute when a new login is detected
 * @returns {Function} - Cleanup function to remove the listener
 */
export const listenForNewLogin = (callback) => {
  const channel = initBroadcastChannel();
  const cleanupFunctions = [];

  // Listen via BroadcastChannel
  if (channel) {
    const handleMessage = (event) => {
      // Ignore messages from the same tab (check if it's our own message)
      if (!event.data || event.data.type !== 'NEW_LOGIN') {
        return;
      }

      const { userId: incomingUserId, sessionId: incomingSessionId, timestamp: incomingTimestamp } = event.data;
      
      // Get current session info
      const currentUserId = getCurrentUserId();
      const currentSessionId = getCurrentSessionId();
      const isAuthenticated = !!localStorage.getItem('authToken');

      // Normalize IDs to strings for comparison
      const normalizedIncomingUserId = incomingUserId ? String(incomingUserId) : null;
      const normalizedCurrentUserId = currentUserId ? String(currentUserId) : null;

      console.log('📨 Received NEW_LOGIN event via BroadcastChannel:', {
        incomingUserId: normalizedIncomingUserId,
        incomingSessionId,
        incomingTimestamp: new Date(incomingTimestamp).toISOString(),
        currentUserId: normalizedCurrentUserId,
        currentSessionId,
        isAuthenticated,
      });

      // Only process if we're currently authenticated
      if (!isAuthenticated) {
        console.log('ℹ️ Ignoring event - not currently authenticated');
        return;
      }

      // Only trigger logout if:
      // 1. It's the same user
      // 2. It's a different session (new login)
      const isSameUser = normalizedCurrentUserId && 
                        normalizedIncomingUserId &&
                        normalizedCurrentUserId === normalizedIncomingUserId;
      const isDifferentSession = currentSessionId !== incomingSessionId;
      
      if (isSameUser && isDifferentSession) {
        console.log('🚪 New login detected in another tab. Logging out current session...');
        console.log('📊 Logout reason:', {
          sameUser: true,
          currentSessionId: currentSessionId || 'none (old session)',
          incomingSessionId,
          currentUserId: normalizedCurrentUserId,
        });
        callback();
      } else {
        console.log('ℹ️ Login event ignored:', {
          sameUser: isSameUser,
          sameSession: !isDifferentSession,
          hasCurrentUserId: !!normalizedCurrentUserId,
          hasIncomingUserId: !!normalizedIncomingUserId,
          reason: !isSameUser ? 'different user' : 'same session',
        });
      }
    };

    channel.addEventListener('message', handleMessage);
    console.log('✅ BroadcastChannel listener attached');
    cleanupFunctions.push(() => {
      channel.removeEventListener('message', handleMessage);
      console.log('🧹 BroadcastChannel listener removed');
    });
  } else {
    console.warn('⚠️ BroadcastChannel not available');
  }

  // Fallback: Listen via storage events (for browsers without BroadcastChannel)
  const handleStorageChange = (event) => {
    // Check both the dedicated key and timestamp-based keys
    const isLoginEvent = (event.key === 'user_session_new_login') || 
                        (event.key && event.key.startsWith('new_login_'));
    
    if (!isLoginEvent || !event.newValue) {
      return;
    }

    try {
      const data = JSON.parse(event.newValue);
      if (!data || !data.userId || !data.sessionId) {
        return;
      }

      // Get current session info
      const currentUserId = getCurrentUserId();
      const currentSessionId = getCurrentSessionId();
      const isAuthenticated = !!localStorage.getItem('authToken');

      // Normalize IDs to strings for comparison
      const normalizedIncomingUserId = data.userId ? String(data.userId) : null;
      const normalizedCurrentUserId = currentUserId ? String(currentUserId) : null;

      console.log('📦 Storage event received:', {
        key: event.key,
        incomingUserId: normalizedIncomingUserId,
        incomingSessionId: data.sessionId,
        currentUserId: normalizedCurrentUserId,
        currentSessionId,
        isAuthenticated,
      });

      // Only process if we're currently authenticated
      if (!isAuthenticated) {
        console.log('ℹ️ Ignoring storage event - not currently authenticated');
        return;
      }

      const isSameUser = normalizedCurrentUserId && 
                        normalizedIncomingUserId &&
                        normalizedCurrentUserId === normalizedIncomingUserId;
      const isDifferentSession = currentSessionId !== data.sessionId;
      
      if (isSameUser && isDifferentSession) {
        console.log('🚪 New login detected in another tab (via storage). Logging out current session...');
        console.log('📊 Logout reason:', {
          sameUser: true,
          currentSessionId: currentSessionId || 'none (old session)',
          incomingSessionId: data.sessionId,
          currentUserId: normalizedCurrentUserId,
        });
        callback();
      } else {
        console.log('ℹ️ Storage event ignored:', {
          sameUser: isSameUser,
          sameSession: !isDifferentSession,
          reason: !isSameUser ? 'different user' : 'same session',
        });
      }
    } catch (error) {
      console.error('❌ Error parsing storage event:', error);
    }
  };

  window.addEventListener('storage', handleStorageChange);
  console.log('✅ Storage event listener attached');
  cleanupFunctions.push(() => {
    window.removeEventListener('storage', handleStorageChange);
    console.log('🧹 Storage event listener removed');
  });

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
};

/**
 * Clear all session-related data
 */
export const clearSession = () => {
  clearSessionId();
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

/**
 * Initialize session on login
 * @param {string} userId - User ID
 * @returns {string} - Generated session ID
 */
export const initializeSession = (userId) => {
  // Normalize userId to string
  const normalizedUserId = userId ? String(userId) : null;
  
  if (!normalizedUserId) {
    console.error('❌ Cannot initialize session: userId is required');
    return null;
  }
  
  // Generate and set session ID
  const sessionId = generateSessionId();
  setSessionId(sessionId);
  console.log('✅ Session ID set in localStorage:', sessionId);
  
  // Broadcast immediately to all tabs
  broadcastNewLogin(normalizedUserId, sessionId);
  
  return sessionId;
};

