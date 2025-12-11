import axios from 'axios';
import { API_BASE_URL, DEMO_MODE } from '../config/api.config';
import { clearSession } from '../utils/sessionManager';

// API client is now configured via api.config.js
// To change backend URL, edit src/config/api.config.js

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout to prevent hanging
});

// Helper function to simulate API delay
const mockDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Request interceptor - Add JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors globally
api.interceptors.response.use(
  (response) => {
    // Reset inactivity timer on successful API response (indicates active usage)
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('userActivity'));
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);

    // If 401 Unauthorized, clear session and redirect to login
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || 'Session expired';
      
      // Check if it's a session invalidation (user logged in elsewhere)
      const isSessionInvalidated = errorMessage.includes('invalidated') || 
                                   errorMessage.includes('logged in on another') ||
                                   errorMessage.includes('another device') ||
                                   errorMessage.includes('another browser');
      
      console.log('🚪 401 Unauthorized - Session invalidated:', isSessionInvalidated);
      console.log('📋 Error message:', errorMessage);
      console.log('🔄 Clearing session and redirecting to login...');
      
      // Clear session and stored auth data
      clearSession();
      localStorage.removeItem('refreshToken');

      // Store a flag to show message on login page
      if (isSessionInvalidated) {
        sessionStorage.setItem('sessionInvalidated', 'true');
        sessionStorage.setItem('sessionInvalidationMessage', 'You have been logged out because you logged in on another device or browser.');
      }

      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication APIs - Wired to chatbot-backend
