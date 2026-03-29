"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useChaosState } from "@/hooks/useChaosState";

type WatchingEyeProps = {
  missClicks?: number;
  onExplode?: () => void;
};

type Point = {
  x: number;
  y: number;
};

const MAX_STRESS = 10;
const BLOOD_BASE = "#991b1b";

function playGlitchNoise() {
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    return;
  }

    const context = new AudioCtx();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
  const gain = context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(420, now);
    oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.9);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

    oscillator.connect(gain);
  gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.98);
    oscillator.onended = () => {
    void context.close();
  };
}

function BloodDrip({
  delay,
  x,
  width,
  bloodColor,
}: {
  delay: number;
  x: string;
  width: number;
  bloodColor: string;
}) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: [0, 95, 155], opacity: [0, 1, 0] }}
      transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, delay, ease: "linear" }}
      className="absolute top-[74%] z-[101] rounded-b-full"
      style={{
        left: x,
        width,
        backgroundColor: bloodColor,
        boxShadow: "0 0 8px rgba(153, 27, 27, 0.9)",
      }}
    />
  );
}

export default function WatchingEye({ missClicks, onExplode }: WatchingEyeProps) {
  const { gameState } = useChaosState();
  const effectiveMissClicks = missClicks ?? gameState.attempts;

  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [isExploded, setIsExploded] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [viewportCenter, setViewportCenter] = useState<Point>({ x: 0, y: 0 });

  const blinkTimerRef = useRef<number | null>(null);
  const blinkCloseRef = useRef<number | null>(null);
  const explodeCooldownRef = useRef(0);

  const stressLevel = Math.min(Math.max(effectiveMissClicks, 0), MAX_STRESS);
  const eyeScale = 0.88 + stressLevel * 0.1;

  const theme = useMemo(() => {
    const alpha = 0.4 + stressLevel * 0.06;
    return {
      glow: `0 0 ${20 + stressLevel * 10}px rgba(220, 38, 38, ${alpha})`,
      blood: BLOOD_BASE,
      border: `rgba(${95 + stressLevel * 12}, 10, 12, 0.95)`,
    };
  }, [stressLevel]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      setMousePos({ x: event.clientX, y: event.clientY });
    };

    const onResize = () => {
      setViewportCenter({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    };

    onResize();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (isExploded) {
      return;
    }

    const scheduleBlink = () => {
      blinkTimerRef.current = window.setTimeout(() => {
        setIsBlinking(true);
        blinkCloseRef.current = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150);
      }, 3000 + Math.floor(Math.random() * 2000));
    };

    scheduleBlink();

    return () => {
      if (blinkTimerRef.current !== null) {
        window.clearTimeout(blinkTimerRef.current);
      }
      if (blinkCloseRef.current !== null) {
        window.clearTimeout(blinkCloseRef.current);
      }
    };
  }, [isExploded]);

  useEffect(() => {
    const now = Date.now();
    if (stressLevel < 10 || isExploded || now < explodeCooldownRef.current) {
      return;
    }

    explodeCooldownRef.current = now + 9000;
    setIsExploded(true);
    playGlitchNoise();

    const glitchShowId = window.setTimeout(() => {
      setShowGlitch(true);
    }, 400);

    const explodeDoneId = window.setTimeout(() => {
      if (onExplode) {
        onExplode();
      }
    }, 2500);

    const glitchHideId = window.setTimeout(() => {
      setShowGlitch(false);
    }, 3400);

    const respawnId = window.setTimeout(() => {
      setIsExploded(false);
    }, 4200);

    return () => {
      window.clearTimeout(glitchShowId);
      window.clearTimeout(explodeDoneId);
      window.clearTimeout(glitchHideId);
      window.clearTimeout(respawnId);
    };
  }, [isExploded, onExplode, stressLevel]);

  const inversePupilX = ((mousePos.x - viewportCenter.x) * -0.08);
  const inversePupilY = ((mousePos.y - viewportCenter.y) * -0.08);
  const clampedPupilX = Math.max(-24, Math.min(24, inversePupilX));
  const clampedPupilY = Math.max(-24, Math.min(24, inversePupilY));

  return (
    <div className="pointer-events-none fixed inset-0 z-[999]">
      <AnimatePresence>
        {!isExploded ? (
          <motion.div
            key="watching-eye"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1,
              scale: eyeScale,
              rotate: isBlinking ? [0, 1, -1, 0] : 0,
              x: stressLevel >= 6 ? [0, -3, 3, -3, 0] : 0,
              y: stressLevel >= 6 ? [0, 2, -2, 2, 0] : 0,
            }}
            transition={{
              x: stressLevel >= 6 ? { repeat: Number.POSITIVE_INFINITY, duration: 0.08 } : { duration: 0.2 },
              y: stressLevel >= 6 ? { repeat: Number.POSITIVE_INFINITY, duration: 0.08 } : { duration: 0.2 },
              rotate: { duration: 0.16 },
            }}
            className="fixed bottom-4 right-3 z-[100] flex h-20 w-20 items-center justify-center sm:bottom-auto sm:right-12 sm:top-12 sm:h-36 sm:w-36"
          >
            <BloodDrip x="25%" delay={0} width={3} bloodColor={theme.blood} />
            <BloodDrip x="55%" delay={1.2} width={5} bloodColor={theme.blood} />
            <BloodDrip x="80%" delay={0.6} width={4} bloodColor={theme.blood} />

            <div
              className="relative z-[102] flex h-full w-full items-center justify-center overflow-hidden rounded-full border-4 bg-black transition-all duration-300"
              style={{ borderColor: theme.border, boxShadow: `inset 0 0 50px black, ${theme.glow}` }}
            >
              <motion.div
                animate={{ opacity: [0.3, 0.65, 0.3] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: "radial-gradient(circle, transparent 20%, #7f1d1d 150%)" }}
              />

              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 7 - stressLevel * 0.5, ease: "linear" }}
                className="absolute h-16 w-16 rounded-full border-[2px] border-dashed border-red-600/25 opacity-50 sm:h-32 sm:w-32"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 10 - stressLevel * 0.45, ease: "linear" }}
                className="absolute h-12 w-12 rounded-full border border-red-500/25 sm:h-24 sm:w-24"
              />

              <motion.div
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-red-900/40 bg-black shadow-[0_0_20px_black] sm:h-16 sm:w-16"
                style={{ x: clampedPupilX, y: clampedPupilY }}
              >
                <div className="absolute left-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500/10 blur-[2px] sm:left-3 sm:top-3 sm:h-4 sm:w-4" />
                {stressLevel > 5 && (
                  <span className="select-none text-[6px] font-black uppercase tracking-tighter text-red-600/60 sm:text-[7px]">
                    BOS-BES
                  </span>
                )}
              </motion.div>

              <motion.div
                initial={{ height: 0 }}
                animate={{ height: isBlinking ? "50%" : "0%" }}
                className="absolute left-0 top-0 z-20 w-full origin-top bg-black"
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: isBlinking ? "50%" : "0%" }}
                className="absolute bottom-0 left-0 z-20 w-full origin-bottom bg-black"
              />

              <div className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(220,38,38,0.05)_50%)] bg-[size:100%_4px] opacity-40" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="explosion"
            initial={{ y: 0, rotate: 0, opacity: 1 }}
            animate={{ y: 2000, rotate: 1080, opacity: 0 }}
            transition={{ duration: 2, ease: "easeIn" }}
            className="fixed bottom-4 right-3 flex h-20 w-20 items-center justify-center sm:bottom-auto sm:right-12 sm:top-12 sm:h-36 sm:w-36"
          >
            <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-red-600 bg-red-950 text-4xl shadow-[0_0_120px_#ff0000] sm:text-7xl">
              🩸
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGlitch && (
          <motion.div
            key="glitch-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0, 1, 0, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden bg-red-950/85 backdrop-blur-2xl"
          >
            <div className="z-[2] text-7xl font-black uppercase tracking-tight text-red-600 mix-blend-difference sm:text-9xl">
              SISTEM COKDU
            </div>
            <div className="absolute inset-0 z-[1] opacity-45 [background:repeating-linear-gradient(0deg,rgba(255,255,255,0.12)_0px,rgba(255,255,255,0.12)_2px,rgba(0,0,0,0.4)_3px,rgba(0,0,0,0.4)_4px)]" />
            <motion.div
              className="absolute inset-0 z-[1] bg-red-600/20"
              animate={{ x: [0, -10, 8, -5, 0], opacity: [0.3, 0.65, 0.35, 0.6, 0.4] }}
              transition={{ duration: 0.15, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

