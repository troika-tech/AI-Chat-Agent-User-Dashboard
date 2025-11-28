import React, { useState, useEffect } from 'react';
import { FaSearch, FaPhone, FaEnvelope, FaUser, FaSpinner, FaComments, FaTimesCircle, FaSortUp, FaSortDown, FaFire, FaCalendar } from 'react-icons/fa';
import { authAPI } from '../services/api';
import { DEMO_MODE } from '../config/api.config';

const Leads = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [hotWords, setHotWords] = useState([]);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    search: '',
    dateRange: 'all',
  });
  const [dateSortOrder, setDateSortOrder] = useState('desc');
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [connectedStatuses, setConnectedStatuses] = useState({});

  useEffect(() => {
    fetchHotLeads();
  }, [pagination.page, filters.dateRange]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchHotLeads();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchHotLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.getHotLeads({
        page: pagination.page,
        limit: pagination.limit,
        searchTerm: filters.search,
        dateRange: filters.dateRange,
      });

      if (response.success) {
        let leadsList = response.data?.leads || [];
        setHotWords(response.data?.hotWords || []);

        // Sort by date
        leadsList.sort((a, b) => {
          const dateA = new Date(a.lastDetectedAt || 0).getTime();
          const dateB = new Date(b.lastDetectedAt || 0).getTime();
          return dateSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        // Initialize connected statuses
        const initialStatuses = {};
        leadsList.forEach(lead => {
          if (connectedStatuses[lead.id] === undefined) {
            initialStatuses[lead.id] = false;
          } else {
            initialStatuses[lead.id] = connectedStatuses[lead.id];
          }
        });
        setConnectedStatuses(prev => ({ ...prev, ...initialStatuses }));

        setLeads(leadsList);
        setPagination(prev => ({
          ...prev,
          total: response.data?.total || 0,
          pages: response.data?.totalPages || 1,
        }));
      }
    } catch (err) {
      console.error('Error fetching hot leads:', err);
      setError('Failed to load hot leads');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase();
    return `${day} ${month} at ${time}`;
  };

  const handleSortToggle = () => {
    const newOrder = dateSortOrder === 'desc' ? 'asc' : 'desc';
    setDateSortOrder(newOrder);
    
    setLeads(prev => [...prev].sort((a, b) => {
      const dateA = new Date(a.lastDetectedAt || 0).getTime();
      const dateB = new Date(b.lastDetectedAt || 0).getTime();
      return newOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }));
  };

  if (loading && leads.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading hot leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs text-orange-700 mb-3">
            <FaFire size={10} />
            <span>HOT LEADS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Hot Leads
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Users who showed buying intent in their chat messages
          </p>
        </div>
      </div>

      {/* Hot Words Display */}
      {hotWords.length > 0 && (
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <FaFire className="text-orange-500" size={14} />
            <span className="text-xs font-medium text-zinc-700">Detecting keywords:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hotWords.slice(0, 10).map((word, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs"
              >
                {word}
              </span>
            ))}
            {hotWords.length > 10 && (
              <span className="text-xs text-zinc-500">+{hotWords.length - 10} more</span>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel p-4 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Search by phone, email, or name"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs"
            />
          </div>
          <div className="relative">
            <FaCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={14} />
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-xs appearance-none"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="all">All time</option>
            </select>
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
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Contact</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Keywords Detected</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-900 transition-colors" onClick={handleSortToggle}>
                    <span>Detected At</span>
                    {dateSortOrder === 'desc' ? (
                      <FaSortDown size={12} className="text-zinc-400" />
                    ) : (
                      <FaSortUp size={12} className="text-zinc-400" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">Contacted</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em]">View Chat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-zinc-500 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <FaFire className="text-zinc-300" size={32} />
                      <span>No hot leads found</span>
                      <span className="text-xs text-zinc-400">Users who use keywords like "pricing", "buy", "demo" will appear here</span>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {lead.name && (
                          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                            <FaUser className="text-zinc-400" size={12} />
                            {lead.name}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm text-zinc-700">
                            <FaPhone className="text-emerald-500" size={12} />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2 text-sm text-zinc-600">
                            <FaEnvelope className="text-blue-500" size={12} />
                            {lead.email}
                          </div>
                        )}
                        {!lead.phone && !lead.email && (
                          <div className="text-sm text-zinc-400 italic">Anonymous user</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(lead.matchedKeywords || []).slice(0, 4).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-medium"
                          >
                            {keyword}
                          </span>
                        ))}
                        {(lead.matchedKeywords || []).length > 4 && (
                          <span className="text-[10px] text-zinc-500">
                            +{lead.matchedKeywords.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-900">{formatDate(lead.lastDetectedAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={connectedStatuses[lead.id] || false}
                          onChange={(e) => {
                            setConnectedStatuses(prev => ({
                              ...prev,
                              [lead.id]: e.target.checked
                            }));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowChatModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors text-xs font-medium"
                        title="View Chat"
                      >
                        <FaComments size={11} />
                        <span>View</span>
                      </button>
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

      {/* Chat View Modal */}
      {showChatModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-2xl w-full p-6 space-y-4 border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Chat Messages</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {selectedLead.name || selectedLead.phone || selectedLead.email || 'Anonymous user'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowChatModal(false);
                  setSelectedLead(null);
                }}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <FaTimesCircle size={20} />
              </button>
            </div>

            {/* Matched Keywords */}
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <FaFire className="text-orange-500" size={14} />
                <span className="text-xs font-medium text-orange-700">Matched Keywords:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(selectedLead.matchedKeywords || []).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 rounded-full bg-orange-200 text-orange-800 text-xs font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* Message Snippets */}
            <div className="bg-zinc-50/50 p-4 rounded-lg border border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Messages with Keywords</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(selectedLead.messageSnippets || []).length > 0 ? (
                  selectedLead.messageSnippets.map((msg, idx) => (
                    <div key={idx} className="flex justify-end">
                      <div className="max-w-[85%] p-3 rounded-lg bg-emerald-500 text-white rounded-tr-none">
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs text-emerald-100 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                            day: 'numeric',
                            month: 'short'
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-zinc-500 text-sm py-4">
                    No message snippets available
                  </div>
                )}
              </div>
            </div>

            {/* Lead Info */}
            <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Lead Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-zinc-500">First Detected:</span>
                  <p className="text-zinc-900">{formatDate(selectedLead.firstDetectedAt)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Last Detected:</span>
                  <p className="text-zinc-900">{formatDate(selectedLead.lastDetectedAt)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Keywords Used:</span>
                  <p className="text-zinc-900">{selectedLead.hotWordCount || 0} times</p>
                </div>
                <div>
                  <span className="text-zinc-500">Session ID:</span>
                  <p className="text-zinc-900 text-xs truncate">{selectedLead.session_id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;

