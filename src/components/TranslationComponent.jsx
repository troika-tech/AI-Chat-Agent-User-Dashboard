/**
 * Translation Component
 * Provides translation UI and functionality for transcripts and summaries
 */

import React, { useState } from 'react';
import { FaLanguage, FaSpinner, FaUndo } from 'react-icons/fa';
import { translateAPI } from '../services/api';
import { toast } from 'react-toastify';

// Supported languages list
const SUPPORTED_LANGUAGES = [
  // Indian Languages
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'mr', name: 'Marathi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'bn', name: 'Bengali' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ur', name: 'Urdu' },
  { code: 'as', name: 'Assamese' },
  { code: 'or', name: 'Odia' },
  { code: 'ne', name: 'Nepali' },
  { code: 'gom', name: 'Konkani' },
  // Asian Languages
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'fil', name: 'Filipino' },
  // European Languages
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'el', name: 'Greek' },
  { code: 'sv', name: 'Swedish' },
  // Middle Eastern Languages
  { code: 'ar', name: 'Arabic' },
  { code: 'fa', name: 'Persian' },
  { code: 'he', name: 'Hebrew' },
];

/**
 * Translation Component
 * 
 * @param {Object} props - Component props
 * @param {Array<Object|string>} [props.content] - Content to translate (transcript or text array)
 * @param {string} [props.summary] - Summary text to translate
 * @param {Function} [props.onTranslationComplete] - Callback when translation completes
 * @param {Function} [props.onTranslatedContentChange] - Callback when translated content changes
 * @param {string} [props.className] - Custom CSS class
 */
const TranslationComponent = ({
  content,
  summary,
  onTranslationComplete,
  onTranslatedContentChange,
  className = '',
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translatedContent, setTranslatedContent] = useState(null);
  const [translatedSummary, setTranslatedSummary] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  const handleTranslate = async () => {
    if (!selectedLanguage) {
      toast.warning('Please select a language to translate');
      return;
    }

    if (!content && !summary) {
      toast.warning('No content available to translate');
      return;
    }

    try {
      setTranslating(true);

      // Translate content (transcript or text array)
      if (content && Array.isArray(content) && content.length > 0) {
        // Check if it's a transcript (has speaker/text structure) or plain text array
        const isTranscript = content.some(
          (item) => typeof item === 'object' && (item.speaker || item.text || item.content)
        );

        if (isTranscript) {
          // Translate transcript
          const response = await translateAPI.translateTranscript(content, selectedLanguage);

          if (response.success && response.data?.transcript) {
            setTranslatedContent(response.data.transcript);
            
            // Notify parent component
            if (onTranslatedContentChange) {
              onTranslatedContentChange(response.data.transcript);
            }
          }
        } else {
          // Translate text array
          const textArray = content.filter((item) => typeof item === 'string');
          if (textArray.length > 0) {
            const response = await translateAPI.translateTexts(textArray, selectedLanguage);

            if (response.success && response.data?.translations) {
              setTranslatedContent(response.data.translations);
              
              // Notify parent component
              if (onTranslatedContentChange) {
                onTranslatedContentChange(response.data.translations);
              }
            }
          }
        }
      }

      // Translate summary if available
      let translatedSummaryText = null;
      if (summary) {
        const response = await translateAPI.translateTexts([summary], selectedLanguage);

        if (response.success && response.data?.translations?.[0]) {
          const translationResult = response.data.translations[0];
          translatedSummaryText =
            typeof translationResult === 'string'
              ? translationResult
              : translationResult.translated || translationResult;
          setTranslatedSummary(translatedSummaryText);
        }
      }

      setShowTranslated(true);

      const languageName = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.name || selectedLanguage;
      toast.success(`Translated to ${languageName}`);

      // Call completion callback
      if (onTranslationComplete) {
        onTranslationComplete({
          translatedContent,
          translatedSummary: translatedSummaryText || translatedSummary,
          targetLanguage: selectedLanguage,
        });
      }
    } catch (err) {
      console.error('Translation error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to translate';
      toast.error(errorMessage);
    } finally {
      setTranslating(false);
    }
  };

  const handleShowOriginal = () => {
    setShowTranslated(false);
    setTranslatedContent(null);
    setTranslatedSummary(null);
    
    // Notify parent component to show original
    if (onTranslatedContentChange) {
      onTranslatedContentChange(null);
    }
  };

  const selectedLanguageName = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.name;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-lg border border-blue-200 ${className}`}>
      <div className="flex items-center gap-2">
        <FaLanguage className="text-blue-500" size={16} />
        <span className="text-sm font-medium text-zinc-700">Translate Content</span>
        {showTranslated && selectedLanguageName && (
          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
            {selectedLanguageName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          disabled={translating}
          className="px-3 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 min-w-[130px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select Language</option>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleTranslate}
          disabled={!selectedLanguage || translating}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors text-xs font-medium disabled:cursor-not-allowed"
        >
          {translating ? (
            <>
              <FaSpinner className="animate-spin" size={11} />
              <span>Translating...</span>
            </>
          ) : (
            <>
              <FaLanguage size={12} />
              <span>Translate</span>
            </>
          )}
        </button>

        {showTranslated && (
          <button
            onClick={handleShowOriginal}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors text-xs font-medium"
          >
            <FaUndo size={10} />
            <span>Original</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TranslationComponent;
export { SUPPORTED_LANGUAGES };

