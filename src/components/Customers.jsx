import React, { useState, useEffect } from 'react';
import { FaUsers, FaPhone, FaSpinner, FaSearch, FaCalendar, FaEye, FaTimes, FaRobot, FaUser, FaComment, FaClock } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import { authAPI } from '../services/api';

const Customers = () => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  
  // Modal state
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Filter customers based on search query
    if (searchQuery.trim()) {
      const filtered = customers.filter(customer => 
        customer.phone.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.getAllContacts();
      
      if (response?.success) {
        const contacts = response.data?.contacts || [];
        setCustomers(contacts);
        setFilteredCustomers(contacts);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load customers');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewChats = async (customer) => {
    setSelectedCustomer(customer);
    setShowChatModal(true);
    setChatLoading(true);
    
    try {
      const response = await authAPI.getMessages({ phone: customer.phone });
      if (response?.success) {
        setChatMessages(response.data?.messages || []);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const closeChatModal = () => {
    setShowChatModal(false);
    setSelectedCustomer(null);
    setChatMessages([]);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading customers...</p>
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
            <FaUsers className="h-3 w-3" />
            <span>Customer management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Customers
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            View all customers who have shared their phone numbers
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          <FaUsers className="text-emerald-600" size={16} />
          <span className="text-emerald-700 font-semibold">{customers.length}</span>
          <span className="text-emerald-600 text-sm">Total Customers</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <FaSearch className="text-white" size={16} />
          </div>
          <input
            type="text"
            placeholder="Search phone numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 text-sm"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Customers Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-teal-600 to-cyan-600">
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <span>#</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaPhone size={12} />
                    <span>Phone Number</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaClock size={12} />
                    <span>Collected On</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <FaComment size={12} />
                    <span>Messages</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-white text-xs font-semibold uppercase tracking-wider">
                    <span>Action</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-zinc-500 text-sm">
                    <FaUsers className="mx-auto mb-3 text-zinc-300" size={32} />
                    <p>{customers.length === 0 ? 'No customers found' : 'No matching phone numbers'}</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, index) => (
                  <tr key={customer.phone} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-500">{index + 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <FaPhone size={16} />
                        </div>
                        <span className="text-sm font-medium text-zinc-900">{customer.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-600">{formatDate(customer.firstContact)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        <FaComment size={10} />
                        {customer.messageCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewChats(customer)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors text-sm font-medium"
                      >
                        <FaEye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/60">
          <div className="text-sm text-zinc-600">
            Showing <span className="font-medium text-zinc-900">{filteredCustomers.length}</span> of <span className="font-medium text-zinc-900">{customers.length}</span> customers
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <FaPhone className="text-white" size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedCustomer?.phone}
                  </h3>
                  <p className="text-emerald-100 text-xs">
                    {chatMessages.length} messages • First: {formatDate(selectedCustomer?.firstContact)}
                  </p>
                </div>
              </div>
              <button
                onClick={closeChatModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FaTimes className="text-white" size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
              {chatLoading ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-emerald-500" size={32} />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <FaComment className="mx-auto mb-3 text-zinc-300" size={32} />
                  <p>No messages found</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          msg.sender === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {msg.sender === 'user' ? <FaUser size={12} /> : <FaRobot size={12} />}
                        </div>
                        <span className="text-xs text-zinc-500">
                          {msg.sender === 'user' ? 'User' : 'Bot'} • {formatDate(msg.timestamp)}
                        </span>
                      </div>
                      <div className={`p-3 rounded-xl ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm'
                      }`}>
                        <div className={`text-sm prose prose-sm max-w-none ${
                          msg.sender === 'user' ? 'prose-invert' : '[&_strong]:text-zinc-700 [&_strong]:font-semibold'
                        }`}>
                          <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50/80 rounded-b-2xl">
              <p className="text-xs text-zinc-500 text-center">
                Total {chatMessages.length} messages from this customer
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

