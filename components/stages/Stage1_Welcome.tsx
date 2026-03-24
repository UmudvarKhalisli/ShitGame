"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useInverseMouse } from "@/hooks/useInverseMouse";

export default function Stage1_Welcome({
  onComplete,
  onFail,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const inverseMouse = useInverseMouse();
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
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
    const applyNoCursor = () => {
      document.documentElement.style.cursor = "none";
      document.body.style.cursor = "none";
    };

    applyNoCursor();
    const initId = window.setTimeout(() => moveButton(), 0);

    const handleResize = () => {
      setButtonPosition((prev) => clampPosition(prev.x, prev.y));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.clearTimeout(initId);
      window.removeEventListener("resize", handleResize);
      document.documentElement.style.cursor = "";
      document.body.style.cursor = "";
    };
  }, []);

  const fakeCursorStyle = useMemo(
    () => ({
      left: inverseMouse.x,
      top: inverseMouse.y,
      transform: "translate(-50%, -50%)",
    }),
    [inverseMouse.x, inverseMouse.y],
  );

  const handleEscape = () => {
    onFail();
    moveButton();
  };

  const handleCatch = () => {
    onComplete();
  };

  return (
    <section className="relative w-full max-w-xl cursor-none space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 text-center shadow-xl">
      <h1 className="text-3xl font-bold text-zinc-100">Xoş Gəlmisən, Bas Görək</h1>
      <p className="text-sm text-zinc-300">Düyməyə çatmaq üçün əvvəl onu yormadan yaxala.</p>

      <div
        ref={playAreaRef}
        className="relative mx-auto h-[260px] w-full max-w-[480px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/70"
      >
        <motion.button
          ref={catchButtonRef}
          type="button"
          onMouseEnter={handleEscape}
          onClick={handleCatch}
          animate={{ x: buttonPosition.x, y: buttonPosition.y }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="absolute left-0 top-0 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white"
        >
          Məni Tut 😈
        </motion.button>
      </div>

      <div
        className="pointer-events-none fixed z-50 text-2xl font-black text-zinc-100"
        style={fakeCursorStyle}
      >
        ⊗
      </div>
    </section>
  );
}
