"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type MouseEvent, type TouchEvent, useEffect, useRef, useState } from "react";

type FailurePhase = "idle" | "static" | "bsod" | "recovered";

export default function Stage1_Welcome({
  onComplete,
  onFail,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [buttonRotation, setButtonRotation] = useState(0);
  const [failurePhase, setFailurePhase] = useState<FailurePhase>("idle");
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [mobileCatchCount, setMobileCatchCount] = useState(0);
  const playAreaRef = useRef<HTMLDivElement | null>(null);
  const catchButtonRef = useRef<HTMLButtonElement | null>(null);
  const staticTimerRef = useRef<number | null>(null);
  const bsodTimerRef = useRef<number | null>(null);
  const recoverTimerRef = useRef<number | null>(null);
  const staticAudioRef = useRef<HTMLAudioElement | null>(null);
  const buzzAudioRef = useRef<HTMLAudioElement | null>(null);

  const clampPosition = (x: number, y: number) => {
    const container = playAreaRef.current;
    const button = catchButtonRef.current;

    if (!container || !button) {
      return { x: 0, y: 0 };
    }

    const maxX = Math.max(0, container.clientWidth - button.offsetWidth - 2);
    const maxY = Math.max(0, container.clientHeight - button.offsetHeight - 2);

    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  };

  const moveButton = () => {
    const container = playAreaRef.current;
    const button = catchButtonRef.current;

    if (!container || !button) {
      return;
    }

    const maxX = Math.max(0, container.clientWidth - button.offsetWidth - 2);
    const maxY = Math.max(0, container.clientHeight - button.offsetHeight - 2);

    const nextX = Math.floor(Math.random() * (maxX + 1));
    const nextY = Math.floor(Math.random() * (maxY + 1));

    setButtonPosition({ x: nextX, y: nextY });
  };

  const applyInverseMove = (clientX: number, clientY: number) => {
    if (failurePhase !== "idle") {
      return;
    }

    const container = playAreaRef.current;
    const button = catchButtonRef.current;

    if (!container || !button) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;

    const inverseX = container.clientWidth - relativeX - button.offsetWidth / 2;
    const inverseY = container.clientHeight - relativeY - button.offsetHeight / 2;

    const jitterX = (Math.random() - 0.5) * 26;
    const jitterY = (Math.random() - 0.5) * 20;
    const nextPosition = clampPosition(inverseX + jitterX, inverseY + jitterY);

    setButtonPosition(nextPosition);
    setButtonRotation((prev) => prev + 20 + Math.random() * 35);
  };

  useEffect(() => {
    const initId = window.setTimeout(() => moveButton(), 0);

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const syncPointerMode = () => {
      setIsCoarsePointer(mediaQuery.matches);
    };
    syncPointerMode();
    mediaQuery.addEventListener("change", syncPointerMode);

    const handleResize = () => {
      setButtonPosition((prev) => clampPosition(prev.x, prev.y));
    };

    window.addEventListener("resize", handleResize);

    staticAudioRef.current = new Audio("/sounds/fail.mp3");
    if (staticAudioRef.current) {
      staticAudioRef.current.loop = true;
      staticAudioRef.current.volume = 0.35;
    }

    buzzAudioRef.current = new Audio("/sounds/fail.mp3");
    if (buzzAudioRef.current) {
      buzzAudioRef.current.loop = false;
      buzzAudioRef.current.volume = 0.6;
    }

    return () => {
      window.clearTimeout(initId);
      window.removeEventListener("resize", handleResize);
      if (staticTimerRef.current !== null) {
        window.clearTimeout(staticTimerRef.current);
      }
      if (bsodTimerRef.current !== null) {
        window.clearTimeout(bsodTimerRef.current);
      }
      if (recoverTimerRef.current !== null) {
        window.clearTimeout(recoverTimerRef.current);
      }

      if (staticAudioRef.current) {
        staticAudioRef.current.pause();
        staticAudioRef.current.currentTime = 0;
      }

      if (buzzAudioRef.current) {
        buzzAudioRef.current.pause();
        buzzAudioRef.current.currentTime = 0;
      }

      mediaQuery.removeEventListener("change", syncPointerMode);
    };
  }, []);

  const handleInverseMove = (event: MouseEvent<HTMLDivElement>) => {
    applyInverseMove(event.clientX, event.clientY);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const firstTouch = event.touches[0];
    if (!firstTouch) {
      return;
    }

    applyInverseMove(firstTouch.clientX, firstTouch.clientY);
  };

  const handleEscape = () => {
    if (failurePhase !== "idle") {
      return;
    }

    onFail();
    moveButton();
    setButtonRotation((prev) => prev + 120);
  };

  const handleCatch = () => {
    if (failurePhase !== "idle") {
      return;
    }

    setMobileCatchCount(0);
    setFailurePhase("static");
    void staticAudioRef.current?.play().catch(() => {
      return;
    });

    staticTimerRef.current = window.setTimeout(() => {
      setFailurePhase("bsod");
      if (staticAudioRef.current) {
        staticAudioRef.current.pause();
        staticAudioRef.current.currentTime = 0;
      }
      void buzzAudioRef.current?.play().catch(() => {
        return;
      });

      bsodTimerRef.current = window.setTimeout(() => {
        setFailurePhase("recovered");

        recoverTimerRef.current = window.setTimeout(() => {
          setFailurePhase("idle");
          onComplete();
        }, 2200);
      }, 10000);
    }, 3000);
  };

  const handleTouchCatch = (event: TouchEvent<HTMLButtonElement>) => {
    if (!isCoarsePointer || failurePhase !== "idle") {
      return;
    }

    event.preventDefault();

    const requiredTouches = 10;
    setMobileCatchCount((prev) => {
      const next = prev + 1;
      if (next >= requiredTouches) {
        onComplete();
        return 0;
      }

      onFail();
      moveButton();
      setButtonRotation((rot) => rot + 120);
      return next;
    });
  };

  const glyphLine = "ᚠ⟁₪⫷⧖Жꙮ卐⟟ѪⵣⴹฬψฬѮ⧉ⴵѬ";

  return (
    <section className="relative w-full max-w-4xl space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 text-center shadow-xl">
      <h1 className="text-3xl font-bold text-zinc-100">Xoş Gəlmisən, Bas Görək</h1>
      <p className="text-sm text-zinc-300">
        Zona böyüdü: kursor tərsinə aldadır, düymə də fırlanıb qaçır — çətindir, amma mümkündür.
      </p>
      {isCoarsePointer && (
        <p className="text-xs font-semibold text-amber-300">Telefon rejimi: düyməni tutmaq üçün 10 dəfə təqib et ({mobileCatchCount}/10).</p>
      )}

      <div
        ref={playAreaRef}
        onMouseMove={handleInverseMove}
        onTouchMove={handleTouchMove}
        className="relative mx-auto h-[420px] w-full max-w-[960px] touch-none overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/70"
      >
        <motion.button
          ref={catchButtonRef}
          type="button"
          onMouseEnter={handleEscape}
          onTouchStart={handleTouchCatch}
          onClick={handleCatch}
          disabled={failurePhase !== "idle"}
          animate={{ x: buttonPosition.x, y: buttonPosition.y, rotate: buttonRotation }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="absolute left-0 top-0 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white"
        >
          Məni Kliklə
        </motion.button>
      </div>

      <AnimatePresence>
        {failurePhase === "static" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] overflow-hidden bg-black"
          >
            <motion.div
              className="absolute inset-0"
              animate={{ x: [0, -8, 8, -5, 5, 0], y: [0, 7, -7, 4, -4, 0] }}
              transition={{ duration: 0.2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, rgba(255,0,120,0.28), transparent 36%), radial-gradient(circle at 70% 40%, rgba(0,220,255,0.28), transparent 40%), repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, rgba(0,0,0,0.2) 3px, rgba(0,0,0,0.2) 4px)",
              }}
            />
            {Array.from({ length: 20 }).map((_, index) => (
              <motion.div
                key={`noise-${index}`}
                className="absolute h-[2px] bg-white/60"
                style={{
                  top: `${index * 5}%`,
                  width: `${35 + (index % 7) * 9}%`,
                  left: `${(index * 13) % 50}%`,
                }}
                animate={{ x: [0, -40, 28, -18, 12, 0], opacity: [0.1, 0.7, 0.25, 0.8, 0.3, 0.1] }}
                transition={{ duration: 0.16 + (index % 5) * 0.03, repeat: Number.POSITIVE_INFINITY }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {failurePhase === "bsod" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[161] bg-[#0057D8] px-8 py-10 text-white"
          >
            <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center gap-6">
              <div className="inline-flex w-fit items-center gap-2 rounded border border-white/50 bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-white">
                ⚠ OYUN SİMULYASİYASI • ƏSƏB BÖLMƏSİ TEST SƏHNƏSİ
              </div>
              <div className="text-[120px] leading-none">:(</div>
              <p className="text-2xl font-semibold">Sistem kritik xətaya düşdü.</p>
              <p className="text-sm opacity-90">{glyphLine.repeat(4)}</p>
              <p className="text-sm opacity-80">⟁⧖⫷ 卐 ѪѬ ⟟⟒ⵣ ⴹ {glyphLine.repeat(2)}</p>
              <p className="text-sm opacity-75">𖠋 𖢻 𖤍 ꙮ ⊬ ⊭ {glyphLine.repeat(2)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {failurePhase === "recovered" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-8 left-1/2 z-[162] -translate-x-1/2 rounded-xl border border-zinc-500 bg-zinc-950/95 px-5 py-3 text-sm font-bold text-zinc-100"
          >
            Sistemin sındığını sanırdın?
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

