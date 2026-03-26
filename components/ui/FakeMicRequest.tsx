"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { chaosController } from "@/hooks/chaosController";

type MicPhase = "permission" | "activating" | "listening" | "detected";

type DistanceChunk = {
  timestamp: number;
  distance: number;
};

export default function FakeMicRequest({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<MicPhase>("permission");
  const [volume, setVolume] = useState(0);
  const [detectedText, setDetectedText] = useState("");
  const [confidence, setConfidence] = useState(0);

  const activatingTimerRef = useRef<number | null>(null);
  const roastTimerRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const decayTimerRef = useRef<number | null>(null);

  const lastPointerRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
  const distanceHistoryRef = useRef<DistanceChunk[]>([]);
  const confidenceRef = useRef(0);
  const detectedRef = useRef(false);

  const clearTimers = () => {
    if (activatingTimerRef.current !== null) {
      window.clearTimeout(activatingTimerRef.current);
      activatingTimerRef.current = null;
    }
    if (roastTimerRef.current !== null) {
      window.clearTimeout(roastTimerRef.current);
      roastTimerRef.current = null;
    }
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    if (decayTimerRef.current !== null) {
      window.clearInterval(decayTimerRef.current);
      decayTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    if (phase !== "listening") {
      return;
    }

    detectedRef.current = false;
    confidenceRef.current = 0;
    setConfidence(0);
    setDetectedText("");

    const handleMouseMove = (event: MouseEvent) => {
      const now = Date.now();
      const previous = lastPointerRef.current;
      lastPointerRef.current = { x: event.clientX, y: event.clientY, timestamp: now };

      if (!previous || detectedRef.current) {
        return;
      }

      const deltaX = event.clientX - previous.x;
      const deltaY = event.clientY - previous.y;
      const distance = Math.hypot(deltaX, deltaY);
      const deltaTime = Math.max(1, now - previous.timestamp);

      const speed = distance / deltaTime;
      const currentVolume = Math.max(2, Math.min(100, Math.round(speed * 60)));
      setVolume(currentVolume);

      distanceHistoryRef.current.push({ timestamp: now, distance });
      distanceHistoryRef.current = distanceHistoryRef.current.filter(
        (chunk) => now - chunk.timestamp <= 4500,
      );

      const totalDistance = distanceHistoryRef.current.reduce((sum, chunk) => sum + chunk.distance, 0);
      if (currentVolume >= 78) {
        confidenceRef.current = Math.min(100, confidenceRef.current + deltaTime * 0.09);
      } else {
        confidenceRef.current = Math.max(0, confidenceRef.current - deltaTime * 0.05);
      }

      setConfidence(Math.round(confidenceRef.current));

      const enoughDistance = totalDistance >= 1200;
      const enoughControl = confidenceRef.current >= 100;

      if (enoughDistance && enoughControl) {
        detectedRef.current = true;
        setVolume(100);
        setConfidence(100);
        setDetectedText("Səs aşkarlandı! Bu dəfə doğrudan qışqırdın 😈🎉");
        setPhase("detected");

        completionTimerRef.current = window.setTimeout(() => {
          onComplete();
        }, 900);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    roastTimerRef.current = window.setTimeout(() => {
      chaosController.triggerRoast("Qışqırmaqdan qorxursan? Siçanı hərəkət elə heç olmasa 🤦");
    }, 15000);

    decayTimerRef.current = window.setInterval(() => {
      setVolume((prev) => Math.max(0, prev - 6));
      setConfidence((prev) => {
        const next = Math.max(0, prev - 1.4);
        confidenceRef.current = next;
        return Math.round(next);
      });
    }, 120);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (roastTimerRef.current !== null) {
        window.clearTimeout(roastTimerRef.current);
        roastTimerRef.current = null;
      }
      if (decayTimerRef.current !== null) {
        window.clearInterval(decayTimerRef.current);
        decayTimerRef.current = null;
      }
    };
  }, [onComplete, phase]);

  const beginFakeActivation = () => {
    if (phase !== "permission") {
      return;
    }

    setPhase("activating");
    activatingTimerRef.current = window.setTimeout(() => {
      setPhase("listening");
    }, 2000);
  };

  const zoneText = volume >= 78 ? "Yaşıl zona" : "Sakit zona";

  const waveBars = useMemo(() => Array.from({ length: 9 }, (_, index) => index), []);

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-950/95 p-6 shadow-2xl">
      <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-xl">
            🎤
          </div>
          <h2 className="text-lg font-bold text-zinc-100">Əsəb Bölməsi mikrofona çıxış istəyir</h2>
        </div>

        <p className="text-sm leading-6 text-zinc-300">
          Növbəti mərhələdə səs əmrləri ilə idarəetmə aktiv olacaq. Mikrofona icazə vermədən davam
          etmək mümkün deyil.
        </p>

        {(phase === "activating" || phase === "listening" || phase === "detected") && (
          <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-950/80 p-4">
            {phase === "activating" && (
              <div className="flex items-center gap-3 text-sm text-zinc-200">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
                Mikrofon aktivləşdirilir...
              </div>
            )}

            {(phase === "listening" || phase === "detected") && (
              <>
                <div className="flex items-end gap-1">
                  {waveBars.map((bar) => (
                    <motion.div
                      key={bar}
                      className="w-2 rounded bg-emerald-400/80"
                      animate={{ scaleY: [0.4, 1.2, 0.45] }}
                      transition={{
                        duration: 0.8,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: bar * 0.06,
                      }}
                      style={{ height: 22 }}
                    />
                  ))}
                </div>

                <p className="text-sm font-semibold text-zinc-100">
                  🎤 Qışqır: &apos;BAŞLA!&apos; deyə səslən
                </p>

                <motion.p
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY }}
                  className="text-center text-xl font-black tracking-wide text-amber-300"
                >
                  📢 SƏSİNİZİ GÖSTƏRİN
                </motion.p>

                <div className="space-y-2">
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full transition-[width] duration-75 ${
                        volume >= 78 ? "bg-emerald-500" : "bg-amber-400"
                      }`}
                      style={{ width: `${volume}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-400">Səs ölçeri: {zoneText}</p>

                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-cyan-400 transition-[width] duration-100"
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-400">Stabillik göstəricisi: {confidence}% (100% olmalıdır)</p>
                </div>

                {detectedText && <p className="text-sm font-semibold text-emerald-400">{detectedText}</p>}
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            aria-disabled
            className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-500 opacity-55"
            style={{ cursor: "not-allowed" }}
          >
            Rədd Et
          </button>

          <button
            type="button"
            onClick={beginFakeActivation}
            disabled={phase !== "permission"}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-70"
          >
            İcazə Ver
          </button>
        </div>
      </div>
    </div>
  );
}
