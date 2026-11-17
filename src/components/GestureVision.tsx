import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { emergencyEngine } from '../services/emergency';
import { Camera, CameraOff, Video, Eye, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface GestureVisionProps {
  threshold?: number; // Consecutive frames required (default 8)
  isActiveProtection?: boolean;
}

export const GestureVision: React.FC<GestureVisionProps> = ({
  threshold = 8,
  isActiveProtection = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedGesture, setDetectedGesture] = useState<string>('Searching for hand...');
  const [consecutiveCount, setConsecutiveCount] = useState<number>(0);
  const [coolDownRemaining, setCoolDownRemaining] = useState<number>(0);

  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const consecutiveFramesRef = useRef<number>(0);
  const coolDownRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize MediaPipe Tasks Hand Landmarker
  useEffect(() => {
    let isMounted = true;

    async function loadLandmarker() {
      try {
        setIsLoadingModel(true);
        setModelError(null);

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          setIsLoadingModel(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load MediaPipe HandLandmarker:', err);
          setModelError(
            err.message || 'Unable to load computer vision model. Please check network connectivity.'
          );
          setIsLoadingModel(false);
        }
      }
    }

    loadLandmarker();

    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
        };
      }
    } catch (err: any) {
      console.warn('Webcam access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser permissions.'
          : err.message || 'Could not start webcam preview.'
      );
      setCameraActive(false);
    }
  }, []);

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    setCameraActive(false);
    setDetectedGesture('Camera stopped');
    setConsecutiveCount(0);
  }, []);

  // Auto-start camera when protection is active and model is ready
  useEffect(() => {
    if (isActiveProtection && !isLoadingModel && !cameraActive && !cameraError) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isActiveProtection, isLoadingModel, startCamera, stopCamera]);

  // Open-Palm gesture classifier
  const checkIsOpenPalm = (landmarks: Array<{ x: number; y: number; z: number }>): boolean => {
    // 4 fingertips (8: index, 12: middle, 16: ring, 20: pinky)
    // 4 pip joints (6: index pip, 10: middle pip, 14: ring pip, 18: pinky pip)
    // For hand pointing upright, tip y must be clearly less than pip y (since 0 is top of screen)
    const indexExtended = landmarks[8].y < landmarks[6].y;
    const middleExtended = landmarks[12].y < landmarks[10].y;
    const ringExtended = landmarks[16].y < landmarks[14].y;
    const pinkyExtended = landmarks[20].y < landmarks[18].y;

    // Thumb extended check: distance between thumb tip (4) and index MCP (5)
    const dx = landmarks[4].x - landmarks[5].x;
    const dy = landmarks[4].y - landmarks[5].y;
    const thumbDistance = Math.sqrt(dx * dx + dy * dy);
    const thumbExtended = thumbDistance > 0.08;

    return indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended;
  };

  // Continuous frame prediction loop
  useEffect(() => {
    if (!cameraActive || !landmarkerRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    let lastVideoTime = -1;

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || !canvas || !landmarker) return;

      if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;

          // Process Hand Landmarker
          const startTimeMs = performance.now();
          const results = landmarker.detectForVideo(video, startTimeMs);

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.landmarks && results.landmarks.length > 0) {
            const hand = results.landmarks[0];
            const isOpenPalm = checkIsOpenPalm(hand);

            // Draw landmarks
            ctx.fillStyle = isOpenPalm ? '#10b981' : '#38bdf8';
            ctx.strokeStyle = isOpenPalm ? '#34d399' : '#0284c7';
            ctx.lineWidth = 3;

            // Connect landmarks
            for (let i = 0; i < hand.length; i++) {
              const x = hand[i].x * canvas.width;
              const y = hand[i].y * canvas.height;

              ctx.beginPath();
              ctx.arc(x, y, 4, 0, 2 * Math.PI);
              ctx.fill();
            }

            if (isOpenPalm) {
              setDetectedGesture('Open Palm Recognized');

              if (!coolDownRef.current) {
                consecutiveFramesRef.current += 1;
                setConsecutiveCount(consecutiveFramesRef.current);

                if (consecutiveFramesRef.current >= threshold) {
                  // Trigger Common SOS Engine!
                  emergencyEngine.activateSOS('gesture');

                  // Enter 10-second cool-down lock
                  coolDownRef.current = true;
                  consecutiveFramesRef.current = 0;
                  setConsecutiveCount(0);
                  setCoolDownRemaining(10);

                  const timer = setInterval(() => {
                    setCoolDownRemaining((prev) => {
                      if (prev <= 1) {
                        clearInterval(timer);
                        coolDownRef.current = false;
                        return 0;
                      }
                      return prev - 1;
                    });
                  }, 1000);
                }
              }
            } else {
              setDetectedGesture('Hand Present (Not Open Palm)');
              consecutiveFramesRef.current = Math.max(0, consecutiveFramesRef.current - 1);
              setConsecutiveCount(consecutiveFramesRef.current);
            }
          } else {
            setDetectedGesture('No hand in frame');
            consecutiveFramesRef.current = 0;
            setConsecutiveCount(0);
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [cameraActive, threshold]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">AI Hand Gesture Recognition</h3>
            <p className="text-xs text-slate-400">
              MediaPipe Vision Hand Landmarker · Local browser processing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cameraActive ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <CameraOff className="w-3.5 h-3.5 text-red-400" />
              Pause Camera
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={isLoadingModel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Start Camera
            </button>
          )}
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="relative w-full aspect-video max-h-[360px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        {isLoadingModel && (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-200">Loading MediaPipe Hand Landmarker...</p>
            <p className="text-xs text-slate-500">Initializing WebAssembly neural network for local pose estimation</p>
          </div>
        )}

        {modelError && (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-red-400">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <p className="text-sm font-semibold">Vision Model Error</p>
            <p className="text-xs text-slate-400 max-w-sm">{modelError}</p>
          </div>
        )}

        {cameraError && !isLoadingModel && (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-amber-400">
            <CameraOff className="w-8 h-8 text-amber-500" />
            <p className="text-sm font-semibold">Camera Unavailable</p>
            <p className="text-xs text-slate-400 max-w-sm">{cameraError}</p>
            <button
              onClick={startCamera}
              className="mt-2 px-3 py-1 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md"
            >
              Retry Camera
            </button>
          </div>
        )}

        {/* Video feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${cameraActive ? 'block' : 'hidden'}`}
        />

        {/* Canvas overlay for landmarks */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none ${
            cameraActive ? 'block' : 'hidden'
          }`}
        />

        {/* Not active placeholder */}
        {!cameraActive && !isLoadingModel && !cameraError && (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-400">
            <Video className="w-10 h-10 text-slate-600" />
            <p className="text-sm font-medium text-slate-300">Camera preview is paused</p>
            <p className="text-xs text-slate-500">
              Click &quot;Start Camera&quot; above to enable open-palm emergency gesture detection.
            </p>
          </div>
        )}

        {/* Top-left Detection Badge */}
        {cameraActive && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-xs text-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                detectedGesture.includes('Open Palm') ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="font-medium">{detectedGesture}</span>
          </div>
        )}

        {/* Top-right Cool-down Badge */}
        {coolDownRemaining > 0 && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-red-950/80 border border-red-700 text-xs text-red-300 font-semibold">
            Cool-down lock: {coolDownRemaining}s
          </div>
        )}
      </div>

      {/* Frame Accumulator & Meter */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span>Gesture Confirmation Threshold:</span>
            <span className="font-semibold text-slate-200 tabular-nums">
              {consecutiveCount} / {threshold} frames
            </span>
          </span>
          {consecutiveCount >= threshold ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
            </span>
          ) : (
            <span className="text-slate-500">Hold open palm facing camera</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-150 ${
              consecutiveCount >= threshold ? 'bg-emerald-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, (consecutiveCount / threshold) * 100)}%` }}
          />
        </div>

        <p className="mt-2 text-[11px] text-slate-500">
          Target gesture: <strong>Open Palm (5 fingers spread, facing webcam)</strong>. Multi-frame confirmation prevents accidental triggers from hand waves or typing.
        </p>
      </div>
    </div>
  );
};
