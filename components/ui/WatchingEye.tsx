"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useChaosState } from "@/hooks/useChaosState";

type Offset = {
  x: number;
  y: number;
};

const MAX_PUPIL_OFFSET = 18;

function playGlitchNoise() {
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    return;
  }

  const context = new AudioCtx();
  const duration = 1;
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.7;
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = 0.8;
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
  source.stop(context.currentTime + duration);
  source.onended = () => {
    void context.close();
  };
}

export default function WatchingEye() {
  const { gameState } = useChaosState();
  const eyeRef = useRef<HTMLDivElement | null>(null);

  const [pupilOffset, setPupilOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [hasExploded, setHasExploded] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);

  const missClicks = gameState.attempts;
  const intensity = useMemo(() => Math.min(1, missClicks / 10), [missClicks]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const eye = eyeRef.current;
      if (!eye) {
        return;
      }

      const rect = eye.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const distance = Math.hypot(dx, dy) || 1;

      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      const offsetStrength = Math.min(MAX_PUPIL_OFFSET, 5 + distance * 0.06);

      // Inverse tracking: pupil moves opposite to cursor direction.
      setPupilOffset({
        x: -normalizedX * offsetStrength,
        y: -normalizedY * offsetStrength,
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  useEffect(() => {
    let blinkTimer: number | null = null;
    let reopenTimer: number | null = null;

    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        setIsBlinking(true);
        reopenTimer = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 170);
      }, 3000 + Math.floor(Math.random() * 2000));
    };

    scheduleBlink();

    return () => {
      if (blinkTimer !== null) {
        window.clearTimeout(blinkTimer);
      }
      if (reopenTimer !== null) {
        window.clearTimeout(reopenTimer);
      }
    };
  }, []);

  useEffect(() => {
    if (hasExploded || missClicks < 10) {
      return;
    }

    setHasExploded(true);
    playGlitchNoise();

    const showTimer = window.setTimeout(() => {
      setShowGlitch(true);
    }, 420);

    const hideTimer = window.setTimeout(() => {
      setShowGlitch(false);
    }, 2600);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [hasExploded, missClicks]);

  const frameGlow = 22 + intensity * 42;
  const bloodOpacity = 0.45 + intensity * 0.55;
  const irisSpeed = 14 - intensity * 6;

  return (
    <>
      <motion.div
        className="pointer-events-none fixed right-4 top-2 z-[130]"
        initial={false}
        animate={
          hasExploded
            ? { y: 520, rotate: 690, opacity: 0, scale: 0.68 }
            : { y: 0, rotate: 0, opacity: 1, scale: 1 }
        }
        transition={
          hasExploded
            ? { duration: 1.45, ease: [0.2, 0.85, 0.2, 1] }
            : { duration: 0.25, ease: "easeOut" }
        }
      >
        <div className="relative h-[182px] w-[234px]">
          <svg
            viewBox="0 0 230 170"
            className="absolute inset-0 h-full w-full"
            style={{ filter: `drop-shadow(0 0 ${frameGlow}px rgba(239,68,68,${0.45 + intensity * 0.45}))` }}
          >
            <path
              d="M18 82 C40 46, 80 26, 115 28 C150 30, 188 50, 212 84 C186 116, 151 136, 114 138 C76 140, 37 120, 18 82 Z"
              fill="#14090a"
              stroke="#30090b"
              strokeWidth="4"
            />
            <path
              d="M36 56 l8 -18 l8 16 l8 -17 l7 15 l8 -14 l8 15 l8 -15 l7 16 l8 -16 l9 17 l8 -16 l9 18"
              fill="none"
              stroke="#2a0d0f"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <ellipse cx="116" cy="84" rx="50" ry="42" fill="#f3f3f3" stroke="#1f1b1b" strokeWidth="6" />
            <path
              d="M70 114 C98 124, 136 124, 163 112"
              fill="none"
              stroke={`rgba(230,25,25,${bloodOpacity})`}
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>

          <div
            ref={eyeRef}
            className="absolute left-1/2 top-1/2 h-[95px] w-[95px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-black/40"
          >
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: irisSpeed, ease: "linear" }}
              style={{
                background:
                  "repeating-conic-gradient(from 0deg, rgba(110,110,110,0.8) 0deg 8deg, rgba(255,255,255,0.6) 8deg 14deg, rgba(30,30,30,0.7) 14deg 20deg)",
              }}
            />
            <div
              className="absolute left-1/2 top-1/2 h-[28px] w-[28px] rounded-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-transform duration-75"
              style={{
                transform: `translate(calc(-50% + ${pupilOffset.x}px), calc(-50% + ${pupilOffset.y}px))`,
              }}
            />
            <motion.div
              className="absolute inset-0 bg-[#130405]"
              animate={{ scaleY: isBlinking ? 1 : 0 }}
              transition={{ duration: 0.12, ease: "easeInOut" }}
              style={{ transformOrigin: "center" }}
            />
          </div>

          <motion.div
            className="absolute left-[142px] top-[112px] h-12 w-2 rounded-full bg-gradient-to-b from-red-300/90 via-red-500/90 to-red-950/10"
            animate={{ y: [0, 16, 0], opacity: [0.35, 0.9, 0.4], scaleY: [0.6, 1.25, 0.7] }}
            transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-[96px] top-[114px] h-10 w-1.5 rounded-full bg-gradient-to-b from-red-300/85 via-red-500/85 to-red-950/10"
            animate={{ y: [0, 14, 0], opacity: [0.25, 0.82, 0.3], scaleY: [0.55, 1.1, 0.6] }}
            transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.55 }}
          />
          <motion.div
            className="absolute left-[168px] top-[113px] h-11 w-2 rounded-full bg-gradient-to-b from-red-300/90 via-red-600/90 to-red-950/10"
            animate={{ y: [0, 20, 0], opacity: [0.3, 0.94, 0.34], scaleY: [0.58, 1.3, 0.65] }}
            transition={{ duration: 3.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.3 }}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {showGlitch && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-red-900/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ x: [0, -8, 10, -6, 0], opacity: [0.72, 0.94, 0.78, 0.92, 0.75] }}
              transition={{ duration: 0.14, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 2px, rgba(0,0,0,0.45) 3px, rgba(0,0,0,0.45) 4px)",
              }}
            />
            <p className="relative text-5xl font-black tracking-[0.2em] text-white sm:text-7xl">SISTEM COKDU</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
