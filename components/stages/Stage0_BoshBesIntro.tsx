"use client";

import { motion } from "framer-motion";
import { type MouseEvent, type TouchEvent, useEffect, useRef, useState } from "react";

const START_LABELS = ["Başla", "Məni Tutma", "Boş Ver", "Get İşinlə Məşğul Ol"];

type TimerTick = {
  minute: number;
  second: number;
};

function formatTimer(value: TimerTick) {
  const mm = String(Math.max(0, value.minute)).padStart(2, "0");
  const ss = String(Math.max(0, value.second)).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function Stage0_BoshBesIntro({ onComplete }: { onComplete: () => void }) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const [buttonText, setButtonText] = useState(START_LABELS[0]);
  const [buttonPos, setButtonPos] = useState({ x: 0, y: 0 });
  const [timerValue, setTimerValue] = useState<TimerTick>({ minute: 12, second: 37 });
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [mobileCatchCount, setMobileCatchCount] = useState(0);

  const moveButtonRandomly = () => {
    const area = areaRef.current;
    const button = buttonRef.current;

    if (!area || !button) {
      return;
    }

    const maxX = Math.max(0, area.clientWidth - button.offsetWidth - 10);
    const maxY = Math.max(0, area.clientHeight - button.offsetHeight - 10);
    setButtonPos({
      x: Math.floor(Math.random() * (maxX + 1)),
      y: Math.floor(Math.random() * (maxY + 1)),
    });
    setButtonText(START_LABELS[Math.floor(Math.random() * START_LABELS.length)] ?? "Boş Ver");
  };

  useEffect(() => {
    const initId = window.setTimeout(moveButtonRandomly, 20);
    const mediaQuery = window.matchMedia("(pointer: coarse)");

    const syncPointerMode = () => {
      setIsCoarsePointer(mediaQuery.matches);
    };
    syncPointerMode();
    mediaQuery.addEventListener("change", syncPointerMode);

    const onResize = () => moveButtonRandomly();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      mediaQuery.removeEventListener("change", syncPointerMode);
      window.clearTimeout(initId);
    };
  }, []);

  useEffect(() => {
    let timerId: number | null = null;

    const schedule = () => {
      timerId = window.setTimeout(() => {
        setTimerValue((prev) => {
          const delta = [-2, -1, 1, 2, 3][Math.floor(Math.random() * 5)] ?? 1;
          const current = prev.minute * 60 + prev.second;
          const next = Math.max(0, current + delta);
          return { minute: Math.floor(next / 60), second: next % 60 };
        });
        schedule();
      }, 320 + Math.floor(Math.random() * 1180));
    };

    schedule();
    return () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  const handlePointerChase = (clientX: number, clientY: number) => {
    const area = areaRef.current;
    const button = buttonRef.current;

    if (!area || !button) {
      return;
    }

    const rect = area.getBoundingClientRect();
    const centerX = rect.left + buttonPos.x + button.offsetWidth / 2;
    const centerY = rect.top + buttonPos.y + button.offsetHeight / 2;
    const distance = Math.hypot(clientX - centerX, clientY - centerY);

    if (distance < 150) {
      moveButtonRandomly();
    }
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    handlePointerChase(event.clientX, event.clientY);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const firstTouch = event.touches[0];
    if (!firstTouch) {
      return;
    }

    handlePointerChase(firstTouch.clientX, firstTouch.clientY);
  };

  const handleButtonTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    if (!isCoarsePointer) {
      return;
    }

    event.preventDefault();
    const requiredTouches = 3;
    setMobileCatchCount((prev) => {
      const next = prev + 1;
      if (next >= requiredTouches) {
        onComplete();
        return 0;
      }

      moveButtonRandomly();
      return next;
    });
  };

  const handleButtonClick = () => {
    if (isCoarsePointer) {
      return;
    }

    onComplete();
  };

  return (
    <section className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-[#411111] bg-[#070707]/95 p-8 shadow-[0_0_45px_rgba(180,20,20,0.32)]">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background:radial-gradient(circle_at_10%_10%,rgba(255,40,40,0.18),transparent_36%),radial-gradient(circle_at_80%_80%,rgba(100,0,0,0.2),transparent_42%)]" />

      <div className="absolute right-4 top-3 rounded-md border border-[#5d1b1b] bg-black/50 px-3 py-1 text-xs text-[#ff6c6c]">
        Vaxt Sayğacı: {formatTimer(timerValue)}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <div className="mt-2 text-xs uppercase tracking-[0.25em] text-[#d76464]">Boş-Beş</div>
        <h1 className="glitch-title text-6xl font-black tracking-[0.24em] text-[#ff3131] sm:text-7xl">BOŞ-BEŞ</h1>
        <p className="text-sm text-[#d09090]">Vaxtın çoxdur? Gəl bir az da biz xərcləyək.</p>
        {isCoarsePointer && (
          <p className="text-xs font-semibold text-[#f4a7a7]">Telefon rejimi: düyməni tutmaq üçün 3 dəfə yaxınlaşıb toxun ({mobileCatchCount}/3).</p>
        )}

        <div className="mt-1 flex items-center gap-3 text-[#cf7f7f]">
          <div className="hourglass" aria-hidden>
            <div className="sand-up" />
            <div className="sand-down" />
          </div>
          <span className="text-xs tracking-[0.15em]">Qum bu sistemdə yuxarı axır.</span>
        </div>

        <div
          ref={areaRef}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="relative mt-4 h-[330px] w-full touch-none overflow-hidden rounded-lg border border-[#331010] bg-[#090909]/80"
        >
          <motion.button
            ref={buttonRef}
            type="button"
            onTouchStart={handleButtonTouchStart}
            onClick={handleButtonClick}
            animate={{ x: buttonPos.x, y: buttonPos.y }}
            transition={{ type: "spring", stiffness: 300, damping: 16 }}
            className="absolute left-0 top-0 border border-[#a93131] bg-[#2c0909] px-6 py-3 text-lg font-bold uppercase text-[#ff7d7d]"
          >
            {buttonText}
          </motion.button>
        </div>
      </div>

      <style jsx>{`
        .hourglass {
          position: relative;
          width: 32px;
          height: 54px;
          border: 2px solid rgba(255, 80, 80, 0.7);
          border-radius: 3px;
          overflow: hidden;
          animation: slow-sway 12s ease-in-out infinite;
        }

        .sand-up,
        .sand-down {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
        }

        .sand-up {
          top: 4px;
          border-bottom: 17px solid rgba(255, 120, 120, 0.85);
          animation: fill-up 14s linear infinite;
        }

        .sand-down {
          bottom: 4px;
          border-top: 17px solid rgba(255, 120, 120, 0.38);
          animation: drain-down 14s linear infinite;
        }

        @keyframes slow-sway {
          0% { transform: rotate(-3deg) translateY(0px); }
          50% { transform: rotate(3deg) translateY(-2px); }
          100% { transform: rotate(-3deg) translateY(0px); }
        }

        @keyframes fill-up {
          0% { opacity: 0.5; transform: translateX(-50%) scale(0.7); }
          50% { opacity: 0.95; transform: translateX(-50%) scale(1); }
          100% { opacity: 0.6; transform: translateX(-50%) scale(0.75); }
        }

        @keyframes drain-down {
          0% { opacity: 0.95; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.45; transform: translateX(-50%) scale(0.72); }
          100% { opacity: 0.9; transform: translateX(-50%) scale(0.96); }
        }
      `}</style>
    </section>
  );
}

