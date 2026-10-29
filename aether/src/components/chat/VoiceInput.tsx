'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const { warning, info } = useToast();

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognition.onerror = (e: any) => {
      setIsListening(false);
      warning('Speech recognition error: ' + e.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [onTranscript, warning]);

  const toggleListening = () => {
    if (!isSupported) {
      warning('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      info('Voice input stopped');
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        info('Voice input active (Beta) — Speak now');
      } catch {
        setIsListening(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`p-1.5 rounded-input transition-colors duration-150 ${
        isListening
          ? 'bg-rose-500/20 text-rose-600 animate-pulse'
          : 'text-ink-muted hover:text-ink hover:bg-surface-elevated'
      }`}
      title={isListening ? 'Stop listening' : 'Voice input (Beta - Browser Web Speech API)'}
      aria-label="Voice input"
    >
      {isListening ? <Mic className="w-4 h-4 text-rose-600" /> : <MicOff className="w-4 h-4" />}
    </button>
  );
}

/**
 * Text-to-speech utility for reading assistant messages aloud
 */
export function speakText(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    return;
  }

  // Clean markdown syntax before speaking
  const clean = text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_#`]/g, '');

  const utterance = new SpeechSynthesisUtterance(clean.slice(0, 500));
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}