export const authAPI = {
  // Login - POST /api/user/login
  // Backend expects: { email, password }
  // Backend returns: { success: true, data: { token, role, user: { id, name, email } }, message }
  login: async (email, password) => {
    const response = await api.post('/api/user/login', {
      email,
      password,
    });
    return response.data;
  },

  // Logout - POST /api/user/logout
  logout: async () => {
    try {
      const response = await api.post('/api/user/logout');
      return response.data;
    } catch (error) {
      // Even if logout fails on server, clear local storage
      console.warn('Logout API call failed, clearing local storage anyway');
      return { success: true };
    }
  },

  // Validate token - POST /api/auth/validate-token
  validateToken: async () => {
    const response = await api.post('/api/auth/validate-token');
    return response.data;
  },

  // Get current user company info - GET /api/user/company
  getCurrentUser: async () => {
    const response = await api.get('/api/user/company');
    return response.data;
  },

  // Get user plan info - GET /api/user/plan
  getUserPlan: async () => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          name: 'Premium Plan',
          tokens: 5420,
          days_remaining: 28,
          max_users: 'Unlimited',
          expiry_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
        }
      };
    }
    const response = await api.get('/api/user/plan');
    return response.data;
  },

  // Get user usage stats - GET /api/user/usage
  getUserUsage: async () => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          total_messages: 1842,
          unique_users: 624,
          total_duration: 176832, // in seconds (49 hours 12 minutes)
          last_activity: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        }
      };
    }
    const response = await api.get('/api/user/usage');
    return response.data;
  },

  // Get user dashboard sidebar permissions - GET /api/user/dashboard-sidebar
  getDashboardSidebarConfig: async () => {
    const response = await api.get('/api/user/dashboard-sidebar');
    return response.data;
  },

  // Get user sessions (top chats) - GET /api/user/sessions
  getSessions: async (dateRange = '7days') => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          sessions: [
            {
              session_id: 'session-1',
              messages: [
                { content: 'Hello, how can I help?', sender: 'bot', timestamp: new Date(Date.now() - 3600000).toISOString() },
                { content: 'I need help with pricing', sender: 'user', timestamp: new Date(Date.now() - 3500000).toISOString() },
              ],
              duration: 1245,
            },
          ],
          avgDurationSeconds: 890,
        }
      };
    }
    const response = await api.get('/api/user/sessions', { params: { dateRange } });
    return response.data;
  },

  // Get user analytics (chart data) - GET /api/user/analytics
  getAnalytics: async (dateRange = '7days') => {
    if (DEMO_MODE) {
      await mockDelay(200);
      // Generate last 7 days mock data
      const mockChartData = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        mockChartData.push({
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 100) + 50,
        });
      }
      return {
        success: true,
        data: {
          chartData: mockChartData,
          totalMessages: 1842,
          totalSessions: 624,
          avgDurationSeconds: 890,
          avgMessagesPerChat: 5,
        }
      };
    }
    const response = await api.get('/api/user/analytics', { params: { dateRange } });
    return response.data;
  },

  // Get hot leads (users with buying intent keywords) - GET /api/user/hot-leads
  getHotLeads: async (params = {}) => {
    const { page = 1, limit = 20, searchTerm = '', dateRange = '30days', startDate, endDate } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const mockLeads = [
        {
          id: 'session-1',
          session_id: 'session-1',
          phone: '+91 98765 43210',
          email: 'user1@example.com',
          name: 'Rajesh Kumar',
          matchedKeywords: ['pricing', 'quote', 'demo'],
          messageSnippets: [
            { content: 'Can you share the pricing details?', timestamp: new Date(Date.now() - 3600000).toISOString() },
            { content: 'I would like to see a demo', timestamp: new Date(Date.now() - 3500000).toISOString() },
          ],
          hotWordCount: 3,
          firstDetectedAt: new Date(Date.now() - 86400000).toISOString(),
          lastDetectedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'session-2',
          session_id: 'session-2',
          phone: '+91 98765 43211',
          email: 'user2@example.com',
          name: 'Priya Sharma',
          matchedKeywords: ['buy', 'order'],
          messageSnippets: [
            { content: 'I want to buy this product', timestamp: new Date(Date.now() - 7200000).toISOString() },
          ],
          hotWordCount: 2,
          firstDetectedAt: new Date(Date.now() - 172800000).toISOString(),
          lastDetectedAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ];
      return {
        success: true,
        data: {
          leads: mockLeads,
          hotWords: ['pricing', 'price', 'cost', 'quote', 'demo', 'buy', 'purchase', 'order'],
          total: mockLeads.length,
          currentPage: 1,
          totalPages: 1,
        }
      };
    }
    const response = await api.get('/api/user/hot-leads', {
      params: { page, limit, searchTerm, dateRange, startDate, endDate }
    });
    return response.data;
  },

  // Mark a hot lead as contacted - PATCH /api/user/hot-leads/:session_id/contacted
  markHotLeadContacted: async (sessionId, isContacted, notes = '') => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          success: true,
          lead: { session_id: sessionId, is_contacted: isContacted, notes }
        }
      };
    }
    const response = await api.patch(`/api/user/hot-leads/${sessionId}/contacted`, {
      is_contacted: isContacted,
      notes
    });
    return response.data;
  },

  // Get messages (chat history) - GET /api/user/messages
  getMessages: async (params = {}) => {
    const { page = 1, limit = 25, email, phone, session_id, is_guest, dateRange, startDate, endDate, search } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const contacts = [
        { id: 'guest-449', name: 'Guest 449', type: 'guest' },
        { id: 'guest-448', name: 'Guest 448', type: 'guest' },
        { id: 'guest-447', name: 'Guest 447', type: 'guest' },
      ];
      const mockMessages = [];
      const agentMsgs = [
        'The cost for WhatsApp marketing messages is **INR 0.60 per message**. Here are the current packages available:\n\n**Package 1:** 3 Lac Messages...',
        'The pricing for our WhatsApp marketing service is set at **₹0.60 per message**.',
      ];
      const userMsgs = ['What is the cost?', 'Pricing', 'Price?'];
      
      for (let i = 0; i < 50; i++) {
        const isAgent = i % 2 === 0;
        const contact = contacts[Math.floor(i / 2) % contacts.length];
        mockMessages.push({
          id: `msg-${i + 1}`,
          content: isAgent ? agentMsgs[i % agentMsgs.length] : userMsgs[i % userMsgs.length],
          sender: isAgent ? 'bot' : 'user',
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          session_id: `session-${Math.floor(i / 4)}`,
          email: null,
          phone: null,
          is_guest: true,
          name: contact.name,
        });
      }
      
      const total = mockMessages.length;
      const startIdx = (page - 1) * limit;
      const paginatedMessages = mockMessages.slice(startIdx, startIdx + limit);
      
      return {
        success: true,
        data: {
          messages: paginatedMessages,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          totalMessages: total,
        }
      };
    }
    const response = await api.get('/api/user/messages', {
      params: { page, limit, email, phone, session_id, is_guest, dateRange, startDate, endDate, search }
    });
    return response.data;
  },

  // Get all contacts for filter dropdowns - GET /api/user/contacts
  getAllContacts: async () => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          contacts: ['+919876543210', '+919876543211', 'john@example.com'],
          guests: Array.from({ length: 50 }, (_, i) => ({
            session_id: `session-${i + 1}`,
            label: `Guest ${i + 1}`,
            number: i + 1,
          })),
        }
      };
    }
    const response = await api.get('/api/user/contacts');
    return response.data;
  },

  // Get daily chat summaries - GET /api/user/daily-summaries
  getDailySummaries: async (params = {}) => {
    const { page = 1, limit = 30, startDate, endDate } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const mockSummaries = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        mockSummaries.push({
          _id: `summary-${i}`,
          date: date.toISOString(),
          summary: `On ${date.toLocaleDateString()}, users primarily discussed product pricing, feature inquiries, and support-related questions. There was significant interest in integration options and API documentation. Several users asked about subscription plans and payment methods.`,
          messageCount: Math.floor(Math.random() * 200) + 50,
          sessionCount: Math.floor(Math.random() * 30) + 10,
          topTopics: ['pricing', 'features', 'support', 'integration'].slice(0, Math.floor(Math.random() * 3) + 2),
        });
      }
      return {
        success: true,
        data: {
          summaries: mockSummaries,
          total: mockSummaries.length,
          currentPage: 1,
          totalPages: 1,
        }
      };
    }
    const response = await api.get('/api/user/daily-summaries', {
      params: { page, limit, startDate, endDate }
    });
    return response.data;
  },

  // Get credit summary - GET /api/user/credit-summary
  getCreditSummary: async () => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          currentBalance: 95000,
          totalAllocated: 100000,
          totalUsed: 5000,
          usagePercentage: 5,
        }
      };
    }
    const response = await api.get('/api/user/credit-summary');
    return response.data;
  },

  // Get credit transactions - GET /api/user/credit-transactions
  getCreditTransactions: async (params = {}) => {
    const { page = 1, limit = 25, type, startDate, endDate, search } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const transactionTypes = ['message_deduction', 'admin_add', 'admin_remove', 'initial_allocation', 'renewal_bonus'];
      const mockTransactions = [];
      let balance = 95000;
      
      for (let i = 0; i < 50; i++) {
        const txType = i === 0 ? 'initial_allocation' : transactionTypes[Math.floor(Math.random() * 4)];
        let amount = txType === 'message_deduction' ? -2 : 
                     txType === 'admin_add' ? Math.floor(Math.random() * 10000) + 1000 :
                     txType === 'admin_remove' ? -(Math.floor(Math.random() * 5000) + 500) :
                     txType === 'renewal_bonus' ? 10000 :
                     100000;
        
        mockTransactions.push({
          _id: `tx-${i}`,
          type: txType,
          amount: amount,
          balance_after: balance,
          session_id: txType === 'message_deduction' ? `session-${Math.floor(Math.random() * 100)}` : null,
          reason: txType === 'message_deduction' ? 'Chat message exchange' :
                  txType === 'admin_add' ? 'Admin credited for support' :
                  txType === 'admin_remove' ? 'Adjustment by admin' :
                  txType === 'renewal_bonus' ? 'Monthly renewal bonus' :
                  'Initial subscription allocation',
          admin_id: ['admin_add', 'admin_remove'].includes(txType) ? { name: 'Admin User', email: 'admin@example.com' } : null,
          created_at: new Date(Date.now() - i * 3600000).toISOString(),
        });
        balance -= amount;
      }
      
      const total = mockTransactions.length;
      const startIdx = (page - 1) * limit;
      const paginatedTransactions = mockTransactions.slice(startIdx, startIdx + limit);
      
      return {
        success: true,
        data: {
          transactions: paginatedTransactions,
          total: total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        }
      };
    }
    const response = await api.get('/api/user/credit-transactions', {
      params: { page, limit, type, startDate, endDate, search }
    });
    return response.data;
  },

  // Get email history - GET /api/user/email-history
  getEmailHistory: async (params = {}) => {
    const { page = 1, limit = 25, chatbot_id, status, dateRange, startDate, endDate } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const mockEmails = [];
      const templates = ['Swaraa Ai Calling Agent', 'Ai Agent - Pricing Details', 'Product Information', 'Service Details'];
      const statuses = ['sent', 'failed'];
      
      for (let i = 0; i < 30; i++) {
        mockEmails.push({
          id: `email-${i}`,
          chatbot_id: 'chatbot-1',
          chatbot_name: 'My Chatbot',
          template_id: `template-${i % templates.length}`,
          template_name: templates[i % templates.length],
          recipient_email: `user${i}@example.com`,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          error_message: Math.random() > 0.8 ? 'SMTP server error' : null,
          sent_at: new Date(Date.now() - i * 3600000).toISOString(),
        });
      }
      
      const total = mockEmails.length;
      const startIdx = (page - 1) * limit;
      const paginatedEmails = mockEmails.slice(startIdx, startIdx + limit);
      
      return {
        success: true,
        data: {
          emails: paginatedEmails,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          totalEmails: total,
        }
      };
    }
    const response = await api.get('/api/user/email-history', {
      params: { page, limit, chatbot_id, status, dateRange, startDate, endDate }
    });
    return response.data;
  },

  // Get WhatsApp proposal history - GET /api/user/whatsapp-proposal-history
  getWhatsAppProposalHistory: async (params = {}) => {
    const { page = 1, limit = 25, chatbot_id, status, dateRange, startDate, endDate } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const mockProposals = [];
      const templates = ['AI Agent Proposal', 'Service Details', 'Product Information', 'Pricing Details'];
      const statuses = ['sent', 'failed'];
      
      for (let i = 0; i < 30; i++) {
        mockProposals.push({
          id: `proposal-${i}`,
          chatbot_id: 'chatbot-1',
          chatbot_name: 'My Chatbot',
          template_id: `template-${i % templates.length}`,
          template_name: templates[i % templates.length],
          recipient_phone: `+91${8261900000 + i}`,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          error_message: Math.random() > 0.8 ? 'WhatsApp API error' : null,
          message_id: Math.random() > 0.5 ? `msg-${i}` : null,
          sent_at: new Date(Date.now() - i * 3600000).toISOString(),
        });
      }
      
      const total = mockProposals.length;
      const startIdx = (page - 1) * limit;
      const paginatedProposals = mockProposals.slice(startIdx, startIdx + limit);
      
      return {
        success: true,
        data: {
          proposals: paginatedProposals,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          totalProposals: total,
        }
      };
    }
    const response = await api.get('/api/user/whatsapp-proposal-history', {
      params: { page, limit, chatbot_id, status, dateRange, startDate, endDate }
    });
    return response.data;
  },

  // Get follow-up leads (users who requested proposals, contact details, etc.) - GET /api/user/follow-up-leads
  getFollowUpLeads: async (params = {}) => {
    const { page = 1, limit = 20, searchTerm = '', dateRange = '30days', startDate, endDate, showContacted = 'all' } = params;
    if (DEMO_MODE) {
      await mockDelay(300);
      const mockLeads = [
        {
          id: 'session-fu-1',
          session_id: 'session-fu-1',
          phone: '+91 98765 43210',
          email: 'lead1@example.com',
          name: 'Amit Patel',
          matchedKeywords: ['send proposal', 'schedule meeting'],
          messageSnippets: [
            { content: 'Can you send me a proposal for the enterprise plan?', timestamp: new Date(Date.now() - 3600000).toISOString() },
            { content: 'I would like to schedule a meeting with your team', timestamp: new Date(Date.now() - 3500000).toISOString() },
          ],
          matchCount: 2,
          firstDetectedAt: new Date(Date.now() - 86400000).toISOString(),
          lastDetectedAt: new Date(Date.now() - 3600000).toISOString(),
          isContacted: false,
          contactedAt: null,
          notes: '',
        },
        {
          id: 'session-fu-2',
          session_id: 'session-fu-2',
          phone: '+91 98765 43211',
          email: 'lead2@example.com',
          name: 'Sneha Gupta',
          matchedKeywords: ['call me', 'contact details'],
          messageSnippets: [
            { content: 'Please call me to discuss further', timestamp: new Date(Date.now() - 7200000).toISOString() },
          ],
          matchCount: 2,
          firstDetectedAt: new Date(Date.now() - 172800000).toISOString(),
          lastDetectedAt: new Date(Date.now() - 7200000).toISOString(),
          isContacted: true,
          contactedAt: new Date(Date.now() - 3600000).toISOString(),
          notes: 'Called and discussed requirements',
        },
      ];
      return {
        success: true,
        data: {
          leads: mockLeads,
          keywords: ['send proposal', 'contact details', 'call me', 'schedule meeting', 'lets connect'],
          total: mockLeads.length,
          currentPage: 1,
          totalPages: 1,
        }
      };
    }
    const response = await api.get('/api/user/follow-up-leads', {
      params: { page, limit, searchTerm, dateRange, startDate, endDate, showContacted }
    });
    return response.data;
  },

  // Mark a follow-up lead as contacted - PATCH /api/user/follow-up-leads/:session_id/contacted
  markFollowUpContacted: async (sessionId, isContacted, notes = '') => {
    if (DEMO_MODE) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          success: true,
          lead: { session_id: sessionId, is_contacted: isContacted, notes }
        }
      };
    }
    const response = await api.patch(`/api/user/follow-up-leads/${sessionId}/contacted`, {
      is_contacted: isContacted,
      notes
    });
    return response.data;
  },

  // Profanity Management APIs
  getProfanityConfig: async (chatbotId) => {
    const response = await api.get(`/api/chatbot/${chatbotId}/profanity-config`);
    return response.data;
  },

  updateProfanityConfig: async (chatbotId, enabled, customKeywords, showInUserDashboard) => {
    const response = await api.put(`/api/chatbot/${chatbotId}/profanity-config`, {
      enabled,
      custom_keywords: customKeywords,
      show_in_user_dashboard: showInUserDashboard,
    });
    return response.data;
  },

  getBannedSessions: async (chatbotId, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const queryString = queryParams.toString();
    const response = await api.get(`/api/chatbot/${chatbotId}/banned-sessions${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  unbanSession: async (chatbotId, banId) => {
    const response = await api.post(`/api/chatbot/${chatbotId}/banned-sessions/${banId}/unban`);
    return response.data;
  },

  bulkUnbanSessions: async (chatbotId, banIds) => {
    const response = await api.post(`/api/chatbot/${chatbotId}/banned-sessions/bulk-unban`, {
      ban_ids: banIds,
    });
    return response.data;
  },

  // Get offer templates for user dashboard - Global/Universal
  getOfferTemplates: async () => {
    const response = await api.get(`/api/chatbot/offer-templates/user`);
    return response.data;
  },
};

// Call APIs
export const callAPI = {
  // Make outbound call
  makeCall: async (phoneNumber, customParameters = {}) => {
    const response = await api.post('/api/v1/calls/outbound', {
      phoneNumber,
      customParameters,
    });
    return response.data;
  },

  // Get call details
  getCall: async (callSid) => {
    const response = await api.get(`/api/v1/calls/${callSid}`);
    return response.data;
  },

  // Get call history
  getHistory: async (phoneNumber, limit = 10) => {
    const response = await api.get(`/api/v1/calls/history/${phoneNumber}`, {
      params: { limit },
    });
    return response.data;
  },

  // Get call statistics
  getStats: async () => {
    const response = await api.get('/api/v1/calls/outbound/stats');
    return response.data;
  },

  // Get all calls with pagination and filters
  // Using analytics/calls/logs endpoint which returns actual call logs
  getAllCalls: async (params = {}) => {
    if (DEMO_MODE) {
      await mockDelay(300);
      const now = Date.now();
      let mockCalls = Array.from({ length: 50 }).map((_, i) => {
        // Generate random hour between 9 AM and 4 PM for direction chart
        const hour = 9 + (i % 8);
        const startTime = new Date(now - i * 3600000);
        startTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
        
        // Generate transcript array for completed calls
        const hasTranscript = i % 3 === 0;
        const transcript = hasTranscript ? [
          {
            speaker: 'assistant',
            role: 'assistant',
            text: 'Hello! Thank you for calling. How can I assist you today?',
            content: 'Hello! Thank you for calling. How can I assist you today?',
            timestamp: new Date(startTime.getTime() + 2000).toISOString(),
          },
          {
            speaker: 'user',
            role: 'user',
            text: 'Hi, I wanted to know about your services.',
            content: 'Hi, I wanted to know about your services.',
            timestamp: new Date(startTime.getTime() + 5000).toISOString(),
          },
          {
            speaker: 'assistant',
            role: 'assistant',
            text: 'Of course! We offer a wide range of services. Let me provide you with more details...',
            content: 'Of course! We offer a wide range of services. Let me provide you with more details...',
            timestamp: new Date(startTime.getTime() + 8000).toISOString(),
          },
          {
            speaker: 'user',
            role: 'user',
            text: 'That sounds great. Can you send me more information?',
            content: 'That sounds great. Can you send me more information?',
            timestamp: new Date(startTime.getTime() + 12000).toISOString(),
          },
          {
            speaker: 'assistant',
            role: 'assistant',
            text: 'Absolutely! I\'ll send you an email with all the details. Is there anything else I can help you with?',
            content: 'Absolutely! I\'ll send you an email with all the details. Is there anything else I can help you with?',
            timestamp: new Date(startTime.getTime() + 15000).toISOString(),
          },
        ] : null;

        return {
          _id: `call-${i + 1}`,
          callSid: `CA${Date.now()}${i}`,
          sessionId: `CA${Date.now()}${i}`,
          exotelCallSid: `CA${Date.now()}${i}`,
          fromPhone: `+91${9876543210 + i}`,
          toPhone: `+91${9876543210 + i + 1000}`,
          status: ['completed', 'failed', 'no-answer', 'busy', 'in-progress', 'initiated'][i % 6],
          duration: Math.floor(Math.random() * 300) + 30,
          durationSec: Math.floor(Math.random() * 300) + 30,
          cost: (Math.random() * 2 + 0.5).toFixed(2),
          createdAt: new Date(now - i * 3600000).toISOString(),
          startedAt: startTime.toISOString(),
          startTime: startTime.toISOString(),
          endedAt: i % 3 === 0 ? new Date(startTime.getTime() + (Math.floor(Math.random() * 300) + 30) * 1000).toISOString() : null,
          direction: i % 2 === 0 ? 'outbound' : 'inbound',
          campaignName: ['Diwali Warm Leads', 'Payment Reminder', 'Premium Upsell'][i % 3],
          agentName: `Agent ${(i % 5) + 1}`,
          recordingUrl: hasTranscript ? `https://example.com/recording-${i}.mp3` : null,
          transcript: transcript,
          creditsConsumed: Math.floor(Math.random() * 300) + 30,
        };
      });

      // Apply filters
      if (params.status) {
        mockCalls = mockCalls.filter(call => call.status === params.status);
      }
      if (params.direction) {
        mockCalls = mockCalls.filter(call => call.direction === params.direction);
      }
      if (params.phoneNumbers && Array.isArray(params.phoneNumbers) && params.phoneNumbers.length > 0) {
        mockCalls = mockCalls.filter(call => {
          const phone = call.direction === 'outbound' ? call.toPhone : call.fromPhone;
          return params.phoneNumbers.includes(phone);
        });
      }
      if (params.startDate) {
        const startDate = new Date(params.startDate);
        mockCalls = mockCalls.filter(call => {
          const callDate = new Date(call.startedAt || call.startTime || call.createdAt);
          return callDate >= startDate;
        });
      }
      if (params.endDate) {
        const endDate = new Date(params.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        mockCalls = mockCalls.filter(call => {
          const callDate = new Date(call.startedAt || call.startTime || call.createdAt);
          return callDate <= endDate;
        });
      }

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const total = mockCalls.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCalls = mockCalls.slice(startIndex, endIndex);

      return {
        data: {
          calls: paginatedCalls,
          total: total,
          page: page,
          limit: limit,
          pages: Math.ceil(total / limit),
          pagination: {
            page: page,
            limit: limit,
            total: total,
            pages: Math.ceil(total / limit),
          }
        }
      };
    }
    const response = await api.get('/api/v1/analytics/calls/logs', { params });
    return response.data;
  },

  // Get retriable calls (failed calls excluding voicemail)
  getRetriableCalls: async (userId, options = {}) => {
    const params = { userId, ...options };
    const response = await api.get('/api/v1/calls/retriable', { params });
    return response.data;
  },

  // Get voicemail statistics
  getVoicemailStats: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/calls/voicemail-stats', { params });
    return response.data;
  },

  // Get voicemail analysis for specific call
  getVoicemailAnalysis: async (callLogId) => {
    const response = await api.get(`/api/v1/calls/${callLogId}/voicemail-analysis`);
    return response.data;
  },

  // Mark voicemail detection as false positive
  markFalsePositive: async (callLogId, isFalsePositive) => {
    const response = await api.post(`/api/v1/calls/${callLogId}/mark-false-positive`, {
      isFalsePositive,
    });
    return response.data;
  },
};

