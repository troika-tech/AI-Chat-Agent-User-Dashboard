import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaPhone, FaCalendar, FaCheckCircle, FaTimesCircle, FaClock, FaSpinner, FaPlus, FaVolumeUp, FaFileAlt, FaEye, FaSortUp, FaSortDown } from 'react-icons/fa';
import { callAPI, campaignAPI } from '../services/api';

const Leads = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: '',
    endDate: '',
    hasKeywords: false,
  });
  const [dateSortOrder, setDateSortOrder] = useState('desc'); // 'desc' = new to old, 'asc' = old to new
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedCallData, setSelectedCallData] = useState(null);
  const [playingRecording, setPlayingRecording] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    status: 'new',
    notes: '',
    source: '',
  });

  // Keywords to detect in transcripts
  const KEYWORDS = ['proposal', 'quotes', 'quotation', 'quote', 'pricing', 'price', 'cost', 'estimate'];

  useEffect(() => {
    fetchLeads();
  }, [pagination.page, filters, dateSortOrder]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id || user.id;

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        userId: userId,
      };

      const response = await callAPI.getAllCalls(params);
      const calls = response.data?.calls || [];

      // Function to check for keywords in transcript
      const checkKeywordsInTranscript = (transcript) => {
        if (!transcript || !Array.isArray(transcript)) return { found: false, keywords: [] };
        
        const foundKeywords = [];
        const transcriptText = transcript
          .map(t => (t.text || t.content || '').toLowerCase())
          .join(' ');
        
        KEYWORDS.forEach(keyword => {
          if (transcriptText.includes(keyword.toLowerCase())) {
            foundKeywords.push(keyword);
          }
        });
        
        return {
          found: foundKeywords.length > 0,
          keywords: foundKeywords
        };
      };

      // Filter calls: Only include calls with keywords in transcript AND exclude failed/busy/no-answer calls
      const interestedCalls = calls.filter(call => {
        // Must have transcript
        if (!call.transcript || !Array.isArray(call.transcript) || call.transcript.length === 0) {
          return false;
        }
        
        // Must have keywords
        const keywordCheck = checkKeywordsInTranscript(call.transcript);
        if (!keywordCheck.found) {
          return false;
        }
        
        // Exclude failed, busy, no-answer calls - only show completed/interested calls
        if (['failed', 'busy', 'no-answer', 'canceled', 'user-ended', 'agent-ended'].includes(call.status)) {
          return false;
        }
        
        return true;
      });

      const leadsMap = new Map();
      const callDataMap = new Map(); // Store call data for each lead
      
      // Only process calls that have keywords and are not failed
      interestedCalls.forEach(call => {
        const phone = call.direction === 'outbound' ? call.toPhone : call.fromPhone;
        if (!phone) return;

        // Check for keywords in transcript (already filtered, but double-check)
        const keywordCheck = checkKeywordsInTranscript(call.transcript);
        if (!keywordCheck.found) return; // Skip if no keywords
        
        if (!leadsMap.has(phone)) {
          const lead = {
            _id: `lead-${phone}`,
            phoneNumber: phone,
            name: call.agentName || 'Unknown',
            email: '',
            status: 'contacted', // All leads here are interested (have keywords)
            lastCallDate: call.startedAt || call.createdAt,
            lastCallStatus: call.status,
            campaignName: call.campaignName || '',
            totalCalls: 1,
            notes: `Keywords detected: ${keywordCheck.keywords.join(', ')}`,
            source: call.campaignName || 'Manual',
            hasKeywords: true,
            detectedKeywords: keywordCheck.keywords,
            recordingUrl: call.recordingUrl || null,
            callId: call._id || call.callSid || call.sessionId,
            transcript: call.transcript || null,
            duration: call.durationSec || call.duration || call.callDuration || 0,
          };
          leadsMap.set(phone, lead);
          callDataMap.set(phone, call);
        } else {
          const lead = leadsMap.get(phone);
          lead.totalCalls += 1;
          
          // Merge keywords
          const existingKeywords = Array.isArray(lead.detectedKeywords) ? lead.detectedKeywords : [];
          const newKeywords = Array.isArray(keywordCheck.keywords) ? keywordCheck.keywords : [];
          lead.detectedKeywords = [...new Set([...existingKeywords, ...newKeywords])];
          lead.notes = `Keywords detected: ${lead.detectedKeywords.join(', ')}`;
          
          // Update with most recent call data (prefer calls with recording/transcript)
          const shouldUpdate = 
            new Date(call.startedAt || call.createdAt) > new Date(lead.lastCallDate) ||
            (call.recordingUrl && !lead.recordingUrl) ||
            (call.transcript && call.transcript.length > (lead.transcript?.length || 0));
            
          if (shouldUpdate) {
            lead.lastCallDate = call.startedAt || call.createdAt;
            lead.lastCallStatus = call.status;
            lead.duration = call.durationSec || call.duration || call.callDuration || lead.duration || 0;
            if (call.recordingUrl) {
              lead.recordingUrl = call.recordingUrl;
            }
            if (call.transcript) {
              lead.transcript = call.transcript;
            }
            lead.callId = call._id || call.callSid || call.sessionId;
            callDataMap.set(phone, call);
          }
        }
      });

      let leadsList = Array.from(leadsMap.values());

      // Add demo data if no leads found
      if (leadsList.length === 0) {
        const demoLeads = [
          {
            _id: 'demo-lead-1',
            phoneNumber: '+91 98765 43210',
            name: 'Rajesh Kumar',
            email: 'rajesh.kumar@example.com',
            status: 'contacted',
            lastCallDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            lastCallStatus: 'completed',
            campaignName: 'Product Inquiry Campaign',
            totalCalls: 3,
            notes: 'Keywords detected: proposal, quotes, pricing',
            source: 'Product Inquiry Campaign',
            hasKeywords: true,
            detectedKeywords: ['proposal', 'quotes', 'pricing'],
            recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            callId: 'demo-call-1',
            duration: 245,
            transcript: [
              { text: 'Hello, I am interested in your product proposal.', speaker: 'customer' },
              { text: 'Great! I can provide you with quotes for different packages.', speaker: 'agent' },
              { text: 'What is the pricing for the premium plan?', speaker: 'customer' },
              { text: 'Let me share the detailed quotation with you.', speaker: 'agent' }
            ],
          },
          {
            _id: 'demo-lead-2',
            phoneNumber: '+91 98765 43211',
            name: 'Priya Sharma',
            email: 'priya.sharma@example.com',
            status: 'contacted',
            lastCallDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            lastCallStatus: 'completed',
            campaignName: 'Sales Campaign',
            totalCalls: 2,
            notes: 'Keywords detected: quotation, estimate',
            source: 'Sales Campaign',
            hasKeywords: true,
            detectedKeywords: ['quotation', 'estimate'],
            recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            callId: 'demo-call-2',
            duration: 180,
            transcript: [
              { text: 'I need a quotation for your services.', speaker: 'customer' },
              { text: 'Sure, I can provide you with an estimate.', speaker: 'agent' },
              { text: 'When can I get the detailed quote?', speaker: 'customer' }
            ],
          },
          {
            _id: 'demo-lead-3',
            phoneNumber: '+91 98765 43212',
            name: 'Amit Patel',
            email: 'amit.patel@example.com',
            status: 'contacted',
            lastCallDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            lastCallStatus: 'completed',
            campaignName: 'Customer Acquisition',
            totalCalls: 1,
            notes: 'Keywords detected: proposal, cost',
            source: 'Customer Acquisition',
            hasKeywords: true,
            detectedKeywords: ['proposal', 'cost'],
            recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
            callId: 'demo-call-3',
            duration: 320,
            transcript: [
              { text: 'Can you send me a proposal?', speaker: 'customer' },
              { text: 'Absolutely! What is your budget range?', speaker: 'agent' },
              { text: 'I want to know the cost before making a decision.', speaker: 'customer' }
            ],
          },
          {
            _id: 'demo-lead-4',
            phoneNumber: '+91 98765 43213',
            name: 'Sneha Reddy',
            email: 'sneha.reddy@example.com',
            status: 'contacted',
            lastCallDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            lastCallStatus: 'completed',
            campaignName: 'Product Inquiry Campaign',
            totalCalls: 4,
            notes: 'Keywords detected: quotes, price',
            source: 'Product Inquiry Campaign',
            hasKeywords: true,
            detectedKeywords: ['quotes', 'price'],
            recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            callId: 'demo-call-4',
            duration: 195,
            transcript: [
              { text: 'I am looking for quotes on your premium package.', speaker: 'customer' },
              { text: 'I will share the price details with you.', speaker: 'agent' },
              { text: 'What is the best price you can offer?', speaker: 'customer' }
            ],
          },
          {
            _id: 'demo-lead-5',
            phoneNumber: '+91 98765 43214',
            name: 'Vikram Singh',
            email: 'vikram.singh@example.com',
            status: 'contacted',
            lastCallDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            lastCallStatus: 'completed',
            campaignName: 'Sales Campaign',
            totalCalls: 2,
            notes: 'Keywords detected: quotation, proposal',
            source: 'Sales Campaign',
            hasKeywords: true,
            detectedKeywords: ['quotation', 'proposal'],
            recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            callId: 'demo-call-5',
            duration: 275,
            transcript: [
              { text: 'I need a quotation for bulk orders.', speaker: 'customer' },
              { text: 'I can prepare a proposal for you.', speaker: 'agent' },
              { text: 'Please send the quotation by tomorrow.', speaker: 'customer' }
            ],
          },
        ];
        leadsList = demoLeads;
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        leadsList = leadsList.filter(lead =>
          lead.phoneNumber.toLowerCase().includes(searchLower) ||
          lead.name.toLowerCase().includes(searchLower) ||
          (lead.email && lead.email.toLowerCase().includes(searchLower))
        );
      }

      // Sort by date
      leadsList.sort((a, b) => {
        const dateA = new Date(a.lastCallDate || 0).getTime();
        const dateB = new Date(b.lastCallDate || 0).getTime();
        return dateSortOrder === 'desc' ? dateB - dateA : dateA - dateB; // desc = new to old, asc = old to new
      });

      const total = leadsList.length;
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedLeads = leadsList.slice(startIndex, endIndex);

      // Store call data map for later use
      setLeads(paginatedLeads.map(lead => ({
        ...lead,
        _callData: callDataMap.get(lead.phoneNumber) || null
      })));
      setPagination(prev => ({
        ...prev,
        total,
        pages: Math.ceil(total / pagination.limit),
      }));
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to load leads');
      
      // Add demo data on error as well
      const demoLeads = [
        {
          _id: 'demo-lead-1',
          phoneNumber: '+91 98765 43210',
          name: 'Rajesh Kumar',
          email: 'rajesh.kumar@example.com',
          status: 'contacted',
          lastCallDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          lastCallStatus: 'completed',
          campaignName: 'Product Inquiry Campaign',
          totalCalls: 3,
          notes: 'Keywords detected: proposal, quotes, pricing',
          source: 'Product Inquiry Campaign',
          hasKeywords: true,
          detectedKeywords: ['proposal', 'quotes', 'pricing'],
          recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          callId: 'demo-call-1',
          duration: 245,
          transcript: [
            { text: 'Hello, I am interested in your product proposal.', speaker: 'customer' },
            { text: 'Great! I can provide you with quotes for different packages.', speaker: 'agent' },
            { text: 'What is the pricing for the premium plan?', speaker: 'customer' },
            { text: 'Let me share the detailed quotation with you.', speaker: 'agent' }
          ],
        },
        {
          _id: 'demo-lead-2',
          phoneNumber: '+91 98765 43211',
          name: 'Priya Sharma',
          email: 'priya.sharma@example.com',
          status: 'contacted',
          lastCallDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          lastCallStatus: 'completed',
          campaignName: 'Sales Campaign',
          totalCalls: 2,
          notes: 'Keywords detected: quotation, estimate',
          source: 'Sales Campaign',
          hasKeywords: true,
          detectedKeywords: ['quotation', 'estimate'],
          recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
          callId: 'demo-call-2',
          duration: 180,
          transcript: [
            { text: 'I need a quotation for your services.', speaker: 'customer' },
            { text: 'Sure, I can provide you with an estimate.', speaker: 'agent' },
            { text: 'When can I get the detailed quote?', speaker: 'customer' }
          ],
        },
        {
          _id: 'demo-lead-3',
          phoneNumber: '+91 98765 43212',
          name: 'Amit Patel',
          email: 'amit.patel@example.com',
          status: 'contacted',
          lastCallDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          lastCallStatus: 'completed',
          campaignName: 'Customer Acquisition',
          totalCalls: 1,
          notes: 'Keywords detected: proposal, cost',
          source: 'Customer Acquisition',
          hasKeywords: true,
          detectedKeywords: ['proposal', 'cost'],
          recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
          callId: 'demo-call-3',
          duration: 320,
          transcript: [
            { text: 'Can you send me a proposal?', speaker: 'customer' },
            { text: 'Absolutely! What is your budget range?', speaker: 'agent' },
            { text: 'I want to know the cost before making a decision.', speaker: 'customer' }
          ],
        },
        {
          _id: 'demo-lead-4',
          phoneNumber: '+91 98765 43213',
          name: 'Sneha Reddy',
          email: 'sneha.reddy@example.com',
          status: 'contacted',
          lastCallDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          lastCallStatus: 'completed',
          campaignName: 'Product Inquiry Campaign',
          totalCalls: 4,
          notes: 'Keywords detected: quotes, price',
          source: 'Product Inquiry Campaign',
          hasKeywords: true,
          detectedKeywords: ['quotes', 'price'],
          recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          callId: 'demo-call-4',
          duration: 195,
          transcript: [
            { text: 'I am looking for quotes on your premium package.', speaker: 'customer' },
            { text: 'I will share the price details with you.', speaker: 'agent' },
            { text: 'What is the best price you can offer?', speaker: 'customer' }
          ],
        },
        {
          _id: 'demo-lead-5',
          phoneNumber: '+91 98765 43214',
          name: 'Vikram Singh',
          email: 'vikram.singh@example.com',
          status: 'contacted',
          lastCallDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          lastCallStatus: 'completed',
          campaignName: 'Sales Campaign',
          totalCalls: 2,
          notes: 'Keywords detected: quotation, proposal',
          source: 'Sales Campaign',
          hasKeywords: true,
          detectedKeywords: ['quotation', 'proposal'],
          recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
          callId: 'demo-call-5',
          duration: 275,
          transcript: [
            { text: 'I need a quotation for bulk orders.', speaker: 'customer' },
            { text: 'I can prepare a proposal for you.', speaker: 'agent' },
            { text: 'Please send the quotation by tomorrow.', speaker: 'customer' }
          ],
        },
      ];
      
      setLeads([
        {
          _id: 'lead-1',
          phoneNumber: '+919876543210',
          name: 'John Doe',
          email: 'john@example.com',
          status: 'contacted',
          lastCallDate: new Date().toISOString(),
          lastCallStatus: 'completed',
          campaignName: 'Diwali Warm Leads',
          totalCalls: 3,
          notes: 'Interested in premium plan',
          source: 'Campaign',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = () => {
    setFormData({
      name: '',
      phoneNumber: '',
      email: '',
      status: 'new',
      notes: '',
      source: 'Manual',
    });
    setShowAddModal(true);
  };

  const handleEditLead = (lead) => {
    setFormData({
      name: lead.name || '',
      phoneNumber: lead.phoneNumber || '',
      email: lead.email || '',
      status: lead.status || 'new',
      notes: lead.notes || '',
      source: lead.source || 'Manual',
    });
    setSelectedLead(lead);
    setShowEditModal(true);
  };

  const handleSaveLead = async () => {
    try {
      if (showEditModal && selectedLead) {
        setLeads(prev => prev.map(lead =>
          lead._id === selectedLead._id
            ? { ...lead, ...formData }
            : lead
        ));
      } else {
        const newLead = {
          _id: `lead-${Date.now()}`,
          ...formData,
          lastCallDate: new Date().toISOString(),
          lastCallStatus: 'new',
          totalCalls: 0,
        };
        setLeads(prev => [newLead, ...prev]);
      }
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedLead(null);
    } catch (err) {
      console.error('Error saving lead:', err);
    }
  };

  const handleDeleteLead = (leadId) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      setLeads(prev => prev.filter(lead => lead._id !== leadId));
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      new: 'bg-blue-50 text-blue-700 border border-blue-200',
      contacted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      failed: 'bg-red-50 text-red-700 border border-red-200',
      'no-answer': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      busy: 'bg-orange-50 text-orange-700 border border-orange-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${statusClasses[status] || statusClasses.new}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ') : 'Unknown'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatTimeOnly = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading && leads.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <span>LEADS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 uppercase">
            LEADS
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage and track your leads
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Search leads by Name or Number"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Leads Table */}
      <div className="glass-panel overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">LEADS</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Source</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Duration</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 transition-colors" onClick={() => setDateSortOrder(dateSortOrder === 'desc' ? 'asc' : 'desc')}>
                    <span>Date & Time</span>
                    {dateSortOrder === 'desc' ? (
                      <FaSortDown size={12} className="text-zinc-400" />
                    ) : (
                      <FaSortUp size={12} className="text-zinc-400" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Recording</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-zinc-500 text-sm">
                    No leads found
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-zinc-900">{lead.name || 'Unknown'}</div>
                        <div className="text-xs text-zinc-500">{lead.phoneNumber}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-600">{lead.source || lead.campaignName || 'Manual'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-zinc-900">{formatDuration(lead.duration)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-900">{formatDateOnly(lead.lastCallDate)}</div>
                      <div className="text-xs text-zinc-500">{formatTimeOnly(lead.lastCallDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.recordingUrl || lead.transcript ? (
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setSelectedCallData(lead._callData || null);
                            setShowRecordingModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors text-xs font-medium"
                          title="View Recording & Transcript"
                        >
                          <FaVolumeUp size={11} />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">No recording</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-4 border-t border-zinc-200 flex items-center justify-between">
            <div className="text-xs text-zinc-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} leads
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 text-xs border border-zinc-300 text-zinc-700 rounded-full hover:bg-zinc-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= pagination.pages}
                className="px-4 py-2 text-xs border border-zinc-300 text-zinc-700 rounded-full hover:bg-zinc-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900">
              {showEditModal ? 'Edit Lead' : 'Add New Lead'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
                  placeholder="+91XXXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="failed">Failed</option>
                  <option value="no-answer">No Answer</option>
                  <option value="busy">Busy</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
                  rows="3"
                  placeholder="Add notes..."
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-zinc-200">
              <button
                onClick={handleSaveLead}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium text-sm"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedLead(null);
                }}
                className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-full hover:bg-zinc-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Recording Modal */}
      {showRecordingModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-3xl w-full p-6 space-y-4 border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Call Recording & Transcript</h2>
                <p className="text-sm text-zinc-500 mt-1">{selectedLead.phoneNumber} • {selectedLead.name || 'Unknown'}</p>
              </div>
              <button
                onClick={() => {
                  setShowRecordingModal(false);
                  setSelectedLead(null);
                  setSelectedCallData(null);
                  setPlayingRecording(null);
                }}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <FaTimesCircle size={20} />
              </button>
            </div>

            {/* Lead Info */}
            <div className="bg-zinc-50/50 p-4 rounded-lg border border-zinc-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-600 font-medium">Campaign:</span>
                  <span className="ml-2 text-zinc-900">{selectedLead.campaignName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-zinc-600 font-medium">Call Date:</span>
                  <span className="ml-2 text-zinc-900">{formatDate(selectedLead.lastCallDate)}</span>
                </div>
                <div>
                  <span className="text-zinc-600 font-medium">Status:</span>
                  <span className="ml-2">{getStatusBadge(selectedLead.lastCallStatus)}</span>
                </div>
              </div>
            </div>

            {/* Audio Player */}
            {selectedLead.recordingUrl && (
              <div className="bg-zinc-50/50 p-4 rounded-lg border border-zinc-200">
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">Call Recording</h3>
                <audio
                  controls
                  className="w-full"
                  src={selectedLead.recordingUrl}
                  onPlay={() => setPlayingRecording(selectedLead._id)}
                  onPause={() => setPlayingRecording(null)}
                  onEnded={() => setPlayingRecording(null)}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Transcript */}
            {selectedLead.transcript && selectedLead.transcript.length > 0 && (
              <div className="bg-zinc-50/50 p-4 rounded-lg border border-zinc-200">
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">Call Transcript</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedLead.transcript.map((entry, idx) => {
                    const isUser = entry.speaker === 'user' || entry.role === 'user' || entry.speaker === 'customer';
                    const text = entry.text || entry.content || '';
                    
                    return (
                      <div
                        key={idx}
                        className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[75%] p-3 rounded-lg ${
                            isUser
                              ? 'bg-blue-50 border border-blue-200 rounded-tl-none'
                              : 'bg-emerald-50 border border-emerald-200 rounded-tr-none'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-xs font-medium text-zinc-600">
                              {isUser ? 'Customer' : 'Agent'}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-900">{text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!selectedLead.recordingUrl && !selectedLead.transcript && (
              <div className="text-center text-zinc-500 text-sm py-8">
                No recording or transcript available for this call
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;

