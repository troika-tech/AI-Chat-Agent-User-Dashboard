import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FaSpinner,
  FaDownload,
  FaFileAlt,
  FaCoins,
  FaComments,
  FaUsers,
  FaClock,
  FaTimes,
  FaUser,
  FaRobot
} from 'react-icons/fa';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { authAPI } from '../services/api';
import { DEMO_MODE } from '../config/api.config';

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [error, setError] = useState(null);
  const [topChats, setTopChats] = useState([]);
  const [topChatsLoading, setTopChatsLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatsChartData, setChatsChartData] = useState([]);
  const [visitorsChartData, setVisitorsChartData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchTopChats();
    fetchChartData();
    // Auto-refresh disabled
    // const interval = setInterval(fetchDashboardData, 30000);
    // return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch usage and plan data from chatbot backend
      const results = await Promise.allSettled([
        // GET /api/user/usage - Returns { total_messages, unique_users, last_activity }
        authAPI.getUserUsage().catch(err => {

          return null;
        }),
        // GET /api/user/plan - Returns plan info with expiry date
        authAPI.getUserPlan().catch(err => {

          return null;
        }),
      ]);

      // Set usage data
      if (results[0].status === 'fulfilled' && results[0].value) {

        setUsageData(results[0].value.data);
      } else {

      }

      // Set plan data
      if (results[1].status === 'fulfilled' && results[1].value) {

        setPlanData(results[1].value.data);
      } else {

      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || err.message?.includes('timeout')) {
        setError('Cannot connect to server. Please make sure the backend server is running.');
      } else if (err.response?.status === 404) {
        setError('API endpoint not found. Please check if the backend server is running.');
      } else if (err.response?.status === 500) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Internal server error';
        setError(`Server error: ${errorMsg}`);
      } else {
        const errorData = err.response?.data?.error;
        const errorMsg = typeof errorData === 'string' ? errorData : errorData?.message || err.message || 'Failed to load dashboard data';
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs from usage and plan data
  const calculateKPIs = () => {
    // Get data from usage API
    const totalChats = usageData?.total_messages || 0;
    const totalVisitors = usageData?.unique_users || 0;
    const totalDuration = usageData?.total_duration || 0; // Assuming this exists in API, otherwise will be 0

    // Format duration - convert from seconds to human-readable format
    const formatDuration = (seconds) => {
      if (!seconds) return '0m';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    };

    // Calculate change percentages (demo mode shows realistic changes)
    // In real mode, these would come from API comparison data
    const chatsChange = totalChats > 0 ? '+12.5%' : '+0%';
    const visitorsChange = totalVisitors > 0 ? '+8.3%' : '+0%';

    return [
      {
        title: 'Total Chats',
        value: totalChats.toLocaleString(),
        change: chatsChange,
        trend: 'up',
        icon: FaComments,
        color: 'bg-purple-500',
      },
      {
        title: 'Total Visitors',
        value: totalVisitors.toLocaleString(),
        change: visitorsChange,
        trend: 'up',
        icon: FaUsers,
        color: 'bg-blue-500',
      },
      {
        title: 'Total Duration',
        value: formatDuration(totalDuration),
        change: 'Active',
        trend: 'up',
        icon: FaClock,
        color: 'bg-indigo-500',
      },
      {
        title: 'Credit Balance',
        value: (planData?.tokens || 0).toLocaleString(),
        change: 'Active',
        trend: 'up',
        icon: FaCoins,
        color: 'bg-green-500',
      },
    ];
  };

  // Fetch chart data for last 7 days
  const fetchChartData = async () => {
    if (DEMO_MODE) {
      // Generate last 7 days with dates in "28 Nov" format
      const mockChartData = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const dateLabel = `${day} ${month}`;
        
        // Fixed mock data values
        const chatsValues = [245, 198, 267, 223, 289, 156, 178];
        const visitorsValues = [82, 71, 95, 88, 102, 64, 69];
        const index = 6 - i;
        
        mockChartData.push({
          date: dateLabel,
          chats: chatsValues[index],
          visitors: visitorsValues[index],
        });
      }
      
      setChatsChartData(mockChartData);
      setVisitorsChartData(mockChartData);
      return;
    }
    
    // Fetch real analytics data from backend
    try {
      const response = await authAPI.getAnalytics('7days');
      if (response?.success && response?.data?.chartData) {
        // Transform backend data to chart format
        // Backend returns: { date: "2025-11-28", count: 123 }
        // Chart needs: { date: "28 Nov", chats: 123, visitors: X }
        
        // Create a map of all dates in the last 7 days
        const dateMap = new Map();
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateKey = date.toISOString().split('T')[0]; // "2025-11-28"
          const day = date.getDate();
          const month = date.toLocaleDateString('en-US', { month: 'short' });
          dateMap.set(dateKey, {
            date: `${day} ${month}`,
            chats: 0,
            visitors: 0,
          });
        }
        
        // Fill in actual chats data from backend
        response.data.chartData.forEach(item => {
          if (dateMap.has(item.date)) {
            const existing = dateMap.get(item.date);
            existing.chats = item.count || 0;
          }
        });
        
        // Fill in actual visitors data from backend
        if (response.data.visitorsData) {
          response.data.visitorsData.forEach(item => {
            if (dateMap.has(item.date)) {
              const existing = dateMap.get(item.date);
              existing.visitors = item.count || 0;
            }
          });
        }
        
        // Convert map to array maintaining order
        const chartData = Array.from(dateMap.values());
        
        setChatsChartData(chartData);
        setVisitorsChartData(chartData);
      }
    } catch (err) {

      setChatsChartData([]);
      setVisitorsChartData([]);
    }
  };

  // Fetch top chats data
  const fetchTopChats = async () => {
    try {
      setTopChatsLoading(true);
      
      if (DEMO_MODE) {
        // Simulate network delay for demo mode
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data for top chats
        const mockTopChats = [
          {
            id: 'chat-1',
            visitorName: 'Sarah Johnson',
            visitorId: 'visitor-001',
            lastMessage: 'Thank you so much for your help! This is exactly what I needed.',
            messageCount: 24,
            duration: 1245, // seconds
            status: 'completed',
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            sentiment: 'positive',
          },
          {
            id: 'chat-2',
            visitorName: 'Michael Chen',
            visitorId: 'visitor-002',
            lastMessage: 'Can you send me more details about the pricing plans?',
            messageCount: 18,
            duration: 892,
            status: 'active',
            timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
            sentiment: 'neutral',
          },
          {
            id: 'chat-3',
            visitorName: 'Emily Rodriguez',
            visitorId: 'visitor-003',
            lastMessage: 'I\'m having trouble with my account login. Can you help?',
            messageCount: 31,
            duration: 1567,
            status: 'completed',
            timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            sentiment: 'neutral',
          },
          {
            id: 'chat-4',
            visitorName: 'David Kim',
            visitorId: 'visitor-004',
            lastMessage: 'Great! I\'ll proceed with the premium plan then.',
            messageCount: 15,
            duration: 678,
            status: 'completed',
            timestamp: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
            sentiment: 'positive',
          },
        ];
        setTopChats(mockTopChats);
        return;
      }
      
      // Fetch real sessions from backend
      const response = await authAPI.getSessions('7days');

      if (response?.success && response?.data?.sessions) {
        // Transform sessions data to top chats format
        // Sort by message count (most messages first) and take top 4
        const sessions = response.data.sessions
          .filter(s => s.messages && s.messages.length > 0)
          .sort((a, b) => (b.messages?.length || 0) - (a.messages?.length || 0))
          .slice(0, 4)
          .map((session, index) => {
            const messages = session.messages || [];
            const lastMsg = messages[messages.length - 1];
            const firstMsg = messages[0];

            return {
              id: session.session_id || `session-${index}`,
              visitorId: session.session_id,
              lastMessage: lastMsg?.content || 'No message',
              messageCount: messages.length,
              duration: session.duration || 0,
              status: 'completed',
              timestamp: lastMsg?.timestamp || firstMsg?.timestamp || new Date().toISOString(),
              messages: messages, // Store full messages for modal
            };
          });

        setTopChats(sessions);
      }
    } catch (err) {

      setTopChats([]);
    } finally {
      setTopChatsLoading(false);
    }
  };

  // Get complete chat conversation (mock data)
  const getChatConversation = (chatId) => {
    // For real data, the messages are already stored in the chat object from topChats
    if (!DEMO_MODE) {
      const chat = topChats.find(c => c.id === chatId);
      if (chat && chat.messages) {
        const messages = chat.messages.map((msg, idx) => ({
          id: `msg-${idx}`,
          role: msg.sender === 'bot' ? 'assistant' : 'user',
          content: msg.content || '',
          timestamp: msg.timestamp,
        }));
        // Sort by timestamp ascending (oldest first)
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return messages;
      }
      return [];
    }

    // Mock conversation data
    const conversations = {
      'chat-1': [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Hello! Welcome to our support. How can I assist you today?',
          timestamp: new Date(Date.now() - 1245000).toISOString(),
        },
        {
          id: 'msg-2',
          role: 'user',
          content: 'Hi, I\'m looking for information about your premium features.',
          timestamp: new Date(Date.now() - 1230000).toISOString(),
        },
        {
          id: 'msg-3',
          role: 'assistant',
          content: 'I\'d be happy to help! Our premium plan includes advanced analytics, priority support, and custom integrations. Would you like to know more about any specific feature?',
          timestamp: new Date(Date.now() - 1215000).toISOString(),
        },
        {
          id: 'msg-4',
          role: 'user',
          content: 'What about the pricing?',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
        },
        {
          id: 'msg-5',
          role: 'assistant',
          content: 'Our premium plan is $99/month or $990/year (save 17%). It includes all features plus unlimited API calls and dedicated account management.',
          timestamp: new Date(Date.now() - 1185000).toISOString(),
        },
        {
          id: 'msg-6',
          role: 'user',
          content: 'That sounds reasonable. Can I try it before committing?',
          timestamp: new Date(Date.now() - 1170000).toISOString(),
        },
        {
          id: 'msg-7',
          role: 'assistant',
          content: 'Absolutely! We offer a 14-day free trial with full access to all premium features. No credit card required. Would you like me to set that up for you?',
          timestamp: new Date(Date.now() - 1155000).toISOString(),
        },
        {
          id: 'msg-8',
          role: 'user',
          content: 'Yes, please! That would be great.',
          timestamp: new Date(Date.now() - 1140000).toISOString(),
        },
        {
          id: 'msg-9',
          role: 'assistant',
          content: 'Perfect! I\'ve started your free trial. You\'ll receive an email with setup instructions. Is there anything else I can help you with?',
          timestamp: new Date(Date.now() - 1125000).toISOString(),
        },
        {
          id: 'msg-10',
          role: 'user',
          content: 'Thank you so much for your help! This is exactly what I needed.',
          timestamp: new Date(Date.now() - 1110000).toISOString(),
        },
      ],
      'chat-2': [
        {
          id: 'msg-11',
          role: 'assistant',
          content: 'Hello! How can I help you today?',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'msg-12',
          role: 'user',
          content: 'I\'m interested in your service. Can you tell me more?',
          timestamp: new Date(Date.now() - 1785000).toISOString(),
        },
        {
          id: 'msg-13',
          role: 'assistant',
          content: 'Of course! We offer a comprehensive platform with multiple plans. What specific aspect would you like to know about?',
          timestamp: new Date(Date.now() - 1770000).toISOString(),
        },
        {
          id: 'msg-14',
          role: 'user',
          content: 'Can you send me more details about the pricing plans?',
          timestamp: new Date(Date.now() - 1755000).toISOString(),
        },
      ],
      'chat-3': [
        {
          id: 'msg-15',
          role: 'assistant',
          content: 'Hi there! I\'m here to help. What can I do for you?',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'msg-16',
          role: 'user',
          content: 'I\'m having trouble with my account login. Can you help?',
          timestamp: new Date(Date.now() - 7185000).toISOString(),
        },
        {
          id: 'msg-17',
          role: 'assistant',
          content: 'I\'m sorry to hear you\'re having login issues. Let me help you troubleshoot. Have you tried resetting your password?',
          timestamp: new Date(Date.now() - 7170000).toISOString(),
        },
        {
          id: 'msg-18',
          role: 'user',
          content: 'Yes, I tried that but I\'m not receiving the reset email.',
          timestamp: new Date(Date.now() - 7155000).toISOString(),
        },
        {
          id: 'msg-19',
          role: 'assistant',
          content: 'Let me check your account. Can you verify the email address you\'re using?',
          timestamp: new Date(Date.now() - 7140000).toISOString(),
        },
        {
          id: 'msg-20',
          role: 'user',
          content: 'It\'s emily.rodriguez@email.com',
          timestamp: new Date(Date.now() - 7125000).toISOString(),
        },
        {
          id: 'msg-21',
          role: 'assistant',
          content: 'I see the issue. The reset emails might be going to spam. I\'ve sent a new reset link and also updated your account settings. Please check your spam folder.',
          timestamp: new Date(Date.now() - 7110000).toISOString(),
        },
        {
          id: 'msg-22',
          role: 'user',
          content: 'Found it! Thank you so much!',
          timestamp: new Date(Date.now() - 7095000).toISOString(),
        },
      ],
      'chat-4': [
        {
          id: 'msg-23',
          role: 'assistant',
          content: 'Welcome! How can I assist you today?',
          timestamp: new Date(Date.now() - 5400000).toISOString(),
        },
        {
          id: 'msg-24',
          role: 'user',
          content: 'I want to upgrade to premium.',
          timestamp: new Date(Date.now() - 5385000).toISOString(),
        },
        {
          id: 'msg-25',
          role: 'assistant',
          content: 'Great choice! The premium plan offers advanced features. Would you like monthly or annual billing?',
          timestamp: new Date(Date.now() - 5370000).toISOString(),
        },
        {
          id: 'msg-26',
          role: 'user',
          content: 'Annual sounds good. What\'s the price?',
          timestamp: new Date(Date.now() - 5355000).toISOString(),
        },
        {
          id: 'msg-27',
          role: 'assistant',
          content: 'Annual is $990/year, which saves you 17% compared to monthly. I can set that up for you right now.',
          timestamp: new Date(Date.now() - 5340000).toISOString(),
        },
        {
          id: 'msg-28',
          role: 'user',
          content: 'Great! I\'ll proceed with the premium plan then.',
          timestamp: new Date(Date.now() - 5325000).toISOString(),
        },
      ],
    };

    return conversations[chatId] || [];
  };

  const handleChatClick = (chat) => {
    setSelectedChat(chat);
    setShowChatModal(true);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">Error loading dashboard</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpiData = calculateKPIs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>AI Chat Agent Dashboard</span>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
            Dashboard Overview
          </h1>
          <p className="mt-2 text-sm text-zinc-500 max-w-xl">
            Monitor your chatbot performance, user engagement, and plan status.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          const changeColor = kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500';
          const isHighlighted = kpi.title === 'Total Chats' || kpi.title === 'Total Visitors';
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient"
            >
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                      {kpi.title}
                    </p>
                    <div className={`text-xl font-semibold tabular-nums ${
                      kpi.warning ? "text-red-500" : "text-zinc-900"
                    }`}>
                      {kpi.value}
                    </div>
                  </div>
                  <div
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white ${
                      isHighlighted && "border-emerald-200 bg-gradient-to-br from-emerald-100 to-teal-100"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isHighlighted ? "text-emerald-500" : "text-zinc-500"
                      }`}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Status</span>
                  <span className={`font-medium ${
                    kpi.warning ? 'text-red-500' : changeColor
                  }`}>
                    {kpi.change}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Chats Cards + FAQ/Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Chats Cards */}
        <div className="lg:col-span-2 glass-card flex flex-col min-h-[376px]">
          <div className="flex items-center gap-2 mb-4 px-6 pt-6">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-sm">
              <FaComments />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Top Chats
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 pb-6 flex-1">
            {topChatsLoading ? (
              // Skeleton loading cards
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="glass-card p-5 border border-zinc-200 rounded-xl flex flex-col animate-pulse"
                >
                  <div className="flex-1 mb-4 space-y-2">
                    <div className="h-4 bg-zinc-200 rounded w-full" />
                    <div className="h-4 bg-zinc-200 rounded w-5/6" />
                    <div className="h-4 bg-zinc-200 rounded w-4/6" />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-100">
                    <div className="h-3 bg-zinc-200 rounded w-20" />
                    <div className="h-3 bg-zinc-200 rounded w-1" />
                    <div className="h-3 bg-zinc-200 rounded w-12" />
                    <div className="h-3 bg-zinc-200 rounded w-1" />
                    <div className="h-3 bg-zinc-200 rounded w-16" />
                  </div>
                </div>
              ))
            ) : topChats.length > 0 ? (
              topChats.map((chat) => {
                const formatDuration = (seconds) => {
                  const mins = Math.floor(seconds / 60);
                  return `${mins}m`;
                };
                const formatTime = (timestamp) => {
                  const date = new Date(timestamp);
                  const now = new Date();
                  const diffMs = now - date;
                  const diffMins = Math.floor(diffMs / 60000);
                  if (diffMins < 60) return `${diffMins}m ago`;
                  const diffHours = Math.floor(diffMins / 60);
                  if (diffHours < 24) return `${diffHours}h ago`;
                  return date.toLocaleDateString();
                };
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleChatClick(chat)}
                    className="glass-card p-5 cursor-pointer hover:shadow-lg transition-all border border-zinc-200 hover:border-emerald-300 rounded-xl flex flex-col"
                  >
                    <div className="flex-1 mb-4">
                      <div className="text-sm text-zinc-700 line-clamp-3 leading-relaxed prose prose-sm prose-zinc max-w-none [&_p]:m-0 [&_strong]:text-zinc-700 [&_strong]:font-semibold [&_em]:text-zinc-600">
                        <ReactMarkdown>{chat.lastMessage}</ReactMarkdown>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500 pt-3 border-t border-zinc-100">
                      <span className="font-medium">{chat.messageCount} messages</span>
                      <span className="text-zinc-400">•</span>
                      <span>{formatDuration(chat.duration)}</span>
                      <span className="text-zinc-400">•</span>
                      <span>{formatTime(chat.timestamp)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 flex items-center justify-center h-32 text-zinc-500 text-sm">
                No chat data available yet
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Privacy Policy Card */}
          <div className="glass-card p-4 flex flex-col min-h-[180px]">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FaFileAlt className="text-emerald-500" size={18} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">
                Privacy Policy
              </h3>
            </div>
            <p className="text-sm text-zinc-500 mb-3">
              Read how we safeguard your data and respect your privacy.
            </p>
            <a
              href="/pdfs/Privacy_Policy.pdf"
              download="Privacy_Policy.pdf"
              className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 text-sm font-medium text-zinc-950 hover:brightness-105 transition-all"
            >
              <FaDownload size={14} />
              <span>Download Privacy Policy PDF</span>
            </a>
          </div>

          {/* Terms & Conditions Card */}
          <div className="glass-card p-4 flex flex-col min-h-[180px]">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FaFileAlt className="text-emerald-500" size={18} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">
                Terms & Conditions
              </h3>
            </div>
            <p className="text-sm text-zinc-500 mb-3">
              Latest policy and compliance guidelines
            </p>
            <a
              href="/pdfs/T&C.pdf"
              download="Terms_and_Conditions.pdf"
              className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 text-sm font-medium text-zinc-950 hover:brightness-105 transition-all"
            >
              <FaDownload size={14} />
              <span>Download Terms PDF</span>
            </a>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Chats per Day */}
        <div className="glass-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-200/70 px-6 py-4 md:px-6 md:py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-sm">
                <FaComments />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Chats per Day
              </h2>
            </div>
            <p className="text-xs md:text-sm text-zinc-500">
              Last 7 days
            </p>
          </div>
          <div className="px-4 pb-4 pt-3 md:px-6 md:pt-4 md:pb-6">
            {chatsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chatsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#71717a" 
                    tick={{ fontSize: 11 }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar dataKey="chats" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-zinc-500 text-sm">
                No data available yet
              </div>
            )}
          </div>
        </div>

        {/* Line Chart - Visitors per Day */}
        <div className="glass-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-200/70 px-6 py-4 md:px-6 md:py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-sm">
                <FaUsers />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Visitors per Day
              </h2>
            </div>
            <p className="text-xs md:text-sm text-zinc-500">
              Last 7 days
            </p>
          </div>
          <div className="px-4 pb-4 pt-3 md:px-6 md:pt-4 md:pb-6">
            {visitorsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={visitorsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#71717a" 
                    tick={{ fontSize: 11 }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="visitors" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-zinc-500 text-sm">
                No data available yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Conversation Modal */}
      {showChatModal && selectedChat && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => {
            setShowChatModal(false);
            setSelectedChat(null);
          }}
        >
          <div 
            className="glass-card rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden bg-white border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <FaComments />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900">
                      Chat Conversation
                    </h2>
                    <p className="text-sm text-zinc-500">
                      {selectedChat.messageCount} messages • {Math.floor(selectedChat.duration / 60)}m duration
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowChatModal(false);
                    setSelectedChat(null);
                  }}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {getChatConversation(selectedChat.id).map((message, index, allMessages) => {
                const isUser = message.role === 'user';
                const prevMessage = index > 0 ? allMessages[index - 1] : null;
                const nextMessage = index < allMessages.length - 1 ? allMessages[index + 1] : null;

                // Check if this message is part of a group (same sender as prev/next)
                const isFirstInGroup = !prevMessage || prevMessage.role !== message.role;
                const isLastInGroup = !nextMessage || nextMessage.role !== message.role;

                // Determine spacing: larger gap between different senders, smaller gap within same sender
                const marginTop = index === 0 ? '' : isFirstInGroup ? 'mt-4' : 'mt-1';

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${marginTop}`}
                  >
                    {/* Avatar - only show for first message in group */}
                    {isFirstInGroup ? (
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                        isUser
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {isUser ? <FaUser size={12} /> : <FaRobot size={12} />}
                      </div>
                    ) : (
                      <div className="w-8 flex-shrink-0" />
                    )}

                    <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block max-w-[80%] rounded-2xl px-4 py-2 ${
                        isUser
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-100 text-zinc-900'
                      }`}>
                        <div className={`text-sm whitespace-pre-wrap prose prose-sm max-w-none ${
                          isUser
                            ? 'prose-invert [&_strong]:text-white [&_em]:text-emerald-100'
                            : '[&_strong]:text-zinc-700 [&_strong]:font-semibold [&_em]:text-zinc-600'
                        } [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0`}>
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Timestamp - only show for last message in group */}
                      {isLastInGroup && (
                        <p className={`text-xs text-zinc-400 mt-1 ${
                          isUser ? 'text-right' : 'text-left'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