// WebSocket/System Stats API
export const wsAPI = {
  getStats: async () => {
    // Always check DEMO_MODE first to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(50); // Reduced delay for faster loading
      return {
        activeCalls: 12,
        totalConnections: 45,
        queueLength: 8,
        uptime: 3600 * 24, // 24 hours
      };
    }
    const response = await api.get('/api/v1/stats');
    return response.data;
  },
};

// Knowledge Base APIs
export const knowledgeBaseAPI = {
  search: async (query, limit = 5, category = null) => {
    const response = await api.get('/api/v1/knowledge-base/search', {
      params: { query, limit, category },
    });
    return response.data;
  },

  list: async (params = {}) => {
    const response = await api.get('/api/v1/knowledge-base/list', { params });
    return response.data;
  },

  add: async (title, content, category = 'general', metadata = {}) => {
    const response = await api.post('/api/v1/knowledge-base/add', {
      title,
      content,
      category,
      metadata,
    });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/v1/knowledge-base/${id}`);
    return response.data;
  },
};

// Agent APIs
export const agentAPI = {
  // Get all agents
  list: async (params = {}) => {
    const response = await api.get('/api/v1/agents', { params });
    return response.data;
  },

  // Get agent by ID
  get: async (agentId) => {
    const response = await api.get(`/api/v1/agents/${agentId}`);
    return response.data;
  },
};

// Campaign APIs
export const campaignAPI = {
  create: async (name, agentId, phoneId, concurrentCalls = 2) => {
    const response = await api.post('/api/v1/campaigns', {
      name,
      agentId,
      phoneId,
      settings: {
        concurrentCallsLimit: concurrentCalls,
      },
    });
    return response.data;
  },

  addContacts: async (campaignId, phoneNumbers) => {
    // Convert phone numbers array to contacts format
    const contacts = phoneNumbers.map(phoneNumber => ({
      phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
      name: '',
      metadata: {}
    }));

    const response = await api.post(`/api/v1/campaigns/${campaignId}/contacts`, {
      contacts
    });
    return response.data;
  },

  start: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/start`);
    return response.data;
  },

  pause: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/pause`);
    return response.data;
  },

  resume: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/resume`);
    return response.data;
  },

  cancel: async (campaignId) => {
    const response = await api.post(`/api/v1/campaigns/${campaignId}/cancel`);
    return response.data;
  },

  update: async (campaignId, updates) => {
    const response = await api.patch(`/api/v1/campaigns/${campaignId}`, updates);
    return response.data;
  },

  list: async (params = {}) => {
    // ALWAYS check DEMO_MODE first - return immediately to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(100); // Reduced delay for faster loading
      return {
        data: [
          {
            _id: 'campaign-1',
            name: 'Diwali Warm Leads',
            status: 'active',
            agentId: 'agent-1',
            phoneId: 'phone-1',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            liveStats: {
              processed: 450,
              totalNumbers: 1000,
              remaining: 550,
              activeCalls: 5,
              queueLength: 12,
              completed: 420,
              failed: 30,
            }
          },
          {
            _id: 'campaign-2',
            name: 'Payment Reminder Batch',
            status: 'paused',
            agentId: 'agent-2',
            phoneId: 'phone-2',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            liveStats: {
              processed: 210,
              totalNumbers: 500,
              remaining: 290,
              activeCalls: 0,
              queueLength: 0,
              completed: 200,
              failed: 10,
            }
          },
          {
            _id: 'campaign-3',
            name: 'Premium Upsell List',
            status: 'active',
            agentId: 'agent-1',
            phoneId: 'phone-1',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            liveStats: {
              processed: 145,
              totalNumbers: 300,
              remaining: 155,
              activeCalls: 3,
              queueLength: 8,
              completed: 140,
              failed: 5,
            }
          },
        ]
      };
    }
    const response = await api.get('/api/v1/campaigns', { params });
    return response.data;
  },

  get: async (campaignId) => {
    if (DEMO_MODE) {
      await mockDelay(100);
      // Return mock campaign data based on campaignId
      const mockCampaigns = {
        'campaign-1': {
          _id: 'campaign-1',
          name: 'Diwali Warm Leads',
          status: 'active',
          agentId: 'agent-1',
          phoneId: { number: '+91-9876543210' },
          userId: { name: 'John Doe', email: 'john@example.com' },
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          phoneNumbers: ['+919876543210', '+919876543211', '+919876543212'],
          stats: { completed: 320, failed: 30 },
          completedCalls: 320,
          failedCalls: 30,
          totalCalls: 350,
        },
        'campaign-2': {
          _id: 'campaign-2',
          name: 'Payment Reminder Batch',
          status: 'paused',
          agentId: 'agent-2',
          phoneId: { number: '+91-9876543211' },
          userId: { name: 'Jane Smith', email: 'jane@example.com' },
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          phoneNumbers: ['+919876543220', '+919876543221'],
          stats: { completed: 210, failed: 20 },
          completedCalls: 210,
          failedCalls: 20,
          totalCalls: 230,
        },
        'campaign-3': {
          _id: 'campaign-3',
          name: 'Premium Upsell List',
          status: 'active',
          agentId: 'agent-3',
          phoneId: { number: '+91-9876543212' },
          userId: { name: 'Bob Wilson', email: 'bob@example.com' },
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          phoneNumbers: ['+919876543230', '+919876543231', '+919876543232', '+919876543233'],
          stats: { completed: 145, failed: 15 },
          completedCalls: 145,
          failedCalls: 15,
          totalCalls: 160,
        },
      };
      
      const campaign = mockCampaigns[campaignId] || {
        _id: campaignId,
        name: 'Campaign ' + campaignId,
        status: 'active',
        agentId: 'agent-1',
        phoneId: { number: '+91-9876543210' },
        userId: { name: 'Demo User', email: 'demo@example.com' },
        createdAt: new Date().toISOString(),
        phoneNumbers: [],
        stats: { completed: 0, failed: 0 },
        completedCalls: 0,
        failedCalls: 0,
        totalCalls: 0,
      };
      
      return { data: campaign };
    }
    const response = await api.get(`/api/v1/campaigns/${campaignId}`);
    return response.data;
  },
};

