"use client";

import { motion } from "framer-motion";
import { type MouseEvent, useEffect, useRef, useState } from "react";

export default function Stage1_Welcome({
  onComplete,
  onFail,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [buttonRotation, setButtonRotation] = useState(0);
  const playAreaRef = useRef<HTMLDivElement | null>(null);
  const catchButtonRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    const initId = window.setTimeout(() => moveButton(), 0);

    const handleResize = () => {
      setButtonPosition((prev) => clampPosition(prev.x, prev.y));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.clearTimeout(initId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleInverseMove = (event: MouseEvent<HTMLDivElement>) => {
    const container = playAreaRef.current;
    const button = catchButtonRef.current;

    if (!container || !button) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;

    const inverseX = container.clientWidth - relativeX - button.offsetWidth / 2;
    const inverseY = container.clientHeight - relativeY - button.offsetHeight / 2;

    const jitterX = (Math.random() - 0.5) * 26;
    const jitterY = (Math.random() - 0.5) * 20;
    const nextPosition = clampPosition(inverseX + jitterX, inverseY + jitterY);

    setButtonPosition(nextPosition);
    setButtonRotation((prev) => prev + 20 + Math.random() * 35);
  };

  const handleEscape = () => {
    onFail();
    moveButton();
    setButtonRotation((prev) => prev + 120);
  };

  const handleCatch = () => {
    onComplete();
  };

  return (
    <section className="relative w-full max-w-4xl space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 text-center shadow-xl">
      <h1 className="text-3xl font-bold text-zinc-100">Xoş Gəlmisən, Bas Görək</h1>
      <p className="text-sm text-zinc-300">Zona böyüdü: kursor tərsinə aldadır, düymə də fırlanıb qaçır — çətindir, amma mümkündür.</p>

      <div
        ref={playAreaRef}
        onMouseMove={handleInverseMove}
        className="relative mx-auto h-[420px] w-full max-w-[960px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/70"
      >
        <motion.button
          ref={catchButtonRef}
          type="button"
          onMouseEnter={handleEscape}
          onClick={handleCatch}
          animate={{ x: buttonPosition.x, y: buttonPosition.y, rotate: buttonRotation }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="absolute left-0 top-0 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white"
        >
          😈 tuT inəM
        </motion.button>
      </div>
    </section>
  );
}
