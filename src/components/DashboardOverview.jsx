import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  FaPhone, 
  FaCheckCircle, 
  FaUserPlus, 
  FaRupeeSign,
  FaArrowUp,
  FaArrowDown,
  FaPlay,
  FaPause,
  FaSpinner,
  FaDownload,
  FaFileAlt,
  FaBullseye,
  FaCoins,
  FaTimes,
  FaCalendar,
  FaTimesCircle
} from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiPhoneCall } from 'react-icons/fi';
import { analyticsAPI, wsAPI, campaignAPI, creditsAPI, callAPI } from '../services/api';

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [wsStats, setWsStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [creditBalance, setCreditBalance] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callDetails, setCallDetails] = useState(null);
  const [loadingCallDetails, setLoadingCallDetails] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id || user.id;

      // Use Promise.allSettled to ensure all API calls complete even if some fail
      const results = await Promise.allSettled([
        // Fetch unified dashboard analytics
        analyticsAPI.getDashboard(userId).then(res => res.data).catch(err => {
          console.warn('Dashboard analytics not available:', err);
          return null;
        }),
        // Fetch WebSocket stats for real-time metrics
        wsAPI.getStats().catch(err => {
          console.warn('WebSocket stats not available:', err);
          return null;
        }),
        // Fetch campaigns
        campaignAPI.list().then(res => {
          const campaignsData = res.data;
          if (Array.isArray(campaignsData)) {
            return campaignsData;
          } else if (campaignsData && Array.isArray(campaignsData.campaigns)) {
            return campaignsData.campaigns;
          } else {
            console.warn('Campaigns response is not an array:', campaignsData);
            return [];
          }
        }).catch(err => {
          console.warn('Campaigns data not available:', err);
          return [];
        }),
        // Fetch credit balance
        creditsAPI.getBalance().then(res => res.data?.credits || 0).catch(err => {
          console.warn('Credit balance not available:', err);
          return 0;
        }),
      ]);

      // Set data from results
      if (results[0].status === 'fulfilled' && results[0].value) {
        console.log('Dashboard data received:', results[0].value);
        setDashboardData(results[0].value);
      } else {
        console.warn('Dashboard data not received:', results[0]);
      }
      if (results[1].status === 'fulfilled' && results[1].value) {
        setWsStats(results[1].value);
      }
      if (results[2].status === 'fulfilled') {
        setCampaigns(results[2].value || []);
      }
      if (results[3].status === 'fulfilled') {
        setCreditBalance(results[3].value);
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
      // Always set loading to false, even if there are errors
      setLoading(false);
    }
  };

  // Calculate KPIs from analytics data
  const calculateKPIs = () => {
    const campaignsArray = Array.isArray(campaigns) ? campaigns : [];
    const totalCampaigns = campaignsArray.length || 0;
    const activeCampaigns = campaignsArray.filter(c => c.status === 'active' || c.status === 'running').length || 0;

    // Get data from unified dashboard analytics
    const totalCalls = dashboardData?.totalCalls || 0;
    const completedCalls = dashboardData?.completedCalls || 0;

    // Use actual credit balance from API
    const credits = creditBalance !== null ? creditBalance : 0;
    const isLowCredits = credits < 100 && credits > 0;
    const isNoCredits = credits <= 0;

    return [
      {
        title: 'Validity',
        value: 'Dec 15, 2026',
        change: '+0%',
        trend: 'up',
        icon: FaCalendar,
        color: 'bg-blue-500',
      },
      {
        title: 'Active Campaigns',
        value: activeCampaigns.toLocaleString(),
        change: '+0%',
        trend: 'up',
        icon: FaPlay,
        color: 'bg-green-500',
      },
      {
        title: 'Total Calls',
        value: totalCalls.toLocaleString(),
        change: '+0%',
        trend: 'up',
        icon: FaPhone,
        color: 'bg-purple-500',
      },
      {
        title: 'Credit Balance',
        value: credits.toLocaleString(),
        change: isNoCredits ? 'Out of credits' : isLowCredits ? 'Low balance' : 'Active',
        trend: isNoCredits ? 'down' : isLowCredits ? 'down' : 'up',
        icon: FaCoins,
        color: isNoCredits ? 'bg-red-500' : isLowCredits ? 'bg-yellow-500' : 'bg-green-500',
        warning: isNoCredits || isLowCredits,
      },
    ];
  };

  // Prepare chart data from analytics
  const prepareChartData = () => {
    if (!dashboardData) {
      console.log('No dashboard data available');
      return { callOutcomeData: [], callsOverTimeData: [] };
    }

    console.log('Preparing chart data from:', dashboardData);

    const totalCalls = dashboardData.totalCalls || 0;
    const completedCalls = dashboardData.completedCalls || 0;
    const failedCalls = dashboardData.failedCalls || 0;
    const inProgressCalls = dashboardData.inProgressCalls || 0;

    const callOutcomeData = [
      { name: 'Total Calls', value: totalCalls, color: '#2196F3' },
      { name: 'Completed', value: completedCalls, color: '#4CAF50' },
      { name: 'In Progress', value: inProgressCalls, color: '#FF9800' },
      { name: 'Failed', value: failedCalls, color: '#F44336' },
    ];

    // Use trends data if available, otherwise use simplified mock data
    const callsOverTimeData = dashboardData.callTrends || [
      { time: '9 AM', calls: Math.floor(totalCalls * 0.1) },
      { time: '10 AM', calls: Math.floor(totalCalls * 0.15) },
      { time: '11 AM', calls: Math.floor(totalCalls * 0.2) },
      { time: '12 PM', calls: Math.floor(totalCalls * 0.18) },
      { time: '1 PM', calls: Math.floor(totalCalls * 0.12) },
      { time: '2 PM', calls: Math.floor(totalCalls * 0.15) },
      { time: '3 PM', calls: Math.floor(totalCalls * 0.18) },
      { time: '4 PM', calls: Math.floor(totalCalls * 0.2) },
    ];

    console.log('Chart data prepared:', { callOutcomeData, callsOverTimeData });

    return { callOutcomeData, callsOverTimeData };
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
  const { callOutcomeData, callsOverTimeData } = prepareChartData();

  // Get top phone numbers from campaigns in current month (this month)
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Get all campaigns sorted by date (most recent first)
  const allCampaignsSorted = campaigns
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.startDate || a.updatedAt || 0);
      const dateB = new Date(b.createdAt || b.startDate || b.updatedAt || 0);
      return dateB - dateA; // Most recent first
    });

  // Get campaigns from current month (this month)
  const recentCampaigns = allCampaignsSorted.filter(campaign => {
    const campaignDate = new Date(campaign.createdAt || campaign.startDate || campaign.updatedAt || 0);
    return campaignDate >= currentMonthStart && campaignDate <= currentMonthEnd;
  });

  // Extract top 4 phone numbers from recent campaigns (or all campaigns if no recent ones)
  const campaignsToUse = recentCampaigns.length > 0 ? recentCampaigns : allCampaignsSorted.slice(0, 4);
  const topPhoneNumbers = [];
  
  for (const campaign of campaignsToUse) {
    const phoneNumbers = campaign.phoneNumbers || [];
    if (phoneNumbers.length === 0) continue;
    
    for (const phoneNumber of phoneNumbers) {
      if (topPhoneNumbers.length >= 4) break;
      
      // Get call duration from dashboard data or use default
      const callDuration = dashboardData?.averageDuration 
        ? `${Math.floor(dashboardData.averageDuration / 60)}:${String(dashboardData.averageDuration % 60).padStart(2, '0')}s`
        : '00:45s';
      
      topPhoneNumbers.push({
        id: `${campaign._id || campaign.id}-${phoneNumber}`,
        phoneNumber: phoneNumber,
        campaignName: campaign.name,
        campaignId: campaign._id || campaign.id,
        duration: callDuration,
        createdAt: campaign.createdAt || campaign.startDate,
      });
    }
    if (topPhoneNumbers.length >= 4) break;
  }

  // Add dummy data for testing if no phone numbers found
  if (topPhoneNumbers.length === 0) {
    const dummyDurations = ['00:45s', '00:57s', '00:36s', '01:12s'];
    const dummyCampaignName = 'Premium Upsell List'; // Same campaign for all
    const dummyPhones = ['+91 98765 43210', '+91 98765 43211', '+91 98765 43212', '+91 98765 43213'];
    
    for (let i = 0; i < 4; i++) {
      topPhoneNumbers.push({
        id: `dummy-${i}`,
        phoneNumber: dummyPhones[i],
        campaignName: dummyCampaignName, // Same campaign for all numbers
        campaignId: 'dummy-campaign-1',
        duration: dummyDurations[i],
        createdAt: new Date(),
      });
    }
  }

  const credits = creditBalance !== null ? creditBalance : 0;
  const isLowCredits = credits < 100 && credits > 0;
  const isNoCredits = credits <= 0;

  const handleCampaignClick = async (campaignId) => {
    try {
      setLoadingDetails(true);
      setSelectedCampaign(campaignId);
      setShowCampaignModal(true);
      
      // Fetch campaign details
      const response = await campaignAPI.get(campaignId);
      const campaignData = response.data || response;
      setCampaignDetails(campaignData);
    } catch (err) {
      console.error('Error fetching campaign details:', err);
      // Still show modal with basic info from the campaign list
      const campaign = campaigns.find(c => (c._id || c.id) === campaignId);
      if (campaign) {
        setCampaignDetails(campaign);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePhoneClick = async (phoneNumber, campaignName) => {
    try {
      setLoadingCallDetails(true);
      setSelectedPhoneNumber(phoneNumber);
      setShowCallModal(true);
      
      // Fetch call details by phone number
      const response = await callAPI.getAllCalls({ 
        phoneNumbers: [phoneNumber],
        limit: 1,
        sort: 'desc'
      });
      
      const calls = response.data?.calls || response.data || [];
      if (calls.length > 0) {
        setCallDetails({
          ...calls[0],
          campaignName: campaignName
        });
      } else {
        // If no call found, show basic info
        setCallDetails({
          phoneNumber: phoneNumber,
          campaignName: campaignName,
          status: 'No call data found'
        });
      }
    } catch (err) {
      console.error('Error fetching call details:', err);
      // Show basic info even if API fails
      setCallDetails({
        phoneNumber: phoneNumber,
        campaignName: campaignName,
        status: 'Error loading call details'
      });
    } finally {
      setLoadingCallDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Live Voice AI Operations</span>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
            Realtime Overview
          </h1>
          <p className="mt-2 text-sm text-zinc-500 max-w-xl">
            Monitor calls, agents, and system health in one control surface.
          </p>
        </div>
      </div>

      {/* Credit Warning Banner */}
      {isNoCredits && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80">
          <div className="flex items-center">
            <FaCoins className="text-red-500 mr-3" size={24} />
            <div>
              <h3 className="text-red-800 font-semibold">No Credits Available</h3>
              <p className="text-red-600 text-sm mt-1">
                Your account has run out of credits. You cannot make or receive calls until credits are added.
                Please contact your administrator to add credits to your account.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLowCredits && (
        <div className="glass-card border-l-4 border-amber-400/80 bg-amber-50/80">
          <div className="flex items-center">
            <FaCoins className="text-yellow-500 mr-3" size={24} />
            <div>
              <h3 className="text-yellow-800 font-semibold">Low Credit Balance</h3>
              <p className="text-yellow-600 text-sm mt-1">
                You have {credits} credits remaining. Consider adding more credits to avoid service interruption.
                (1 credit = 1 second of call time)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          const isCredit = kpi.title === 'Credit Balance';
          const changeColor = kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500';
          const isEmerald = kpi.title === 'Active Campaigns' || kpi.title === 'Credit Balance';
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
                      isEmerald && "border-emerald-200 bg-gradient-to-br from-emerald-100 to-teal-100"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isEmerald ? "text-emerald-500" : "text-zinc-500"
                      }`}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>
                    {kpi.title === 'Credit Balance' ? 'Status' : kpi.title === 'Validity' ? '' : 'vs yesterday'}
                  </span>
                  {kpi.title !== 'Validity' && (
                    <span className={`font-medium ${
                      isCredit && kpi.warning ? 'text-red-500' : changeColor
                    }`}>
                      {kpi.change}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Call this month as live wave cards + FAQ/Terms */}
      {(topPhoneNumbers.length > 0 || campaigns.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-200/70 px-6 py-4 md:px-6 md:py-5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-sm">
                  ●
                </div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  Top calls this month
                </h2>
              </div>
              <p className="text-xs md:text-sm text-zinc-500">
                Top phone numbers from recent campaigns
              </p>
            </div>
            <div className="px-4 pb-4 pt-3 md:px-6 md:pt-4 md:pb-6">
              {topPhoneNumbers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {topPhoneNumbers.map((phoneData, index) => (
                    <TopCallCard
                      key={phoneData.id}
                      phoneData={phoneData}
                      index={index}
                      onClick={() => handlePhoneClick(phoneData.phoneNumber, phoneData.campaignName)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  No phone numbers found in recent campaigns
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* FAQ Card */}
            <div className="glass-card p-4 flex flex-col min-h-[180px]">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <FaFileAlt className="text-emerald-500" size={18} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  FAQ
                </h3>
              </div>
              <p className="text-sm text-zinc-500 mb-3">
                Common questions about AI Calling Agent
              </p>
              <button
                className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 text-sm font-medium text-zinc-950 hover:brightness-105 transition-all"
              >
                <FaDownload size={14} />
                <span>Download FAQ PDF</span>
              </button>
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
              <button
                className="mt-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 text-sm font-medium text-zinc-950 hover:brightness-105 transition-all"
              >
                <FaDownload size={14} />
                <span>Download Terms PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Call Outcome Funnel */}
        <div className="glass-panel p-4 md:p-5">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4">
            Call Outcome Breakdown
          </h3>
          {callOutcomeData && callOutcomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={callOutcomeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#71717a" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#71717a" 
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-zinc-500 text-xs">
              No data available
            </div>
          )}
        </div>

        {/* Calls Over Time */}
        <div className="glass-panel p-4 md:p-5">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4">
            Calls Over Time
          </h3>
          {callsOverTimeData && callsOverTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={callsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  stroke="#71717a" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#71717a" 
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 3.5 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-zinc-500 text-xs">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Campaign Details Modal */}
      {showCampaignModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            zIndex: 1000
          }}
          onClick={() => {
            setShowCampaignModal(false);
            setSelectedCampaign(null);
            setCampaignDetails(null);
          }}
        >
          <div 
            className="glass-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white border border-zinc-200" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'relative', 
              zIndex: 1001,
              margin: 'auto'
            }}
          >
            <div className="p-6 border-b border-zinc-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Campaign Details
                </h2>
                <button
                  onClick={() => {
                    setShowCampaignModal(false);
                    setSelectedCampaign(null);
                    setCampaignDetails(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            {loadingDetails ? (
              <div className="p-6 flex items-center justify-center">
                <FaSpinner className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : campaignDetails ? (
              <div className="p-6 space-y-6">
                {/* Campaign Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Campaign ID</p>
                      <p className="text-sm font-semibold text-zinc-900">{campaignDetails._id || campaignDetails.id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Campaign Name</p>
                      <p className="text-sm font-semibold text-zinc-900">{campaignDetails.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Created At</p>
                      <p className="text-sm text-zinc-700">
                        {campaignDetails.createdAt 
                          ? new Date(campaignDetails.createdAt).toLocaleString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric', 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Start Time</p>
                      <p className="text-sm text-zinc-700">
                        {campaignDetails.startTime || campaignDetails.startDate 
                          ? new Date(campaignDetails.startTime || campaignDetails.startDate).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">End Time</p>
                      <p className="text-sm text-zinc-700">
                        {campaignDetails.endTime || campaignDetails.endDate 
                          ? new Date(campaignDetails.endTime || campaignDetails.endDate).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Status</p>
                      <div>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          campaignDetails.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : campaignDetails.status === 'paused'
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : campaignDetails.status === 'completed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-zinc-50 text-zinc-700 border border-zinc-200'
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {campaignDetails.status ? campaignDetails.status.charAt(0).toUpperCase() + campaignDetails.status.slice(1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Total Numbers</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {campaignDetails.totalCalls || campaignDetails.phoneNumbers?.length || campaignDetails.liveStats?.totalNumbers || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Active Calls</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {campaignDetails.liveStats?.activeCalls || campaignDetails.activeCalls || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Completed Calls</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {campaignDetails.completedCalls || campaignDetails.liveStats?.completed || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Failed Calls</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {campaignDetails.failedCalls || campaignDetails.liveStats?.failed || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download Contact Details Button */}
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <FaDownload size={16} />
                  <span>Download Contact Details</span>
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-zinc-500">
                No campaign details available
              </div>
            )}

            <div className="p-6 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => {
                  setShowCampaignModal(false);
                  setSelectedCampaign(null);
                  setCampaignDetails(null);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        ,
        document.body
      )}

      {/* Call Details Modal */}
      {showCallModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            zIndex: 1000
          }}
          onClick={() => {
            setShowCallModal(false);
            setSelectedPhoneNumber(null);
            setCallDetails(null);
          }}
        >
          <div 
            className="glass-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white border border-zinc-200" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'relative', 
              zIndex: 1001,
              margin: 'auto'
            }}
          >
            <div className="p-6 border-b border-zinc-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Call Details
                </h2>
                <button
                  onClick={() => {
                    setShowCallModal(false);
                    setSelectedPhoneNumber(null);
                    setCallDetails(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            {loadingCallDetails ? (
              <div className="p-6 flex items-center justify-center">
                <FaSpinner className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : callDetails ? (
              <div className="p-6 space-y-6">
                {/* Call Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Phone Number</p>
                      <p className="text-sm font-semibold text-zinc-900">{callDetails.phoneNumber || callDetails.toPhone || callDetails.fromPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Campaign</p>
                      <p className="text-sm font-semibold text-zinc-900">{callDetails.campaignName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Call ID</p>
                      <p className="text-sm text-zinc-700 font-mono">{callDetails.sessionId || callDetails.exotelCallSid || callDetails.callSid || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Started At</p>
                      <p className="text-sm text-zinc-700">
                        {callDetails.startedAt 
                          ? new Date(callDetails.startedAt).toLocaleString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric', 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })
                          : callDetails.createdAt
                          ? new Date(callDetails.createdAt).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Ended At</p>
                      <p className="text-sm text-zinc-700">
                        {callDetails.endedAt 
                          ? new Date(callDetails.endedAt).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Status</p>
                      <div>
                        {callDetails.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <FaCheckCircle className="h-3 w-3" />
                            Completed
                          </span>
                        ) : callDetails.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            <FaTimesCircle className="h-3 w-3" />
                            Failed
                          </span>
                        ) : callDetails.status === 'in-progress' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <FaSpinner className="h-3 w-3 animate-spin" />
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-zinc-50 text-zinc-700 border border-zinc-200">
                            {callDetails.status || 'Unknown'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Duration</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {callDetails.duration 
                          ? `${Math.floor(callDetails.duration / 60)}:${String(callDetails.duration % 60).padStart(2, '0')}s`
                          : callDetails.durationSec
                          ? `${Math.floor(callDetails.durationSec / 60)}:${String(callDetails.durationSec % 60).padStart(2, '0')}s`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Credits Consumed</p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {callDetails.creditsConsumed || callDetails.durationSec || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-1">Direction</p>
                      <p className="text-sm text-zinc-700">
                        {callDetails.direction === 'outbound' ? 'Outbound' : callDetails.direction === 'inbound' ? 'Inbound' : 'N/A'}
                      </p>
                    </div>
                    {callDetails.recordingUrl && (
                      <div>
                        <p className="text-sm font-medium text-zinc-500 mb-1">Recording</p>
                        <a 
                          href={callDetails.recordingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-600 hover:text-emerald-700 underline"
                        >
                          Listen to Recording
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transcript if available */}
                {callDetails.transcript && callDetails.transcript.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-zinc-500 mb-2">Transcript</p>
                    <div className="bg-zinc-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                        {callDetails.transcript}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-zinc-500">
                No call details available
              </div>
            )}

            <div className="p-6 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => {
                  setShowCallModal(false);
                  setSelectedPhoneNumber(null);
                  setCallDetails(null);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        ,
        document.body
      )}
    </div>
  );
};

function TopCallCard({ phoneData, index, onClick }) {
  const agentLabel = `Orbit-${index + 1}`;
  const phoneNumber = phoneData.phoneNumber || '';
  // Get first digit (skip + sign if present)
  const firstDigit = phoneNumber.replace(/^\+/, '').charAt(0) || (index + 1).toString();

  return (
    <div 
      className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/80 transition-all duration-200 hover:border-emerald-300 hover:shadow-emerald-100 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
            <FaPhone className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-900">
              {phoneNumber}
            </p>
            <p className="text-[11px] text-slate-500">{phoneData.campaignName}</p>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div className="mt-3">
        <Waveform />
      </div>

      {/* Bottom row */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <FiPhoneCall className="h-3 w-3 text-emerald-500" />
          <span>{phoneData.duration}</span>
        </div>
        <span className="text-slate-500">
          Agent: <span className="font-medium text-slate-700">{agentLabel}</span>
        </span>
      </div>
    </div>
  );
}

function Waveform() {
  return (
    <div className="flex items-end gap-0.5 h-10 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => {
        // Create varying base heights for each bar (20% to 60%)
        const baseHeight = 20 + (i % 8) * 5;
        return (
          <div
            key={i}
            className="wave-bar"
            style={{
              height: `${baseHeight}%`,
              animationDelay: `${i * 0.03}s`,
              animationDuration: `${1.5 + (i % 3) * 0.3}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default DashboardOverview;
