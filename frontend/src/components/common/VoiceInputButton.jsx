import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { processVoiceComplaint } from '../../services/api';

/**
 * VoiceInputButton:
 * Robust, continuous multilingual microphone component.
 * Allows citizens and operators to speak complete sentences in Telugu, Hindi, or English.
 * Automatically recognizes speech continuously, detects language, translates to English,
 * and extracts civic entities.
 */
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
  
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const silenceTimerRef = useRef(null);
  const onInterimRef = useRef(onInterim);
  const onResultRef = useRef(onResult);

  // Keep callback refs updated without re-triggering useEffect
  useEffect(() => {
    onInterimRef.current = onInterim;
    onResultRef.current = onResult;
  });

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

  // Initialize SpeechRecognition ONCE on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep listening continuously across pauses
      recognition.interimResults = true; // Real-time interim results
      recognition.lang = 'en-IN'; // Multi-accent English/Indian voice model

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setErrorMsg('');
      };

      recognition.onresult = (event) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            interimChunk += event.results[i][0].transcript;
          }
        }

        if (finalChunk) {
          accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + finalChunk.trim();
        }

        const currentSpoken = (accumulatedTranscriptRef.current + (interimChunk ? ' ' + interimChunk : '')).trim();
        
        // Directly stream live spoken words into the textbox in real-time
        if (onInterimRef.current && currentSpoken) {
          onInterimRef.current(currentSpoken);
        }

        // Reset silence timer on active speech (auto-finalize after 3.5s of silence)
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            stopListening();
          }
        }, 3500);
      };

      recognition.onerror = (event) => {
        console.warn('Speech Recognition Event Error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access blocked. Please allow mic permission.');
          setIsListening(false);
          isListeningRef.current = false;
        } else if (event.error === 'no-speech') {
          // If no speech detected in initial chunk, keep listening unless silence timer expires
        }
      };

      recognition.onend = () => {
        // If the browser ends the session automatically but user hasn't explicitly stopped
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

      recognitionRef.current = recognition;
    }

    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []); // Empty dependency array ensures it is NEVER destroyed on state changes!

  const startListening = () => {
    setErrorMsg('');
    accumulatedTranscriptRef.current = '';
    clearSilenceTimer();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition is not supported in this browser.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

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

    // Immediately finalize and translate the accumulated text
    finalizeAndProcessSpeech(accumulatedTranscriptRef.current);
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      
      {/* ─── Main Microphone Button ─── */}
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        title={isListening ? "Listening... Click to finish speaking" : "Speak in Telugu, Hindi, or English"}
        className={`group relative flex items-center justify-center gap-1.5 font-bold transition-all rounded-lg cursor-pointer select-none ${
          !showLabel || variant === 'icon'
            ? isListening
              ? 'h-8 w-8 bg-rose-500/20 text-rose-300 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
              : isProcessing
              ? 'h-8 w-8 bg-[#0c2e28] text-[#5eead4] border border-[#175249] opacity-80'
              : 'h-8 w-8 bg-[#1a1d24]/90 hover:bg-[#262b35] text-[#2dd4bf] hover:text-[#5eead4] border border-[#303644] hover:border-[#2dd4bf]/50 shadow-xs'
            : isListening 
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.35)] px-3 py-1.5' 
              : isProcessing
              ? 'bg-[#0c2e28] text-[#5eead4] border border-[#175249] px-3 py-1.5 opacity-80'
              : 'bg-[#151b20] hover:bg-[#1f2830] text-[#2dd4bf] hover:text-[#5eead4] border border-[#26353e] hover:border-[#2dd4bf]/40 px-3 py-1.5 shadow-xs'
        }`}
      >
        {/* Animated Microphone Icon */}
        <div className="relative flex items-center justify-center">
          {isListening && (
            <span className="absolute -inset-1 rounded-full bg-rose-500/40 animate-ping" />
          )}
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2dd4bf]" />
          ) : isListening ? (
            <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-[#2dd4bf] group-hover:scale-110 transition-transform" />
          )}
        </div>

        {/* Dynamic Label */}
        {showLabel && variant !== 'icon' && (
          <span className="text-xs font-semibold tracking-tight">
            {isListening ? (
              <span className="flex items-center gap-1.5 text-rose-300">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                Listening...
              </span>
            ) : isProcessing ? (
              <span className="text-[#5eead4]">Translating...</span>
            ) : (
              <span className="text-slate-200 group-hover:text-white flex items-center gap-1">
                <span>{buttonText}</span>
              </span>
            )}
          </span>
        )}
      </button>

      {/* ─── Compact Error Toast ─── */}
      {errorMsg && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#2b1619] border border-rose-500/50 text-rose-300 rounded-lg p-1.5 text-[10px] shadow-lg whitespace-nowrap animate-in fade-in">
          {errorMsg}
        </div>
      )}

    </div>
  );
}


