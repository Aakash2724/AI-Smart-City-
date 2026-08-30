import React, { useState, useEffect, useRef } from 'react';
import { Mic, Loader2, ChevronDown, Check } from 'lucide-react';
import { processVoiceComplaint } from '../../services/api';

/**
 * VoiceInputButton:
 * Minimal, ultra-clean multilingual microphone component with unified language pill.
 * Seamlessly matches the SmartGov dark/teal theme.
 */

const VOICE_LANGUAGES = [
  { code: 'te-IN', label: 'తెలుగు', short: 'TE' },
  { code: 'hi-IN', label: 'हिंदी', short: 'HI' },
  { code: 'en-IN', label: 'English', short: 'EN' },
];

export default function VoiceInputButton({ 
  onResult,
  onInterim,
  locationHint = '', 
  className = '',
  buttonText = 'Speak',
  showLabel = false,
  variant = 'icon' // 'compact' | 'full' | 'icon'
}) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [selectedLang, setSelectedLang] = useState(() => {
    try { return localStorage.getItem('smartgov_voice_lang') || 'te-IN'; } catch { return 'te-IN'; }
  });
  
  const containerRef = useRef(null);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const silenceTimerRef = useRef(null);
  const onInterimRef = useRef(onInterim);
  const onResultRef = useRef(onResult);
  const selectedLangRef = useRef(selectedLang);

  // Keep callback refs updated without re-triggering useEffect
  useEffect(() => {
    onInterimRef.current = onInterim;
    onResultRef.current = onResult;
  });

  useEffect(() => {
    selectedLangRef.current = selectedLang;
    try { localStorage.setItem('smartgov_voice_lang', selectedLang); } catch {}
  }, [selectedLang]);

  // Click outside listener to automatically close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowLangPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // Process raw speech transcript through backend Multilingual AI Parser
  const finalizeAndProcessSpeech = async (spokenText) => {
    const textToProcess = (spokenText || accumulatedTranscriptRef.current || '').trim();
    if (!textToProcess) {
      setIsListening(false);
      isListeningRef.current = false;
      return;
    }

    setIsProcessing(true);
    setIsListening(false);
    isListeningRef.current = false;
    clearSilenceTimer();

    try {
      const response = await processVoiceComplaint(textToProcess, locationHint);
      if (response && response.data && onResultRef.current) {
        onResultRef.current(response.data);
      }
    } catch (err) {
      console.warn('Voice AI processing error, using fallback:', err);
      if (onResultRef.current) {
        onResultRef.current({
          original_text: textToProcess,
          detected_language: "Auto-detected",
          translated_text: textToProcess,
          summary: textToProcess,
          category: "Roads & Infrastructure",
          priority: "HIGH"
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Create a fresh SpeechRecognition instance with the given language
  const createRecognition = (langCode) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = langCode;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      setErrorMsg('');
    };

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const bestAlt = event.results[i][0];
        if (event.results[i].isFinal) {
          finalChunk += bestAlt.transcript;
        } else {
          interimChunk += bestAlt.transcript;
        }
      }

      if (finalChunk) {
        accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + finalChunk.trim();
      }

      const currentSpoken = (accumulatedTranscriptRef.current + (interimChunk ? ' ' + interimChunk : '')).trim();
      
      if (onInterimRef.current && currentSpoken) {
        onInterimRef.current(currentSpoken);
      }

      const silenceMs = selectedLangRef.current === 'en-IN' ? 3500 : 5000;
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        if (isListeningRef.current) {
          stopListening();
        }
      }, silenceMs);
    };

    recognition.onerror = (event) => {
      console.warn('Speech Recognition Event Error:', event.error);
      if (event.error === 'not-allowed') {
        setErrorMsg('Microphone blocked. Please allow mic permission.');
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
          isListeningRef.current = false;
          finalizeAndProcessSpeech(accumulatedTranscriptRef.current);
        }
      }
    };

    return recognition;
  };

  useEffect(() => {
    recognitionRef.current = createRecognition(selectedLang);

    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  const handleLanguageChange = (langCode) => {
    setSelectedLang(langCode);
    setShowLangPicker(false);
    
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    recognitionRef.current = createRecognition(langCode);
  };

  const startListening = () => {
    setErrorMsg('');
    accumulatedTranscriptRef.current = '';
    clearSilenceTimer();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition not supported in this browser.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    recognitionRef.current = createRecognition(selectedLang);

    try {
      if (recognitionRef.current) {
        isListeningRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
      }
    } catch (e) {
      console.warn('Recognition start error:', e);
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          isListeningRef.current = true;
          recognitionRef.current.start();
          setIsListening(true);
        }, 200);
      } catch (err) {}
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    clearSilenceTimer();
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    finalizeAndProcessSpeech(accumulatedTranscriptRef.current);
  };

  const currentLangObj = VOICE_LANGUAGES.find(l => l.code === selectedLang) || VOICE_LANGUAGES[0];

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      
      {/* ─── Unified Glass Pill (Lang Toggle + Mic Trigger) ─── */}
      <div 
        className={`flex items-center rounded-xl p-0.5 transition-all backdrop-blur-md shadow-xs ${
          isListening 
            ? 'bg-rose-500/15 border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
            : isProcessing
            ? 'bg-[#0c2e28] border border-[#175249]'
            : 'bg-[#11141c]/90 hover:bg-[#161a24] border border-[#232836] hover:border-[#2dd4bf]/40'
        }`}
      >
        {/* Minimal Language Switcher Tag */}
        <button
          type="button"
          onClick={() => setShowLangPicker(!showLangPicker)}
          disabled={isListening || isProcessing}
          title={`Speech Language: ${currentLangObj.label} (${currentLangObj.short}). Click to switch.`}
          className="h-7 px-2 flex items-center gap-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-[#2dd4bf] transition-colors cursor-pointer select-none"
        >
          <span className="font-mono text-[#2dd4bf] font-bold">{currentLangObj.short}</span>
          <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 ${showLangPicker ? 'rotate-180 text-[#2dd4bf]' : 'text-slate-500'}`} />
        </button>

        {/* Subtle Vertical Divider */}
        <div className="h-3.5 w-[1px] bg-[#232836]" />

        {/* Action Button: Mic / Translating */}
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          title={
            isListening 
              ? `Listening in ${currentLangObj.label}... Click to stop & analyze` 
              : isProcessing 
              ? "Translating and analyzing voice..." 
              : `Speak complaint in ${currentLangObj.label}`
          }
          className={`h-7 px-2 flex items-center justify-center gap-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer select-none ${
            isListening
              ? 'text-rose-300'
              : isProcessing
              ? 'text-[#5eead4]'
              : 'text-[#2dd4bf] hover:text-white'
          }`}
        >
          <div className="relative flex items-center justify-center">
            {isListening && (
              <span className="absolute -inset-1 rounded-full bg-rose-500/40 animate-ping" />
            )}
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2dd4bf]" />
            ) : isListening ? (
              <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-[#2dd4bf]" />
            )}
          </div>

          {/* Optional Label (for full variants) */}
          {showLabel && variant !== 'icon' && (
            <span className="text-[11px] font-medium tracking-tight">
              {isListening ? (
                <span className="text-rose-300">Listening...</span>
              ) : isProcessing ? (
                <span className="text-[#5eead4]">Analyzing...</span>
              ) : (
                <span className="text-slate-300">{buttonText}</span>
              )}
            </span>
          )}
        </button>
      </div>

      {/* ─── Minimalist Dropdown Menu (Theme-Consistent) ─── */}
      {showLangPicker && (
        <div className="absolute top-full right-0 mt-1.5 z-50 bg-[#12151e]/98 backdrop-blur-xl border border-[#232836] rounded-xl p-1 shadow-2xl shadow-black/80 min-w-[135px] animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-[#88909d] border-b border-[#232836]/60 mb-0.5">
            Select Language
          </div>
          {VOICE_LANGUAGES.map(lang => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-[#0c2e28] text-[#2dd4bf] font-semibold'
                    : 'text-slate-300 hover:bg-[#181c26] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] px-1 py-0.5 rounded ${
                    isSelected ? 'bg-[#175249] text-[#5eead4]' : 'bg-[#1b202c] text-slate-400'
                  }`}>
                    {lang.short}
                  </span>
                  <span>{lang.label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-[#2dd4bf] flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Compact Error Toast ─── */}
      {errorMsg && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-[#2b1619] border border-rose-500/50 text-rose-300 rounded-lg px-2.5 py-1 text-[11px] shadow-lg whitespace-nowrap animate-in fade-in">
          {errorMsg}
        </div>
      )}

    </div>
  );
}

