import React, { useEffect, useState, useRef, useCallback } from 'react';
import { emergencyEngine } from '../services/emergency';
import { Mic, MicOff, Volume2, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

interface VoiceDetectionProps {
  customPhrases?: string[]; // default ['sos', 'help me', 'emergency']
  isActiveProtection?: boolean;
}

export const VoiceDetection: React.FC<VoiceDetectionProps> = ({
  customPhrases = ['sos', 'help me', 'emergency'],
  isActiveProtection = true,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [transcript, setTranscript] = useState<string>('');
  const [matchedPhrase, setMatchedPhrase] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const coolDownRef = useRef<boolean>(false);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Audio level meter
  const startAudioMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch {
      // Microphone audio metering might be blocked
    }
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Process emergency phrase
  const handleRecognizedText = useCallback(
    (rawText: string) => {
      const text = rawText.toLowerCase().trim();
      setTranscript(text);

      if (coolDownRef.current) return;

      // Match against predefined emergency phrases
      for (const phrase of customPhrases) {
        const cleanPhrase = phrase.toLowerCase().trim();
        if (text.includes(cleanPhrase)) {
          setMatchedPhrase(cleanPhrase);

          // Trigger SOS engine
          emergencyEngine.activateSOS('voice');

          // Prevent rapid duplicate triggers
          coolDownRef.current = true;
          setTimeout(() => {
            coolDownRef.current = false;
            setMatchedPhrase(null);
          }, 8000);
          break;
        }
      }
    },
    [customPhrases]
  );

  // Start speech recognition
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      setMicError(null);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        startAudioMeter();
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        handleRecognizedText(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setMicError('Microphone access denied. Please allow microphone access in your browser.');
          setIsListening(false);
          stopAudioMeter();
        } else if (event.error === 'no-speech') {
          // Normal timeout, continue listening
        } else {
          setMicError(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // Auto-restart if protection is active and listening wasn't explicitly paused
        if (isListening && !micError) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
          stopAudioMeter();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setMicError(err.message || 'Unable to start speech recognition.');
      setIsListening(false);
    }
  }, [handleRecognizedText, isListening, micError, startAudioMeter, stopAudioMeter]);

  // Stop listening
  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    stopAudioMeter();
    setTranscript('');
    setMatchedPhrase(null);
  }, [stopAudioMeter]);

  useEffect(() => {
    if (isActiveProtection && isSupported && !isListening && !micError) {
      startListening();
    }
    return () => {
      stopListening();
    };
  }, [isActiveProtection, isSupported, micError, startListening, stopListening]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Voice Emergency Detection</h3>
            <p className="text-xs text-slate-400">
              Web Speech API · Emergency phrase trigger
            </p>
          </div>
        </div>

        <div>
          {isListening ? (
            <button
              onClick={stopListening}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <MicOff className="w-3.5 h-3.5 text-red-400" />
              Pause Mic
            </button>
          ) : (
            <button
              onClick={startListening}
              disabled={!isSupported}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Mic className="w-3.5 h-3.5" />
              Enable Voice
            </button>
          )}
        </div>
      </div>

      {!isSupported ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Web Speech API Unsupported</p>
            <p className="text-slate-400">
              Your current browser does not support speech recognition. Use Chrome, Edge, or use the large red Manual SOS button instead.
            </p>
          </div>
        </div>
      ) : micError ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Microphone Access Error</p>
            <p className="text-slate-400">{micError}</p>
            <button
              onClick={startListening}
              className="mt-2 px-3 py-1 text-xs font-medium bg-slate-800 text-white rounded hover:bg-slate-700"
            >
              Retry Permission
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Recognized Phrases Tags */}
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-2">
              Recognized Trigger Phrases:
            </span>
            <div className="flex flex-wrap gap-2">
              {customPhrases.map((phrase) => {
                const isMatched = matchedPhrase === phrase.toLowerCase();
                return (
                  <span
                    key={phrase}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase transition-all ${
                      isMatched
                        ? 'bg-red-600 text-white ring-2 ring-red-400 scale-105'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <ShieldAlert className="w-3 h-3 text-red-400" />
                    &quot;{phrase}&quot;
                  </span>
                );
              })}
            </div>
          </div>

          {/* Volume meter bar */}
          <div>
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                Mic Audio Input Level
              </span>
              <span className="tabular-nums font-mono text-slate-300">
                {isListening ? `${audioLevel}%` : 'Idle'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>

          {/* Real-time transcript box */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 min-h-[64px] flex flex-col justify-center">
            <span className="text-[11px] text-slate-500 font-mono mb-1">Live Transcript:</span>
            <p className="text-sm font-medium text-slate-200 italic">
              {transcript ? `"${transcript}"` : isListening ? 'Listening for emergency keywords...' : 'Voice detection paused.'}
            </p>
          </div>

          {/* Simulator buttons for quick testing without microphone noise */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-2">
              Test Voice Detection (Simulate Speech Input):
            </span>
            <div className="flex flex-wrap gap-2">
              {customPhrases.map((phrase) => (
                <button
                  key={phrase}
                  onClick={() => handleRecognizedText(`I need ${phrase} immediately!`)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                >
                  Say &quot;{phrase}&quot;
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
