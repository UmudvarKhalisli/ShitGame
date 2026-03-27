"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useChaosState } from "@/hooks/useChaosState";

const ROAST_MESSAGES = [
  "Kursoru belə tuta bilmirsən?",
  "Bunu proqramçı yazıb, sən niyə bacarmırsan?",
  "Nənəm səndən sürətli klikləyərdi.",
  "Bu temp ilə finishə çatanda il dəyişəcək.",
  "Düymə səni görüb özü qaçdı.",
  "Səbir var, amma skill hələ yoldadır.",
  "Bir klik bu qədər dramatik olmamalı idi.",
  "Ekran sənə baxıb utandı.",
  "Try-hard rejimi aç, yoxsa bu çətin gedəcək.",
  "Səhv kliklər kolleksiya yığırsan deyəsən.",
] as const;

const SHOW_MS = 4200;
const TYPE_SPEED_MS = 24;
const AUTO_ROAST_MS = 15000;

export default function TheRoaster() {
  const { gameState } = useChaosState();
  const [activeMessage, setActiveMessage] = useState("");
  const [typedText, setTypedText] = useState("");

  const previousAttemptsRef = useRef(gameState.attempts);
  const hideTimerRef = useRef<number | null>(null);
  const typeTimerRef = useRef<number | null>(null);

  const randomMessage = useMemo(
    () => () => ROAST_MESSAGES[Math.floor(Math.random() * ROAST_MESSAGES.length)] ?? ROAST_MESSAGES[0],
    [],
  );

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (typeTimerRef.current !== null) {
      window.clearInterval(typeTimerRef.current);
      typeTimerRef.current = null;
    }
  }, []);

  const showRoast = useCallback((message: string) => {
    clearTimers();
    setActiveMessage(message);
    setTypedText("");

    let index = 0;
    typeTimerRef.current = window.setInterval(() => {
      index += 1;
      setTypedText(message.slice(0, index));

      if (index >= message.length && typeTimerRef.current !== null) {
        window.clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
      }
    }, TYPE_SPEED_MS);

    hideTimerRef.current = window.setTimeout(() => {
      setActiveMessage("");
      setTypedText("");
    }, SHOW_MS);
  }, [clearTimers]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      showRoast(randomMessage());
    }, AUTO_ROAST_MS);

    return () => {
      window.clearInterval(intervalId);
      clearTimers();
    };
  }, [randomMessage, showRoast, clearTimers]);

  useEffect(() => {
    if (gameState.attempts > previousAttemptsRef.current) {
      showRoast(randomMessage());
    }

    previousAttemptsRef.current = gameState.attempts;
  }, [gameState.attempts, randomMessage, showRoast]);

  return (
    <div className="pointer-events-none fixed left-1/2 top-5 z-[140] w-[min(92vw,680px)] -translate-x-1/2">
      <AnimatePresence>
        {activeMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="rounded-md border border-zinc-600 bg-zinc-950/95 px-4 py-3 text-center text-sm text-violet-300 shadow-[0_0_14px_rgba(34,197,94,0.3)]"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            {typedText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


