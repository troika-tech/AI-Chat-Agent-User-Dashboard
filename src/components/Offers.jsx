import React, { useState, useEffect } from 'react';
import { FaGift, FaSpinner, FaExternalLinkAlt, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';

const Offers = () => {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [displayText, setDisplayText] = useState('Offers');
  const [enabled, setEnabled] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  // Fetch offers on mount (no chatbot ID needed - global offers)
  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getOfferTemplates();
      const data = response?.data || response;
      setOffers(data.templates || []);
      setDisplayText(data.display_text || 'Offers');
      setEnabled(data.enabled || false);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (link) => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  const openOfferDetail = (offer) => {
    setSelectedOffer(offer);
  };

  const closeOfferDetail = () => {
    setSelectedOffer(null);
  };

  // Helper function to strip HTML and get text length
  const getTextLength = (html) => {
    if (typeof document === 'undefined') return 0;
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').length;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FaSpinner className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading offers...</p>
        </div>
      </div>
    );
  }

  if (!enabled || offers.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaGift className="text-purple-600" />
            {displayText}
          </h1>
          <p className="text-gray-600 mt-1">View available offers and promotions</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
          <FaGift className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No offers available at this time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaGift className="text-purple-600" />
          {displayText}
        </h1>
        <p className="text-gray-600 mt-1">View available offers and promotions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer, index) => {
          const offerId = offer._id || index;
          const contentLength = getTextLength(offer.content);
          const shouldTruncate = contentLength > 200;

          return (
            <div
              key={offerId}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full"
            >
              {offer.image_url && (
                <div className="w-full h-48 overflow-hidden flex-shrink-0">
                  <img
                    src={offer.image_url}
                    alt="Offer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="p-6 flex flex-col flex-grow">
                <div className="mb-4 flex-grow">
                  {shouldTruncate ? (
                    <div className="text-gray-700 prose prose-sm max-w-none">
                      <div
                        style={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.5'
                        }}
                        dangerouslySetInnerHTML={{ __html: offer.content }}
                      />
                      <span 
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium cursor-pointer ml-1" 
                        onClick={() => openOfferDetail(offer)}
                      >
                        Read More
                      </span>
                    </div>
                  ) : (
                    <div
                      className="text-gray-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: offer.content }}
                    />
                  )}
                </div>
                {offer.button_text && offer.button_link && (
                  <button
                    onClick={() => handleButtonClick(offer.button_link)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 mt-auto"
                  >
                    {offer.button_text}
                    <FaExternalLinkAlt className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Offer Detail Modal */}
      {selectedOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-800">Offer Details</h2>
              <button
                onClick={closeOfferDetail}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {selectedOffer.image_url && (
                <div className="w-full mb-6 overflow-hidden rounded-lg flex justify-center items-center bg-gray-50">
                  <img
                    src={selectedOffer.image_url}
                    alt="Offer"
                    className="w-full h-auto max-h-[500px] object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div
                className="text-gray-700 prose prose-lg max-w-none mb-6"
                dangerouslySetInnerHTML={{ __html: selectedOffer.content }}
              />
              {selectedOffer.button_text && selectedOffer.button_link && (
                <button
                  onClick={() => {
                    handleButtonClick(selectedOffer.button_link);
                    closeOfferDetail();
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {selectedOffer.button_text}
                  <FaExternalLinkAlt className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Offers;

