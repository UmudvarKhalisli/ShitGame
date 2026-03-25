"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { chaosController } from "@/hooks/chaosController";
import { useChaosController } from "@/hooks/useChaosController";

type FeedbackType = "correct" | "misplaced" | "wrong";

type RoundConfig = {
  title: string;
  subtitle: string;
};

const SYMBOL_POOL = ["🔴", "🔵", "🟡", "🟢", "⭐", "💎", "🔥", "💀", "🎯", "🎪", "🎭", "🎨"] as const;
const DISCOURAGING_ROASTS = [
  "Yaxın idin! (Yox, deyildin)",
  "Az qaldı! (Çox qalıb əslində)",
] as const;

const ROUND_CONFIGS: RoundConfig[] = [
  { title: "Round 1 — Normal", subtitle: "Ardıcıllığı eyni qaydada təkrarla." },
  { title: "Round 2 — ənisƏ", subtitle: "Əksinə: Ardıcıllığı tərsinə bas." },
  { title: "Round 3 — Cüt olanlar", subtitle: "Yalnız birdən çox görünən simvolları bas (sıra fərq etmir)." },
  { title: "Round 4 — Birinci və Sonuncu", subtitle: "Yalnız birinci və sonuncu simvolu bas." },
  { title: "Round 5 — Sənin Seçimin", subtitle: "İndi sən seç. İstədiyin 3 simvolu sırayla bas." },
];

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildGridSymbols() {
  const base = [...SYMBOL_POOL];
  const extras = Array.from({ length: 4 }, () => SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)]);
  return shuffle([...base, ...extras]);
}

function buildRoundSequence(roundIndex: number) {
  if (roundIndex === 2) {
    const candidates = shuffle([...SYMBOL_POOL]);
    const repeatedA = candidates[0];
    const repeatedB = candidates[1];
    const unique = candidates[2];
    const sequence = shuffle([repeatedA, repeatedB, repeatedA, unique, repeatedB]);
    const briefFlashIndex = sequence.findIndex((symbol) => symbol === unique);
    return { sequence, briefFlashIndex };
  }

  if (roundIndex === 3) {
    return {
      sequence: Array.from({ length: 7 }, () => SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)]),
      briefFlashIndex: null,
    };
  }

  return {
    sequence: Array.from({ length: 5 }, () => SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)]),
    briefFlashIndex: null,
  };
}

