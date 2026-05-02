"use client";

import React, { useEffect, useRef, useState } from "react";
import * as tmImage from "@teachablemachine/image";
import { CheckCircle, XCircle, Camera, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { submitAIScanReward } from "@/app/actions/transaction";
import { toast } from "sonner";

const URL = "https://teachablemachine.withgoogle.com/models/56cdKLYhr/";

export default function TrashScanner() {
  const [model, setModel] = useState<tmImage.CustomMobileNet | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState<{ className: string; probability: number }[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [detectedTrash, setDetectedTrash] = useState<string>("");
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const isScanningRef = useRef<boolean>(false);
  const detectStartRef = useRef<number | null>(null);

  const stopCamera = () => {
    setIsScanning(false);
    isScanningRef.current = false;
    detectStartRef.current = null;
    setScanProgress(0);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  // Load Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        const tmModel = await tmImage.load(modelURL, metadataURL);
        setModel(tmModel);
      } catch (err) {
        console.error("Failed to load model:", err);
      }
    };
    loadModel();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    if (!model) return;
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.play();
        setIsScanning(true);
        isScanningRef.current = true;
        setIsLoading(false);
        requestRef.current = requestAnimationFrame(predictLoop);
      }
    } catch (err) {
      console.error("Camera access denied or failed:", err);
      setIsLoading(false);
    }
  };

  const predictLoop = async (frameTime: number) => {
    // 1. Model Readiness Validation: ONLY run if model is loaded and video is ready
    if (model && videoRef.current && videoRef.current.readyState >= 2) {
      try {
        // 2. Fix the Reference: Pass videoRef.current directly to model.predict
        const rawPredictions = await model.predict(videoRef.current);
        
        // Sort predictions by probability descending
        const sorted = [...rawPredictions].sort((a, b) => b.probability - a.probability);

        // Throttle UI updates to ~5fps (every 200ms) to make it smooth
        if (frameTime - lastUpdateRef.current > 200) {
          setPredictions(sorted);
          lastUpdateRef.current = frameTime;
        }

        // 4. Require 5 seconds of continuous detection to prevent instant success
        const highestPrediction = sorted[0];
        if (highestPrediction.probability >= 0.50) {
          if (!detectStartRef.current) {
            detectStartRef.current = frameTime; // Start timer
            setScanProgress(0);
          } else {
            const elapsed = frameTime - detectStartRef.current;
            setScanProgress(Math.min((elapsed / 5000) * 100, 100)); // Update progress bar
            
            if (elapsed >= 5000) { // Hold for 5s
              stopCamera();
              setDetectedTrash(highestPrediction.className);
              setShowConfirmation(true);
              return; // exit loop
            }
          }
        } else {
          detectStartRef.current = null; // Reset if it loses track
          setScanProgress(0);
        }
      } catch (error) {
        console.error("Prediction error:", error);
      }
    }
    
    // Ensure we only queue the next frame if still scanning and model exists
    if (isScanningRef.current && model) {
      requestRef.current = requestAnimationFrame(predictLoop);
    }
  };

  const handleConfirmScan = async () => {
    setIsSubmitting(true);
    const res = await submitAIScanReward(detectedTrash);
    setIsSubmitting(false);
    
    if (res.success) {
      setShowConfirmation(false);
      setShowSuccess(true);
    } else {
      toast.error("Gagal menyimpan poin: " + res.error);
    }
  };

  const handleConfirm = () => {
    setShowSuccess(false);
    setPredictions([]);
  };

  return (
    <div className="w-full flex flex-col items-center bg-white border border-stone-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
      <div className="flex flex-col items-center mb-6 text-center">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Camera className="w-6 h-6 text-emerald-600" /> AI Trash Scanner
        </h2>
        <p className="text-sm text-stone-500 mt-1">Arahkan kamera ke sampah Anda untuk deteksi otomatis.</p>
      </div>

      <div className="relative w-full max-w-md aspect-[4/3] bg-stone-100 rounded-2xl overflow-hidden shadow-inner border border-stone-200 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isScanning ? "hidden" : "block"}`}
        />
        
        {!isScanning && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <Camera className="w-12 h-12 text-stone-300 mb-3" />
            <p className="text-stone-500 text-sm mb-4">Kamera tidak aktif</p>
            <button
              onClick={startCamera}
              disabled={!model}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              {!model ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Memuat Model AI...</>
              ) : (
                "Mulai Pindai"
              )}
            </button>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
            <p className="text-sm text-stone-600 font-medium">Menyiapkan Kamera...</p>
          </div>
        )}

        {isScanning && predictions.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md border border-stone-200/50 p-4 rounded-xl shadow-lg flex flex-col gap-2.5">
            {scanProgress > 0 && (
              <div className="w-full bg-stone-100 rounded-full h-1.5 mb-1 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-100 ease-linear" style={{ width: `${scanProgress}%` }}></div>
              </div>
            )}
            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Akurasi AI</h4>
            {predictions.slice(0, 3).map((pred, idx) => (
              <div key={pred.className} className="flex items-center justify-between text-sm">
                <span className={`font-semibold ${idx === 0 ? 'text-emerald-700' : 'text-stone-500'}`}>
                  {pred.className}
                </span>
                <div className="flex items-center gap-3 w-[55%]">
                  <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${idx === 0 ? 'bg-emerald-500' : 'bg-stone-300'}`} 
                      style={{ width: `${Math.round(pred.probability * 100)}%` }}
                    />
                  </div>
                  <span className={`font-bold w-9 text-right text-xs ${idx === 0 ? 'text-emerald-700' : 'text-stone-400'}`}>
                    {Math.round(pred.probability * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isScanning && (
        <button
          onClick={stopCamera}
          className="mt-6 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <XCircle className="w-5 h-5" /> Hentikan Pemindaian
        </button>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-stone-100 flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <Camera className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Konfirmasi Sampah</h3>
              <p className="text-stone-600 mb-8 leading-relaxed">
                Apakah ini benar jenis sampah mu:<br />
                <span className="text-lg font-bold text-emerald-700 block mt-2">{detectedTrash}</span>
              </p>
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={handleConfirmScan}
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</> : "Ya, Benar"}
                </button>
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    startCamera();
                  }}
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bukan, Pindai Ulang
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-emerald-100 flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Berhasil!</h3>
              <p className="text-stone-600 mb-8 leading-relaxed">
                Sampah terverifikasi: <span className="font-semibold text-stone-900">{detectedTrash}</span>.<br />
                Dapatkan <span className="font-bold text-emerald-600">50 Eco-Token</span> dan <span className="font-bold text-emerald-700">100 XP</span>.
              </p>
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                Konfirmasi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
