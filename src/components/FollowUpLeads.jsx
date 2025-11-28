import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FaPhoneAlt,
  FaEnvelope,
  FaUser,
  FaCalendarAlt,
  FaSearch,
  FaSpinner,
  FaSyncAlt,
  FaTag,
  FaCheckCircle,
  FaClock,
  FaComments,
  FaExternalLinkAlt,
  FaTimes,
  FaStickyNote,
  FaHandshake,
} from 'react-icons/fa';
import { authAPI } from '../services/api';

const FollowUpLeads = () => {
  const [leads, setLeads] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showContacted, setShowContacted] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Chat modal state
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  
  // Notes modal state
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.getFollowUpLeads({
        page: pagination.page,
        limit: pagination.limit,
        searchTerm: search,
        dateRange: dateRange === 'custom' ? 'custom' : dateRange,
        startDate: dateRange === 'custom' ? dateFrom : undefined,
        endDate: dateRange === 'custom' ? dateTo : undefined,
        showContacted,
      });

      setLeads(response.data?.leads || []);
      setKeywords(response.data?.keywords || []);
      setPagination(prev => ({
        ...prev,
        total: response.data?.total || 0,
        pages: response.data?.totalPages || 0,
      }));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching follow-up leads:', err);
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || !err.response) {
        setError('Backend server is not running. Please start the server.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load follow-up leads');
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, dateRange, dateFrom, dateTo, showContacted]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle marking as contacted
  const handleToggleContacted = async (lead) => {
    try {
      const newStatus = !lead.isContacted;
      await authAPI.markFollowUpContacted(lead.session_id, newStatus, lead.notes || '');
      
      // Update local state
      setLeads(prev => prev.map(l => 
        l.session_id === lead.session_id 
          ? { ...l, isContacted: newStatus, contactedAt: newStatus ? new Date().toISOString() : null }
          : l
      ));
    } catch (err) {
      console.error('Error updating contact status:', err);
      alert('Failed to update contact status');
    }
  };

  // Handle opening notes modal
  const handleOpenNotes = (lead) => {
    setSelectedLead(lead);
    setNotesText(lead.notes || '');
    setNotesModalOpen(true);
  };

  // Handle saving notes
  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    
    try {
      setSavingNotes(true);
      await authAPI.markFollowUpContacted(selectedLead.session_id, selectedLead.isContacted, notesText);
      
      // Update local state
      setLeads(prev => prev.map(l => 
        l.session_id === selectedLead.session_id 
          ? { ...l, notes: notesText }
          : l
      ));
      
      setNotesModalOpen(false);
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  // Handle viewing session chat
  const handleViewChat = async (sessionId) => {
    try {
      setSessionLoading(true);
      setSelectedSession(sessionId);
      setSessionModalOpen(true);
      
      const response = await authAPI.getMessages({ session_id: sessionId, limit: 100 });
      const messages = response.data?.messages || [];
      // Sort messages by timestamp (oldest first for chat display)
      const sortedMessages = messages.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      setSessionMessages(sortedMessages);
    } catch (err) {
      console.error('Error fetching session messages:', err);
      setSessionMessages([]);
    } finally {
      setSessionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get contact display
  const getContactDisplay = (lead) => {
    if (lead.name) return lead.name;
    if (lead.phone) return lead.phone;
    if (lead.email) return lead.email;
    return `Session ${lead.session_id?.slice(-6) || 'Unknown'}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs text-purple-700 mb-3">
            <FaHandshake className="h-3 w-3" />
            <span>Follow Up Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">Follow Up Leads</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Users who requested proposals, contact details, or wanted to connect.
          </p>
          {lastUpdated && (
            <p className="text-xs text-zinc-400 mt-1">
              Last updated {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3 mt-6 sm:mt-4">
          <button
            onClick={fetchData}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors text-xs font-medium"
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FaHandshake className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total Leads</p>
              <p className="text-xl font-semibold text-zinc-900">{pagination.total}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <FaClock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Pending</p>
              <p className="text-xl font-semibold text-zinc-900">{leads.filter(l => !l.isContacted).length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <FaCheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Contacted</p>
              <p className="text-xl font-semibold text-zinc-900">{leads.filter(l => l.isContacted).length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FaTag className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Keywords</p>
              <p className="text-xl font-semibold text-zinc-900">{keywords.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={showContacted}
            onChange={(e) => {
              setShowContacted(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
          </select>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-card p-6 border-red-200 bg-red-50 rounded-xl">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={fetchData} className="mt-3 text-xs text-red-700 underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="glass-card p-12 flex justify-center items-center rounded-xl border border-zinc-200 bg-white">
          <FaSpinner className="animate-spin text-purple-500" size={32} />
        </div>
      )}

      {/* Leads Table */}
      {!loading && !error && (
        <div className="glass-card rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Keywords</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Message Preview</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Detected</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                      No follow-up leads found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                      {/* Status Checkbox */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleContacted(lead)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            lead.isContacted
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-zinc-300 hover:border-purple-400'
                          }`}
                          title={lead.isContacted ? 'Mark as pending' : 'Mark as contacted'}
                        >
                          {lead.isContacted && <FaCheckCircle className="h-3 w-3" />}
                        </button>
                      </td>
                      
                      {/* Contact Info */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-zinc-900">{getContactDisplay(lead)}</p>
                          {lead.phone && (
                            <p className="text-xs text-zinc-500 flex items-center gap-1">
                              <FaPhoneAlt className="h-3 w-3" /> {lead.phone}
                            </p>
                          )}
                          {lead.email && (
                            <p className="text-xs text-zinc-500 flex items-center gap-1">
                              <FaEnvelope className="h-3 w-3" /> {lead.email}
                            </p>
                          )}
                        </div>
                      </td>
                      
                      {/* Keywords */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {lead.matchedKeywords?.slice(0, 3).map((kw, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs"
                            >
                              {kw}
                            </span>
                          ))}
                          {lead.matchedKeywords?.length > 3 && (
                            <span className="text-xs text-zinc-400">+{lead.matchedKeywords.length - 3}</span>
                          )}
                        </div>
                      </td>
                      
                      {/* Message Preview */}
                      <td className="px-4 py-4">
                        <p className="text-xs text-zinc-600 max-w-[250px] truncate">
                          {lead.messageSnippets?.[0]?.content || '-'}
                        </p>
                      </td>
                      
                      {/* Detected Date */}
                      <td className="px-4 py-4">
                        <p className="text-xs text-zinc-600">{formatDate(lead.lastDetectedAt)}</p>
                        {lead.isContacted && lead.contactedAt && (
                          <p className="text-xs text-emerald-600 mt-1">
                            ✓ Contacted {formatDate(lead.contactedAt)}
                          </p>
                        )}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewChat(lead.session_id)}
                            className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
                            title="View chat"
                          >
                            <FaComments className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenNotes(lead)}
                            className={`p-2 rounded-lg transition-colors ${
                              lead.notes
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-600'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                            }`}
                            title="Add/Edit notes"
                          >
                            <FaStickyNote className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 bg-zinc-50">
              <p className="text-xs text-zinc-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-xs rounded-lg border border-zinc-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50"
                >
                  Previous
                </button>
                <span className="text-xs text-zinc-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1 text-xs rounded-lg border border-zinc-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Modal */}
      {sessionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h3 className="font-semibold text-zinc-900">Chat History</h3>
              <button
                onClick={() => setSessionModalOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {sessionLoading ? (
                <div className="flex justify-center py-12">
                  <FaSpinner className="animate-spin text-purple-500" size={24} />
                </div>
              ) : sessionMessages.length === 0 ? (
                <p className="text-center text-zinc-500 py-12">No messages found</p>
              ) : (
                sessionMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-xl ${
                        msg.sender === 'user'
                          ? 'bg-purple-500 text-white'
                          : 'bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      {msg.sender === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-a:text-purple-600 [&_strong]:text-zinc-700 [&_strong]:font-semibold">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-purple-200' : 'text-zinc-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h3 className="font-semibold text-zinc-900">Notes for {getContactDisplay(selectedLead)}</h3>
              <button
                onClick={() => setNotesModalOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Add notes about this lead..."
                rows={5}
                className="w-full px-4 py-3 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setNotesModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {savingNotes && <FaSpinner className="animate-spin" />}
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUpLeads;