function getExpectedInput(roundIndex: number, sequence: string[]) {
  if (roundIndex === 1) {
    return [...sequence].reverse();
  }

  if (roundIndex === 2) {
    const counts = new Map<string, number>();
    sequence.forEach((symbol) => {
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([symbol]) => symbol);
  }

  if (roundIndex === 3) {
    return [sequence[0], sequence[sequence.length - 1]];
  }

  return sequence;
}

export default function Stage7_BossRound({
  onComplete,
  onFail,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const { setBossRound, setRoasterAggressive } = useChaosController();

  const [isIntroActive, setIsIntroActive] = useState(true);
  const [roundIndex, setRoundIndex] = useState(0);
  const [attemptNonce, setAttemptNonce] = useState(0);
  const [sequence, setSequence] = useState<string[]>([]);
  const [activePlaybackStep, setActivePlaybackStep] = useState<number | null>(null);
  const [isPlayback, setIsPlayback] = useState(false);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackType[]>([]);
  const [statusText, setStatusText] = useState("Qaydanı oxu, sonra ritmə qarşı mübarizə apar.");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [showVictory, setShowVictory] = useState(false);

  const gridSymbols = useMemo(() => buildGridSymbols(), []);
  const timeoutIdsRef = useRef<number[]>([]);
  const playbackTokenRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isCompletedRef = useRef(false);

  const currentRound = ROUND_CONFIGS[roundIndex];
  const expectedInput = useMemo(() => getExpectedInput(roundIndex, sequence), [roundIndex, sequence]);

  const clearScheduledTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const timeoutId = window.setTimeout(fn, ms);
    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

  const wait = useCallback((ms: number) =>
    new Promise<void>((resolve) => {
      scheduleTimeout(resolve, ms);
    }), [scheduleTimeout]);

  const getAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    const BrowserAudioContext =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!BrowserAudioContext) {
      return null;
    }

    try {
      audioContextRef.current = new BrowserAudioContext();
      return audioContextRef.current;
    } catch {
      return null;
    }
  }, []);

  const playTone = useCallback((frequency: number, durationSec: number, volume = 0.16, type: OscillatorType = "triangle") => {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);

    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(start);
    oscillator.stop(start + durationSec + 0.03);
  }, [getAudioContext]);

  const playMinorChord = useCallback((durationSec: number) => {
    playTone(130, durationSec, 0.15, "sine");
    playTone(155, durationSec, 0.14, "triangle");
    playTone(196, durationSec, 0.14, "sine");
  }, [playTone]);

  const playIntroProgression = useCallback(async () => {
    playMinorChord(0.55);
    await wait(380);
    playMinorChord(0.55);
    await wait(380);
    playMinorChord(0.9);
  }, [playMinorChord, wait]);

  const playSymbolTone = useCallback((symbol: string) => {
    const index = SYMBOL_POOL.findIndex((item) => item === symbol);
    const clamped = index < 0 ? 0 : index;
    const frequency = 220 + clamped * 24;
    playTone(frequency, 0.23, 0.14, "square");
  }, [playTone]);

  useEffect(() => {
    void playIntroProgression();
    setRoasterAggressive();
    setBossRound(1);

    const timeoutId = scheduleTimeout(() => {
      setIsIntroActive(false);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [playIntroProgression, scheduleTimeout, setBossRound, setRoasterAggressive]);

  useEffect(() => {
    setBossRound(roundIndex + 1);
  }, [roundIndex, setBossRound]);

  useEffect(() => {
    return () => {
      clearScheduledTimeouts();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, [clearScheduledTimeouts]);

  useEffect(() => {
    if (isIntroActive) {
      return;
    }

    if (roundIndex === 4) {
      setSequence([]);
      setIsPlayback(false);
      setUserInput([]);
      setFeedback([]);
      setStatusText("İndi sən seç. İstədiyin 3 simvolu sırayla bas.");
      return;
    }

    const token = playbackTokenRef.current + 1;
    playbackTokenRef.current = token;

    const next = buildRoundSequence(roundIndex);
    setSequence(next.sequence);
    setUserInput([]);
    setFeedback([]);
    setStatusText("Ardıcıllıq göstərilir. Bax və sus.");
    setIsPlayback(true);

    const runPlayback = async () => {
      await wait(450);

      for (let step = 0; step < next.sequence.length; step += 1) {
        if (token !== playbackTokenRef.current) {
          return;
        }

        const symbol = next.sequence[step];
        const duration = roundIndex === 2 && next.briefFlashIndex === step ? 80 : 420;

        setActivePlaybackStep(step);
        playSymbolTone(symbol);

        await wait(duration);
        if (token !== playbackTokenRef.current) {
          return;
        }

        setActivePlaybackStep(null);
        await wait(220);
      }

      if (token !== playbackTokenRef.current) {
        return;
      }

      setStatusText("Sıra səndədir.");
      setIsPlayback(false);
    };

    void runPlayback();
  }, [attemptNonce, isIntroActive, playSymbolTone, roundIndex, wait]);

  const evaluateAttempt = (attempt: string[]) => {
    if (roundIndex === 2) {
      const expectedSet = new Set(expectedInput);
      const foundSet = new Set(attempt);
      const isCorrect =
        attempt.length === expectedInput.length &&
        expectedInput.every((symbol) => foundSet.has(symbol)) &&
        attempt.every((symbol) => expectedSet.has(symbol));

      const rowFeedback = attempt.map((symbol) => (expectedSet.has(symbol) ? "correct" : "wrong"));

      return { isCorrect, rowFeedback };
    }

    const rowFeedback: FeedbackType[] = attempt.map((symbol, index) => {
      if (symbol === expectedInput[index]) {
        return "correct";
      }

      if (expectedInput.includes(symbol)) {
        return "misplaced";
      }

      return "wrong";
    });

    const isCorrect =
      attempt.length === expectedInput.length && rowFeedback.every((item) => item === "correct");

    return { isCorrect, rowFeedback };
  };

  const handleWrongAttempt = (rowFeedback: FeedbackType[]) => {
    setFeedback(rowFeedback);
    setStatusText("Səhv oldu. Yenidən baxacaqsan.");
    onFail();

    const roast = DISCOURAGING_ROASTS[Math.floor(Math.random() * DISCOURAGING_ROASTS.length)];
    chaosController.triggerRoast(roast);

    scheduleTimeout(() => {
      setAttemptNonce((prev) => prev + 1);
    }, 1200);
  };

  const handleRoundSuccess = (rowFeedback: FeedbackType[]) => {
    setFeedback(rowFeedback);
    setStatusText("Düz tapdın. Növbəti qayda gəlir.");
    playTone(330, 0.12, 0.12, "triangle");
    scheduleTimeout(() => {
      setRoundIndex((prev) => prev + 1);
      setAttemptNonce((prev) => prev + 1);
    }, 900);
  };

  const completeBoss = () => {
    if (isCompletedRef.current) {
      return;
    }

    isCompletedRef.current = true;
    setShowVictory(true);
    setStatusText("Psixoloji analiz tamamlandı. Siz keçdiniz.");

    scheduleTimeout(() => {
      onComplete();
    }, 2600);
  };

  const handleBossAnalyze = () => {
    setIsAnalyzing(true);
    setAnalyzeProgress(0);
    setStatusText("AI səni analiz edir...");

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(100, Math.round((elapsed / 3000) * 100));
      setAnalyzeProgress(progress);

      if (progress >= 100) {
        window.clearInterval(intervalId);
        setIsAnalyzing(false);
        completeBoss();
      }
    }, 120);

    timeoutIdsRef.current.push(intervalId as unknown as number);
  };

  const handleSymbolClick = (symbol: string) => {
    if (isIntroActive || isPlayback || isAnalyzing || showVictory) {
      return;
    }

    playSymbolTone(symbol);

    if (roundIndex === 4) {
      setUserInput((prev) => {
        const next = [...prev, symbol].slice(0, 3);
        if (next.length === 3) {
          handleBossAnalyze();
        }
        return next;
      });
      return;
    }

    setUserInput((prev) => {
      const next = [...prev, symbol];
      const neededLength = expectedInput.length;

      if (next.length >= neededLength) {
        const candidate = next.slice(0, neededLength);
        const verdict = evaluateAttempt(candidate);

        if (!verdict.isCorrect) {
          handleWrongAttempt(verdict.rowFeedback);
        } else {
          handleRoundSuccess(verdict.rowFeedback);
        }

        return candidate;
      }

      return next;
    });
  };

  const rainSymbols = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        id: index,
        symbol: SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)],
        left: Math.random() * 100,
        duration: 2 + Math.random() * 2.6,
        delay: Math.random() * 0.8,
        size: 20 + Math.random() * 22,
      })),
    [],
  );

  return (
    <section className="relative w-full max-w-4xl space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950/85 p-6 shadow-2xl">
      <AnimatePresence>
        {isIntroActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95"
          >
            <motion.h1
              initial={{ scale: 0.75, opacity: 0, letterSpacing: "0.2em" }}
              animate={{ scale: 1.08, opacity: 1, letterSpacing: "0.06em" }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              className="text-center text-4xl font-black text-amber-300 sm:text-6xl"
            >
              SON MƏRHƏLƏ 👑
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-black text-zinc-100">Stage 8: Üç Qaydanın Oyunu</h1>
        <p className="text-sm font-semibold text-zinc-300">{currentRound.title}</p>
        <p className="text-sm text-amber-300">{currentRound.subtitle}</p>
        <p className="text-sm font-semibold text-fuchsia-300">{statusText}</p>
      </div>

      {roundIndex !== 4 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">Sistem ardıcıllığı</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {sequence.map((symbol, index) => {
              const isActive = activePlaybackStep === index;
              return (
                <motion.div
                  key={`${symbol}-${index}`}
                  animate={
                    isActive
                      ? {
                          scale: [1, 1.2, 1.02],
                          boxShadow: [
                            "0 0 0 rgba(56,189,248,0)",
                            "0 0 18px rgba(56,189,248,0.85)",
                            "0 0 0 rgba(56,189,248,0)",
                          ],
                        }
                      : { scale: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" }
                  }
                  transition={{ duration: 0.3 }}
                  className="grid h-12 w-12 place-items-center rounded-lg border border-zinc-700 bg-zinc-900 text-2xl"
                >
                  {symbol}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <motion.div
        layout
        className="grid grid-cols-4 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
      >
        {gridSymbols.map((symbol, index) => {
          const isActiveSymbol = activePlaybackStep !== null && sequence[activePlaybackStep] === symbol;
          return (
            <motion.button
              key={`${symbol}-${index}`}
              type="button"
              onClick={() => handleSymbolClick(symbol)}
              whileTap={{ scale: 0.95 }}
              animate={
                isActiveSymbol
                  ? {
                      scale: [1, 1.08, 1],
                      boxShadow: [
                        "0 0 0 rgba(139,92,246,0)",
                        "0 0 20px rgba(139,92,246,0.85)",
                        "0 0 0 rgba(139,92,246,0)",
                      ],
                    }
                  : { scale: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" }
              }
              transition={{ duration: 0.25 }}
              className={`grid aspect-square place-items-center rounded-xl border border-zinc-700 bg-zinc-950 text-2xl transition hover:border-cyan-400/70 hover:bg-zinc-900 ${
                roundIndex === 3 ? "scale-50" : ""
              }`}
            >
              <span>{symbol}</span>
            </motion.button>
          );
        })}
      </motion.div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">Sənin cavabın</p>
        <div className="flex flex-wrap gap-2">
          {userInput.length === 0 && <span className="text-sm text-zinc-500">Hələ giriş yoxdur.</span>}
          {userInput.map((symbol, index) => {
            const verdict = feedback[index];
            const stateClass =
              verdict === "correct"
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                : verdict === "misplaced"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : verdict === "wrong"
                    ? "border-rose-500 bg-rose-500/20 text-rose-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-200";
            const marker = verdict === "correct" ? "✓" : verdict === "wrong" ? "✗" : verdict === "misplaced" ? "~" : "";

            return (
              <div
                key={`${symbol}-${index}`}
                className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-lg font-bold ${stateClass}`}
              >
                <span>{symbol}</span>
                {marker && <span className="text-sm">{marker}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {isAnalyzing && (
        <div className="rounded-xl border border-cyan-800 bg-cyan-950/30 p-4">
          <p className="mb-2 text-sm font-semibold text-cyan-200">Süni intellekt səni oxuyur...</p>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <motion.div
              animate={{ width: `${analyzeProgress}%` }}
              transition={{ ease: "linear", duration: 0.1 }}
              className="h-full bg-cyan-400"
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {showVictory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[125] overflow-hidden bg-black/65"
          >
            <div className="absolute inset-0">
              {rainSymbols.map((item) => (
                <span
                  key={item.id}
                  className="boss-emoji-rain"
                  style={{
                    left: `${item.left}%`,
                    animationDuration: `${item.duration}s`,
                    animationDelay: `${item.delay}s`,
                    fontSize: `${item.size}px`,
                  }}
                >
                  {item.symbol}
                </span>
              ))}
            </div>

            <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
              <motion.h2
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.45 }}
                className="text-3xl font-black text-emerald-300 sm:text-5xl"
              >
                SƏN QAZANDIN... Bu dəfə əsl həqiqətən.
              </motion.h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
