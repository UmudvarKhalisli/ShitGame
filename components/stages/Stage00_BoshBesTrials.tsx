"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type TrialStep = "illusion" | "void" | "timer";

type FallingGlyph = {
  id: number;
  char: string;
  x: number;
};

export default function Stage00_BoshBesTrials({
  onComplete,
  onFailToStart,
}: {
  onComplete: () => void;
  onFailToStart: () => void;
}) {
  const [step, setStep] = useState<TrialStep>("illusion");
  const [flashFail, setFlashFail] = useState(false);
  const [falling, setFalling] = useState<FallingGlyph[]>([]);
  const [typedCount, setTypedCount] = useState(0);
  const [timerText, setTimerText] = useState("5");
  const [timerDone, setTimerDone] = useState(false);

  const nextIdRef = useRef(1);
  const failAudioRef = useRef<HTMLAudioElement | null>(null);

  const illusionButtons = useMemo(() => Array.from({ length: 5 }, (_, i) => i + 1), []);

  const triggerHardFail = () => {
    if (!failAudioRef.current) {
      failAudioRef.current = new Audio("/sounds/fail.mp3");
      failAudioRef.current.volume = 0.95;
    }

    failAudioRef.current.currentTime = 0;
    void failAudioRef.current.play().catch(() => {
      return;
    });

    setFlashFail(true);
    window.setTimeout(() => {
      setFlashFail(false);
      onFailToStart();
    }, 320);
  };

  const dropChar = (char: string) => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;

    const glyph: FallingGlyph = {
      id,
      char,
      x: 20 + Math.random() * 80,
    };

    setFalling((prev) => [...prev, glyph]);
    setTypedCount((prev) => prev + 1);

    window.setTimeout(() => {
      setFalling((prev) => prev.filter((item) => item.id !== id));
    }, 1600);
  };

  useEffect(() => {
    if (step !== "timer") {
      return;
    }

    const sequence = ["5", "4", "3", "2", "1", "0.9", "0.8", "0.7", "0.6", "0.5", "0.4", "0.3"];
    let index = 0;

    const id = window.setInterval(() => {
      index += 1;
      const next = sequence[index];
      if (!next) {
        window.clearInterval(id);
        setTimerDone(true);
        return;
      }

      setTimerText(next);
    }, 600);

    return () => {
      window.clearInterval(id);
    };
  }, [step]);

  return (
    <section className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-[#2a5a2a] bg-[#060c06]/95 p-8 text-[#00f010] shadow-[0_0_35px_rgba(0,240,16,0.18)]">
      <h2 className="text-center text-4xl font-black tracking-[0.15em]">BOŞ-BEŞ MİSSİYASI</h2>

      {step === "illusion" && (
        <div className="mt-8 space-y-5">
          <p className="text-center text-sm text-[#8ac58a]">Mərhələ A: Beşdən Birini Seç</p>

          <div className="relative h-[300px] rounded-lg border border-[#204420] bg-[#081208]/80 p-5">
            <div className="grid h-full grid-cols-2 gap-3 sm:grid-cols-3">
              {illusionButtons.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={triggerHardFail}
                  className="border border-[#2f6a2f] bg-[#0b1a0b] text-lg font-bold hover:bg-[#0f220f]"
                >
                  Bura Bas
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep("void")}
              className="absolute bottom-2 right-2 border border-[#2a6a2a] bg-[#0a120a]/50 px-1.5 py-0.5 text-[9px] opacity-25"
            >
              ...
            </button>
          </div>
        </div>
      )}

      {step === "void" && (
        <div className="mt-8">
          <p className="text-center text-sm text-[#8ac58a]">Mərhələ B: Boşluğu Doldur</p>

          <div className="relative mt-4 h-[320px] rounded-lg border border-[#204420] bg-[#081208]/80 p-4">
            <label className="mb-2 block text-xs text-[#88bd88]">Niyə vaxtını boş xərcləyirsən?</label>
            <input
              value=""
              onChange={() => {
                return;
              }}
              onKeyDown={(event) => {
                if (event.key.length === 1) {
                  event.preventDefault();
                  dropChar(event.key);
                }
              }}
              placeholder="Yaz..."
              className="w-full border border-[#2e5d2e] bg-[#061006] px-3 py-2 text-[#00f010] outline-none"
            />

            <p className="mt-3 text-sm text-[#9fce9f]">Yazdıqların boşdur, eynilə həyatın kimi.</p>

            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <AnimatePresence>
                {falling.map((glyph) => (
                  <motion.span
                    key={glyph.id}
                    initial={{ y: 40, opacity: 1 }}
                    animate={{ y: 290, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.45, ease: "easeIn" }}
                    className="absolute text-xl font-bold text-[#4ef84e]"
                    style={{ left: `${glyph.x}%` }}
                  >
                    {glyph.char}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => setStep("timer")}
              disabled={typedCount < 12}
              className="absolute bottom-4 right-4 border border-[#2f6a2f] bg-[#0b1a0b] px-4 py-2 text-sm font-bold disabled:opacity-35"
            >
              Davam Et
            </button>
          </div>
        </div>
      )}

      {step === "timer" && (
        <div className="mt-8 flex min-h-[330px] flex-col items-center justify-center gap-5 rounded-lg border border-[#204420] bg-[#081208]/80">
          <p className="text-sm text-[#8ac58a]">Mərhələ C: Beş Saniyə Gözlə</p>
          <motion.div
            key={timerText}
            initial={{ scale: 0.75, opacity: 0.2 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-8xl font-black text-[#95ff95]"
          >
            {timerText}
          </motion.div>
          <p className="text-sm text-[#a3d5a3]">Bizim vaxt anlayışımız bir az fərqlidir.</p>

          {timerDone && (
            <button
              type="button"
              onClick={onComplete}
              className="border border-[#2f6a2f] bg-[#0b1a0b] px-6 py-2 text-sm font-bold"
            >
              Keçid Ver
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {flashFail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[170] flex items-center justify-center bg-red-700"
          >
            <p className="text-4xl font-black tracking-[0.18em] text-white">HAHA, YENIDƏN BAŞLA</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
