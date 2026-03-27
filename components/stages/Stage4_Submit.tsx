"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PopupItem = {
  id: number;
  x: number;
  y: number;
  message: string;
};

const MAX_POPUPS = 50;
const POPUP_WIDTH = 300;
const POPUP_HEIGHT = 150;

export default function Stage4_Submit({
  onComplete,
  onFail,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const nextIdRef = useRef(1);

  const popupMessages = useMemo(
    () => [
      "Əminsiniz?",
      "Çox əminsiniz?",
      "Bəlkə fikirləşəsiniz?",
      "Bu qərar dönməz ola bilər",
      "Anbanız dolub! (zarafat)",
      "Yeni mesajınız var! (yoxdur)",
      "Sistemi yeniləyin! (lazım deyil)",
    ],
    [],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const randomPosition = () => {
    if (typeof window === "undefined") {
      return { x: 24, y: 24 };
    }

    const maxX = Math.max(24, window.innerWidth - POPUP_WIDTH - 24);
    const maxY = Math.max(24, window.innerHeight - POPUP_HEIGHT - 24);

    return {
      x: Math.floor(Math.random() * (maxX - 24 + 1)) + 24,
      y: Math.floor(Math.random() * (maxY - 24 + 1)) + 24,
    };
  };

  const randomMessage = () => {
    const randomIndex = Math.floor(Math.random() * popupMessages.length);
    return popupMessages[randomIndex];
  };

  const spawnPopups = (count: number) => {
    setPopups((prev) => {
      if (prev.length >= MAX_POPUPS) {
        return prev;
      }

      const allowed = Math.min(count, MAX_POPUPS - prev.length);
      const newItems: PopupItem[] = [];

      for (let i = 0; i < allowed; i += 1) {
        const position = randomPosition();
        newItems.push({
          id: nextIdRef.current,
          x: position.x,
          y: position.y,
          message: randomMessage(),
        });
        nextIdRef.current += 1;
      }

      return [...prev, ...newItems];
    });
  };

  const isAtCap = popups.length >= MAX_POPUPS;

  const handleMainClick = () => {
    onFail();
    spawnPopups(3);
  };

  const handleCloseClick = (id: number) => {
    const roll = Math.random();

    if (roll < 0.6) {
      spawnPopups(2);
      return;
    }

    if (roll < 0.9) {
      const position = randomPosition();
      setPopups((prev) =>
        prev.map((popup) =>
          popup.id === id
            ? {
                ...popup,
                x: position.x,
                y: position.y,
              }
            : popup,
        ),
      );
      return;
    }

    setPopups((prev) => prev.filter((popup) => popup.id !== id));
  };

  const handleUltimateSubmit = () => {
    setPopups([]);
    onComplete();
  };

  const popupLayer = isMounted
    ? createPortal(
        <div className="pointer-events-none fixed inset-0 z-50">
          <AnimatePresence>
            {popups.map((popup) => (
              <motion.div
                key={popup.id}
                initial={{ opacity: 0, scale: 0.7, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.85, rotate: 3 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto absolute w-[300px] rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl"
                style={{ left: popup.x, top: popup.y }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold text-zinc-100">Bildiriş!</h3>
                  <button
                    type="button"
                    onClick={() => handleCloseClick(popup.id)}
                    className="rounded bg-zinc-700 px-2 py-1 text-xs font-bold text-zinc-100 hover:bg-zinc-600"
                    aria-label="Bağla"
                  >
                    X
                  </button>
                </div>
                <p className="text-sm text-zinc-200">
                  {isAtCap ? "Təslim oldun? 😏" : popup.message}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <section className="relative flex w-full max-w-2xl flex-col items-center justify-center gap-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-10 text-center shadow-xl">
        <h1 className="text-3xl font-bold text-zinc-100">Son Addım! Demək Olar Ki...</h1>

        <button
          type="button"
          onClick={handleMainClick}
          className="rounded-2xl bg-indigo-600 px-10 py-6 text-2xl font-black tracking-wide text-white transition hover:scale-[1.02] hover:bg-indigo-500"
        >
          GÖNDƏR 🚀
        </button>
      </section>

      {isAtCap && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
          <button
            type="button"
            onClick={handleUltimateSubmit}
            className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-violet-500"
          >
            Hər şeyi Sil və Göndər
          </button>
        </div>
      )}

      {popupLayer}
    </>
  );
}


