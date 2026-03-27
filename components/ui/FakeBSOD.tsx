"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type BsodPhase = "bsod" | "tear" | "done";

export default function FakeBSOD({
  active,
  onRecovered,
}: {
  active: boolean;
  onRecovered: () => void;
}) {
  const [phase, setPhase] = useState<BsodPhase>("bsod");
  const [progress, setProgress] = useState(0);

  const progressTimerRef = useRef<number | null>(null);
  const phaseTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (phaseTimerRef.current !== null) {
      window.clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  };

  const playGlitchNoise = () => {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtx) {
      return;
    }

    const context = new AudioCtx();
    const duration = 0.65;
    const sampleRate = context.sampleRate;
    const buffer = context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * 0.35;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    filter.type = "highpass";
    filter.frequency.value = 1200;
    gain.gain.value = 0.6;

    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();
    source.stop(context.currentTime + duration);
    source.onended = () => {
      context.close().catch(() => {
        return;
      });
    };
  };

  useEffect(() => {
    if (!active) {
      setPhase("bsod");
      setProgress(0);
      clearTimers();
      return;
    }

    setPhase("bsod");
    setProgress(0);
    clearTimers();

    let ticks = 0;
    progressTimerRef.current = window.setInterval(() => {
      ticks += 1;
      setProgress(Math.min(100, Math.round((ticks / 30) * 100)));
    }, 100);

    phaseTimerRef.current = window.setTimeout(() => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProgress(100);
      setPhase("tear");
      playGlitchNoise();

      phaseTimerRef.current = window.setTimeout(() => {
        setPhase("done");
        onRecovered();
      }, 2000);
    }, 3000);

    return () => {
      clearTimers();
    };
  }, [active, onRecovered]);

  const qrPattern = useMemo(() => {
    return Array.from({ length: 14 }, (_, row) =>
      Array.from({ length: 14 }, (_, col) => (row * 11 + col * 7 + row + col) % 3 === 0),
    );
  }, []);

  if (!active || phase === "done") {
    return null;
  }

  const tearing = phase === "tear";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130]"
      >
        <motion.div
          className="relative h-full w-full text-white"
          style={{ backgroundColor: "#0078D4" }}
          animate={
            tearing
              ? {
                  x: [0, -5, 5, -4, 4, 0],
                  y: [0, 4, -4, 3, -3, 0],
                  clipPath: [
                    "polygon(100% 0, 100% 0, 100% 100%, 0 100%, 0 0)",
                    "polygon(100% 0, 85% 35%, 100% 100%, 0 100%, 0 0)",
                  ],
                }
              : {
                  clipPath: "polygon(100% 0, 100% 0, 100% 100%, 0 100%, 0 0)",
                }
          }
          transition={{ duration: tearing ? 2 : 0.2, ease: "easeInOut" }}
        >
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col justify-center gap-7 px-8 sm:px-14">
            <div className="text-[120px] leading-none">😢</div>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Saytınız problem tapdı və bağlanmalı oldu.
            </h2>
            <p className="text-xl">Problemin %{progress} toplanır...</p>
            <p className="text-lg font-semibold">SHIT_GAME_EXCEPTION 0x000000FE</p>

            <div className="mt-1 flex items-end gap-5">
              <div
                className="grid gap-[1px] rounded border border-white/60 bg-white p-2"
                style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
              >
                {qrPattern.flatMap((row, rowIndex) =>
                  row.map((filled, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`h-[6px] w-[6px] ${filled ? "bg-black" : "bg-white"}`}
                    />
                  )),
                )}
              </div>
              <p className="pb-1 text-sm text-white/90">Ətraflı məlumat: https://əsəb.az/kömək</p>
            </div>
          </div>

          {tearing && (
            <motion.div
              initial={{ opacity: 0.2, x: 220, y: -80, rotate: 24 }}
              animate={{ opacity: [0.25, 0.9, 0.35], x: -320, y: 420, rotate: 24 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="pointer-events-none absolute h-[3px] w-[680px] bg-white shadow-[0_0_24px_rgba(255,255,255,0.95)]"
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