// Analytics APIs
export const analyticsAPI = {
  // Get comprehensive dashboard analytics
  getDashboard: async (userId, timeRange = null) => {
    // ALWAYS check DEMO_MODE first - return immediately to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(100); // Reduced delay for faster loading
      // Generate time labels for the day
      const hours = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM'];
      const callValues = [42, 58, 75, 88, 132, 164, 172, 160, 140, 118];
      
      return {
        data: {
          totalCalls: 1842,
          completedCalls: 1423,
          failedCalls: 219,
          inProgressCalls: 18,
          successRate: 77.3,
          averageDuration: 96,
          totalDuration: 176832,
          // Format for charts - array of { time, calls } objects
          callTrends: hours.map((time, i) => ({
            time,
            calls: callValues[i] || 0
          })),
          callsOverTime: {
            labels: hours,
            data: callValues
          },
          byStatus: {
            completed: 1423,
            failed: 219,
            'no-answer': 120,
            busy: 80,
          },
          byDirection: {
            inbound: 624,
            outbound: 1218,
          },
        }
      };
    }
    // Only make real API call if DEMO_MODE is false
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/dashboard', { params });
    return response.data;
  },

  // Get call analytics
  getCalls: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/calls', { params });
    return response.data;
  },

  // Get retry analytics
  getRetry: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/retry', { params });
    return response.data;
  },

  // Get scheduling analytics
  getScheduling: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/scheduling', { params });
    return response.data;
  },

  // Get voicemail analytics
  getVoicemail: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/voicemail', { params });
    return response.data;
  },

  // Get performance metrics
  getPerformance: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/performance', { params });
    return response.data;
  },

  // Get cost analytics
  getCost: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/cost', { params });
    return response.data;
  },

  // Get time-series trends
  getTrends: async (userId, timeRange = null) => {
    const params = { userId };
    if (timeRange) {
      params.startDate = timeRange.start;
      params.endDate = timeRange.end;
    }
    const response = await api.get('/api/v1/analytics/trends', { params });
    return response.data;
  },
};

