"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useState } from "react";

import { useChaosState } from "@/hooks/useChaosState";

export default function Stage2_Name({
  onComplete,
  onFail,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const { gameState, setPlayerName } = useChaosState();

  const fontOptions = useMemo(
    () => [
      "Comic Sans MS",
      "Times New Roman",
      "Papyrus",
      "Courier New",
      "Impact",
      "Wingdings",
    ],
    [],
  );
  const placeholderOptions = useMemo(
    () => [
      "Adını yaz...",
      "Soyadını yaz...",
      "Heyvanının adını yaz...",
      "Parolunu yaz... (zarafat)",
      "Ümumiyyətlə nə yazırsan?",
    ],
    [],
  );

  const [typedValue, setTypedValue] = useState("");
  const [activeFont, setActiveFont] = useState(fontOptions[0]);
  const [activePlaceholder, setActivePlaceholder] = useState(placeholderOptions[0]);
  const [error, setError] = useState("");
  const [fakeCursorPosition, setFakeCursorPosition] = useState({ x: 0, y: 0 });

  const displayedValue = typedValue.split("").reverse().join("");

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setFakeCursorPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveFont((prevFont) => {
        const randomFont = fontOptions[Math.floor(Math.random() * fontOptions.length)];
        return randomFont === prevFont
          ? fontOptions[(fontOptions.indexOf(prevFont) + 1) % fontOptions.length]
          : randomFont;
      });
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [fontOptions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActivePlaceholder(
        placeholderOptions[Math.floor(Math.random() * placeholderOptions.length)],
      );
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [placeholderOptions]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      setTypedValue((prev) => prev.slice(0, -1));
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      setTypedValue("");
      return;
    }

    if (event.key === "Enter") {
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      setTypedValue((prev) => prev + event.key);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (typedValue.length < 3) {
      setError("Ən azı 3 simvol yazmalısan.");
      onFail();
      return;
    }

    const normalizeName = (value: string) =>
      value
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("az");

    const currentName = normalizeName(displayedValue);
    const firstStageName = normalizeName(gameState.playerName);

    if (firstStageName && currentName !== firstStageName) {
      setError(
        `Adını nə yazmısan, bilmirsən? 😅 `,
      );
      onFail();
      return;
    }

    setError("");
    setPlayerName(displayedValue);
    onComplete();
  };

  return (
    <section className="relative w-full max-w-xl cursor-none space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 text-center shadow-xl">
      <motion.h1
        key={activeFont}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-3xl font-bold text-zinc-100"
        style={{ fontFamily: activeFont }}
      >
        Adını Yaz, Görüm Kimsən
      </motion.h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div
          key={activeFont}
          initial={{ opacity: 0.35, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative"
          style={{ fontFamily: activeFont }}
        >
          <input
            value={displayedValue}
            onKeyDown={handleKeyDown}
            onChange={() => {
              return;
            }}
            placeholder={activePlaceholder}
            aria-label="Ad daxil et"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-lg text-zinc-100 outline-none transition focus:border-zinc-400"
          />

          <AnimatePresence>
            {activeFont === "Wingdings" && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="absolute -top-9 right-0 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
              >
                Oxuya bilirsən? 😂
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-500"
        >
          Davam Et →
        </button>
      </form>

      <div
        className="pointer-events-none fixed z-50 animate-pulse text-2xl font-black text-zinc-100"
        style={{
          left: fakeCursorPosition.x,
          top: fakeCursorPosition.y,
          transform: "translate(-50%, -50%)",
        }}
      >
        ?
      </div>
    </section>
  );
}