// Credits APIs
export const creditsAPI = {
  // Get credit balance for a user (uses /auth/me to get own credits without admin privileges)
  getBalance: async () => {
    // ALWAYS check DEMO_MODE first - return immediately to avoid timeout
    if (DEMO_MODE) {
      await mockDelay(50); // Reduced delay for faster loading
      return {
        success: true,
        data: {
          credits: 5420
        }
      };
    }
    // For regular users, get credits from their own profile via /auth/me
    // This avoids the admin-only /users/:id/credits endpoint
    const response = await api.get('/api/v1/auth/me');
    return {
      success: true,
      data: {
        credits: response.data.data.user.credits || 0
      }
    };
  },

  // Get credit transaction history for the current user (uses /auth/me/credits/transactions)
  getTransactions: async (options = {}) => {
    if (DEMO_MODE) {
      await mockDelay(250);
      const mockTransactions = Array.from({ length: 30 }).map((_, i) => ({
        _id: `txn-${i + 1}`,
        type: i % 3 === 0 ? 'addition' : 'deduction',
        amount: i % 3 === 0 ? 1000 : -(Math.floor(Math.random() * 200) + 50),
        balance: 5420 - (i * 50),
        reason: i % 3 === 0 ? 'admin_topup' : ['call_completed', 'call_failed', 'voicemail'][i % 3],
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        metadata: i % 3 !== 0 ? {
          durationSec: Math.floor(Math.random() * 300) + 30,
          callSid: `CA${Date.now()}${i}`,
        } : null,
      }));
      return {
        data: {
          transactions: mockTransactions,
          total: 30,
        }
      };
    }
    // For regular users, get their own transactions via /auth/me/credits/transactions
    // This avoids the admin-only /users/:id/credits/transactions endpoint
    const params = {
      limit: options.limit || 50,
      skip: options.skip || 0,
    };
    if (options.startDate) {
      params.startDate = options.startDate;
    }
    if (options.endDate) {
      params.endDate = options.endDate;
    }
    const response = await api.get('/api/v1/auth/me/credits/transactions', { params });
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Handoff APIs (live chat takeover)
export const handoffAPI = {
  // Get active handoff sessions
  getActiveHandoffs: async (params = {}) => {
    const response = await api.get('/api/handoff/active', { params });
    return response.data;
  },

  // Send a message from agent to user
  sendMessage: async (sessionId, message, agentId = null) => {
    const response = await api.post('/api/handoff/send-message', {
      sessionId,
      message,
      agentId,
    });
    return response.data;
  },

  // Approve a pending handoff session
  approve: async (sessionId, agentId = null) => {
    const response = await api.post('/api/handoff/approve', {
      sessionId,
      agentId,
    });
    return response.data;
  },

  // Resolve/close a handoff session
  resolve: async (sessionId) => {
    const response = await api.post('/api/handoff/resolve', { sessionId });
    return response.data;
  },
};

export default api;

