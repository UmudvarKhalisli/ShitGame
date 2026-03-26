"use client";

import { AnimatePresence, motion, useAnimationFrame } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { chaosController } from "@/hooks/chaosController";
import { useChaosController } from "@/hooks/useChaosController";

type Difficulty = "easy" | "medium" | "hard";

type LetterNode = {
  id: string;
  char: string;
  x: number;
  y: number;
  rotation: number;
  isFake: boolean;
  vx: number;
  vy: number;
};

const TOTAL_WORDS_PER_STAGE = 4;

const SHORT_WORDS = ["KOD", "BUG", "OYN", "TƏLƏ", "DƏLI"] as const;
const MEDIUM_WORDS = ["CHAOS", "ƏSƏB", "OYUN", "GIZLI", "SIRR"] as const;
const LONG_WORDS = ["QARANLIQ", "XAOSLAND", "DARKMODE"] as const;

const WORD_DEFINITIONS: Record<string, string> = {
  CHAOS: "Əsəb Bölməsinin ana dili 😈",
  BUG: "Proqramçının ən yaxın dostu (düşməni)",
  "ƏSƏB": "Bu saytın əsas məhsulu",
};

const WRONG_ROASTS = [
  "Hərfləri gördün, amma sözü görmədin 😂",
  "Gözlər var, görmür deyiblər...",
  "Qaranlıqda axtarırsan, işıqda düşünmürsən",
] as const;

const STORAGE_KEY = "dark-search-used-words-v1";
const EDGE_PADDING = 80;
const MIN_LETTER_DISTANCE = 150;

type WordPick = { word: string; difficulty: Difficulty; badge: string; tier: 0 | 1 | 2 };

type MousePosition = { x: number; y: number };

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function distance(aX: number, aY: number, bX: number, bY: number) {
  const dx = aX - bX;
  const dy = aY - bY;
  return Math.sqrt(dx * dx + dy * dy);
}

function safeUpper(input: string) {
  return input.toLocaleUpperCase("az-AZ").trim();
}

function tierMeta(tier: 0 | 1 | 2): { difficulty: Difficulty; badge: string; bucket: "short" | "medium" | "hard"; pool: string[] } {
  if (tier === 0) {
    return {
      difficulty: "easy",
      badge: "🟢 Asan",
      bucket: "short",
      pool: [...SHORT_WORDS],
    };
  }

  if (tier === 1) {
    return {
      difficulty: "medium",
      badge: "🟡 Orta",
      bucket: "medium",
      pool: [...MEDIUM_WORDS],
    };
  }

  return {
    difficulty: "hard",
    badge: "🔴 Çətin",
    bucket: "hard",
    pool: [...LONG_WORDS],
  };
}

function baseTierFromPlayCount(playCount: number): 0 | 1 | 2 {
  if (playCount <= 0) {
    return 0;
  }
  if (playCount === 1) {
    return 1;
  }
  return 2;
}

function tierForWordIndex(baseTier: 0 | 1 | 2, wordIndex: number): 0 | 1 | 2 {
  const nudges = [0, 0, 1, 2] as const;
  return Math.min(2, baseTier + nudges[wordIndex]) as 0 | 1 | 2;
}

function pickWordForRound(playCount: number, wordIndex: number): WordPick {
  const baseTier = baseTierFromPlayCount(playCount);
  const tier = tierForWordIndex(baseTier, wordIndex);
  const meta = tierMeta(tier);

  return {
    word: pickFromPool(meta.pool, meta.bucket),
    difficulty: meta.difficulty,
    badge: meta.badge,
    tier,
  };
}

function pickFromPool(pool: string[], bucket: "short" | "medium" | "hard") {
  if (typeof window === "undefined") {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  const used = new Set(parsed[bucket] ?? []);

  const available = pool.filter((word) => !used.has(word));
  const candidates = available.length > 0 ? available : pool;
  const word = candidates[Math.floor(Math.random() * candidates.length)];

  const nextUsed = available.length > 0 ? [...(parsed[bucket] ?? []), word] : [word];
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...parsed,
      [bucket]: nextUsed,
    }),
  );

  return word;
}

function createLetterNodes(
  chars: string[],
  viewport: { width: number; height: number },
  isFake: boolean,
  prefix: string,
  existing: Array<{ x: number; y: number }>,
) {
  const nodes: LetterNode[] = [];

  chars.forEach((char, index) => {
    let x = EDGE_PADDING;
    let y = EDGE_PADDING;
    let tries = 0;

    while (tries < 220) {
      x = EDGE_PADDING + Math.random() * Math.max(20, viewport.width - EDGE_PADDING * 2);
      y = EDGE_PADDING + Math.random() * Math.max(20, viewport.height - EDGE_PADDING * 2 - 120);

      const isTooClose = [...existing, ...nodes].some((point) => distance(x, y, point.x, point.y) < MIN_LETTER_DISTANCE);
      if (!isTooClose) {
        break;
      }

      tries += 1;
    }

    nodes.push({
      id: `${prefix}-${index}-${char}-${Math.random().toString(36).slice(2, 8)}`,
      char,
      x,
      y,
      rotation: -25 + Math.random() * 50,
      isFake,
      vx: (Math.random() * 2 - 1) * 0.3,
      vy: (Math.random() * 2 - 1) * 0.3,
    });
  });

  return nodes;
}

function useLetterPositions(word: string, fakeChars: string[]) {
  const [viewport, setViewport] = useState({ width: 1280, height: 720 });
  const [realLetters, setRealLetters] = useState<LetterNode[]>([]);
  const [fakeLetters, setFakeLetters] = useState<LetterNode[]>([]);
  const realBasePositionsRef = useRef<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    const chars = shuffle(word.split(""));
    const currentViewport = { width: viewport.width, height: viewport.height };
    const nodes = createLetterNodes(chars, currentViewport, false, "real", []);
    setRealLetters(nodes);
    setFakeLetters([]);
    realBasePositionsRef.current = nodes.map((item) => ({ x: item.x, y: item.y }));
  }, [word, viewport.width, viewport.height]);

  useEffect(() => {
    if (fakeChars.length === 0) {
      setFakeLetters([]);
      return;
    }

    const existing = [...realBasePositionsRef.current];
    const currentViewport = { width: viewport.width, height: viewport.height };
    const nodes = createLetterNodes(fakeChars, currentViewport, true, "fake", existing);
    setFakeLetters(nodes);
  }, [fakeChars, viewport.height, viewport.width]);

  useAnimationFrame(() => {
    const minSpacing = Math.max(88, Math.min(122, 132 - word.length * 4));
    const maxSpeed = 0.24;

    const drift = (items: LetterNode[]) => {
      if (items.length <= 1) {
        return items.map((item) => {
          let nextX = item.x + item.vx;
          let nextY = item.y + item.vy;
          let nextVx = item.vx;
          let nextVy = item.vy;

          if (nextX < EDGE_PADDING || nextX > viewport.width - EDGE_PADDING) {
            nextVx = -nextVx;
            nextX = Math.max(EDGE_PADDING, Math.min(viewport.width - EDGE_PADDING, nextX));
          }

          if (nextY < EDGE_PADDING || nextY > viewport.height - EDGE_PADDING - 120) {
            nextVy = -nextVy;
            nextY = Math.max(EDGE_PADDING, Math.min(viewport.height - EDGE_PADDING - 120, nextY));
          }

          return {
            ...item,
            x: nextX,
            y: nextY,
            vx: Math.max(-maxSpeed, Math.min(maxSpeed, nextVx)),
            vy: Math.max(-maxSpeed, Math.min(maxSpeed, nextVy)),
          };
        });
      }

      const next = items.map((item) => ({ ...item, x: item.x + item.vx, y: item.y + item.vy }));

      for (let i = 0; i < next.length; i += 1) {
        for (let j = i + 1; j < next.length; j += 1) {
          const first = next[i];
          const second = next[j];
          const dx = second.x - first.x;
          const dy = second.y - first.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

          if (dist < minSpacing) {
            const overlap = (minSpacing - dist) * 0.5;
            const ux = dx / dist;
            const uy = dy / dist;
            const push = Math.min(2.2, overlap);

            first.x -= ux * push;
            first.y -= uy * push;
            second.x += ux * push;
            second.y += uy * push;

            first.vx -= ux * 0.03;
            first.vy -= uy * 0.03;
            second.vx += ux * 0.03;
            second.vy += uy * 0.03;
          }
        }
      }

      return next.map((item) => {
        let nextX = item.x;
        let nextY = item.y;
        let nextVx = item.vx;
        let nextVy = item.vy;

        if (nextX < EDGE_PADDING || nextX > viewport.width - EDGE_PADDING) {
          nextVx = -nextVx;
          nextX = Math.max(EDGE_PADDING, Math.min(viewport.width - EDGE_PADDING, nextX));
        }

        if (nextY < EDGE_PADDING || nextY > viewport.height - EDGE_PADDING - 120) {
          nextVy = -nextVy;
          nextY = Math.max(EDGE_PADDING, Math.min(viewport.height - EDGE_PADDING - 120, nextY));
        }

        return {
          ...item,
          x: nextX,
          y: nextY,
          vx: Math.max(-maxSpeed, Math.min(maxSpeed, nextVx)),
          vy: Math.max(-maxSpeed, Math.min(maxSpeed, nextVy)),
        };
      });
    };

    setRealLetters((prev) => drift(prev));
    setFakeLetters((prev) => drift(prev));
  });

  return {
    viewport,
    letters: [...realLetters, ...fakeLetters],
    realLetters,
    fakeLetters,
  };
}

function useSpookyAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const humOscRef = useRef<OscillatorNode | null>(null);
  const humGainRef = useRef<GainNode | null>(null);
  const pingTimeoutRef = useRef<number | null>(null);

  const getCtx = useCallback(() => {
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

  const playTone = useCallback(
    (freq: number, duration: number, gainValue: number, type: OscillatorType = "sine") => {
      const ctx = getCtx();
      if (!ctx) {
        return;
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    },
    [getCtx],
  );

  const playNoiseBurst = useCallback(
    (durationSec: number, gainValue: number) => {
      const ctx = getCtx();
      if (!ctx) {
        return;
      }

      const buffer = ctx.createBuffer(1, ctx.sampleRate * durationSec, ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = (Math.random() * 2 - 1) * 0.4;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1400;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      gain.gain.value = gainValue;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      source.stop(ctx.currentTime + durationSec);
    },
    [getCtx],
  );

  const schedulePing = useCallback(() => {
    const delay = 5000 + Math.random() * 15000;
    pingTimeoutRef.current = window.setTimeout(() => {
      playTone(800 + Math.random() * 120, 0.1, 0.05, "sine");
      schedulePing();
    }, delay);
  }, [playTone]);

  const startAmbient = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || humOscRef.current) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 40;
    gain.gain.value = 0.03;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    humOscRef.current = osc;
    humGainRef.current = gain;

    schedulePing();
  }, [getCtx, schedulePing]);

  const stopAmbient = useCallback(() => {
    if (pingTimeoutRef.current) {
      window.clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }

    if (humOscRef.current) {
      humOscRef.current.stop();
      humOscRef.current.disconnect();
      humOscRef.current = null;
    }

    if (humGainRef.current) {
      humGainRef.current.disconnect();
      humGainRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const playFlickerCrackle = useCallback(() => {
    playNoiseBurst(0.2, 0.02);
  }, [playNoiseBurst]);

  const playLetterRevealTone = useCallback(
    (frequency: number) => {
      const harmonicSteps = [0, 3, 7, 10] as const;
      const firstStep = harmonicSteps[Math.floor(Math.random() * harmonicSteps.length)];
      const secondStep = harmonicSteps[Math.floor(Math.random() * harmonicSteps.length)];

      const first = frequency * Math.pow(2, firstStep / 12);
      const second = frequency * Math.pow(2, secondStep / 12);

      playTone(first, 0.08, 0.024, "sine");
      window.setTimeout(() => {
        playTone(second, 0.11, 0.022, "triangle");
      }, 45);
    },
    [playTone],
  );

  const playVictory = useCallback(() => {
    playTone(262, 0.16, 0.11, "triangle");
    window.setTimeout(() => playTone(330, 0.18, 0.11, "triangle"), 140);
    window.setTimeout(() => playTone(392, 0.22, 0.12, "triangle"), 280);
  }, [playTone]);

  return {
    startAmbient,
    stopAmbient,
    playFlickerCrackle,
    playLetterRevealTone,
    playVictory,
  };
}

function DarkOverlay({
  mouse,
  radius,
  tintRadius,
}: {
  mouse: MousePosition;
  radius: number;
  tintRadius: number;
}) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle ${radius}px at ${mouse.x}px ${mouse.y}px, transparent 0%, transparent 35%, rgba(5, 5, 15, 0.85) 65%, rgba(5, 5, 15, 0.98) 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle ${tintRadius}px at ${mouse.x}px ${mouse.y}px, rgba(150, 100, 255, 0.15) 0%, transparent 60%)`,
          mixBlendMode: "screen",
        }}
      />
    </>
  );
}

function FloatingLetter({
  letter,
  visible,
  pulse,
  highlighted,
}: {
  letter: LetterNode;
  visible: boolean;
  pulse: boolean;
  highlighted: boolean;
}) {
  return (
    <motion.div
      animate={{
        opacity: visible ? (letter.isFake ? 0.7 : 1) : 0,
        scale: pulse ? [1, 1.1, 1] : 1,
        filter: highlighted ? "brightness(1.35)" : "brightness(1)",
      }}
      transition={{
        opacity: { duration: visible ? 0.2 : 0.5 },
        scale: { duration: 0.45, repeat: pulse ? Number.POSITIVE_INFINITY : 0 },
      }}
      className="pointer-events-none absolute select-none text-[28px] font-black text-white"
      style={{
        left: letter.x,
        top: letter.y,
        transform: `translate(-50%, -50%) rotate(${letter.rotation}deg)`,
      }}
    >
      {letter.char}
    </motion.div>
  );
}

function InputPanel({
  inputValue,
  onChange,
  onSubmit,
  discoveredCount,
  totalLetters,
  elapsed,
  feedback,
  message,
}: {
  inputValue: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  discoveredCount: number;
  totalLetters: number;
  elapsed: number;
  feedback: "idle" | "wrong" | "correct";
  message: string;
}) {
  return (
    <motion.div
      animate={feedback === "wrong" ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
      transition={{ duration: 0.38 }}
      className="fixed bottom-4 left-1/2 z-[122] w-[min(92vw,560px)] -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-900/85 p-4 text-zinc-100 shadow-2xl"
    >
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-300">
        <span>💡 {totalLetters} hərf</span>
        <span>⏱ {elapsed}s</span>
      </div>
      <p className="text-sm font-semibold text-zinc-100">Tapdığın hərfləri sırala:</p>
      <p className="mt-1 text-xs text-zinc-400">Kəşf edilmiş: {discoveredCount} / {totalLetters}</p>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={inputValue}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSubmit();
            }
          }}
          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
            feedback === "wrong"
              ? "border-rose-500 bg-rose-950/20"
              : feedback === "correct"
                ? "border-emerald-500 bg-emerald-950/20"
                : "border-zinc-600 bg-zinc-950"
          }`}
          placeholder="Sözü yaz..."
        />
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500"
        >
          Yoxla
        </button>
      </div>

      {message && <p className="mt-2 text-xs text-amber-300">{message}</p>}
    </motion.div>
  );
}

export default function Stage_DarkSearch({
  onComplete,
  onFail,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const {
    recordMistake,
    recordSuccess,
    state,
    incrementDarkSearchPlay,
  } = useChaosController();

  const [wordPick, setWordPick] = useState<WordPick>({ word: "KOD", difficulty: "easy", badge: "🟢 Asan", tier: 0 });
  const [mouse, setMouse] = useState<MousePosition>({ x: 640, y: 360 });
  const [thiefPos, setThiefPos] = useState<MousePosition>({ x: 0, y: 0 });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [flashlightRadius, setFlashlightRadius] = useState(120);
  const [flickerActive, setFlickerActive] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "wrong" | "correct">("idle");
  const [panelMessage, setPanelMessage] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [skipCodeInput, setSkipCodeInput] = useState("");
  const [skipPenaltyAccepted, setSkipPenaltyAccepted] = useState(false);
  const [fakeChars, setFakeChars] = useState<string[]>([]);
  const [discoveredIds, setDiscoveredIds] = useState<Set<string>>(new Set());
  const [hintLetterId, setHintLetterId] = useState<string | null>(null);
  const [flashAllLetters, setFlashAllLetters] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const initialPlayCountRef = useRef<number | null>(null);

  const stageStartRef = useRef<number>(Date.now());
  const discoveredIdsRef = useRef<Set<string>>(new Set());
  const triggered60Ref = useRef(false);
  const triggered120Ref = useRef(false);
  const triggered180Ref = useRef(false);

  const audio = useSpookyAudio();
  const { playLetterRevealTone } = audio;

  if (initialPlayCountRef.current === null) {
    initialPlayCountRef.current = state.darkSearchPlays;
  }

  useEffect(() => {
    incrementDarkSearchPlay();
  }, [incrementDarkSearchPlay]);

  useEffect(() => {
    const nextPick = pickWordForRound(initialPlayCountRef.current ?? 0, wordIndex);
    setWordPick(nextPick);
  }, [wordIndex]);

  useEffect(() => {
    setInputValue("");
    setFeedback("idle");
    setPanelMessage("");
    setWrongAttempts(0);
    setSkipCodeInput("");
    setSkipPenaltyAccepted(false);
    setFakeChars([]);
    setDiscoveredIds(new Set());
    discoveredIdsRef.current = new Set();
    setHintLetterId(null);
  }, [wordPick.word]);

  const { letters, realLetters, fakeLetters, viewport } = useLetterPositions(wordPick.word, fakeChars);

  const canOfferSkip = wordPick.tier === 2 && wrongAttempts >= 7 && elapsedSeconds >= 60;
  const canSkipByCondition = canOfferSkip && skipPenaltyAccepted && safeUpper(skipCodeInput) === "KEÇİR MƏNİ";

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouse({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    stageStartRef.current = Date.now();

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - stageStartRef.current) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const loopFlicker = () => {
      const delay = 8000 + Math.random() * 7000;
      const timeoutId = window.setTimeout(() => {
        setFlickerActive(true);
        setFlashlightRadius(20);

        const restoreId = window.setTimeout(() => {
          setFlickerActive(false);
          setFlashlightRadius(120);
          loopFlicker();
        }, 1500);

        return () => window.clearTimeout(restoreId);
      }, delay);

      return () => window.clearTimeout(timeoutId);
    };

    const cleanup = loopFlicker();
    return cleanup;
  }, []);

  useAnimationFrame((time) => {
    if (elapsedSeconds < 45) {
      return;
    }

    const t = time / 1000;
    setThiefPos({
      x: viewport.width * 0.5 + Math.sin(t * 0.7) * viewport.width * 0.32,
      y: viewport.height * 0.42 + Math.cos(t * 0.9) * viewport.height * 0.24,
    });
  });

  useEffect(() => {
    const discoveredNow = realLetters
      .filter((letter) => distance(letter.x, letter.y, mouse.x, mouse.y) < 110)
      .map((letter) => letter.id);

    if (discoveredNow.length === 0) {
      return;
    }

    const newlyDiscovered = discoveredNow.filter((id) => !discoveredIdsRef.current.has(id));
    if (newlyDiscovered.length > 0) {
      const first = realLetters.find((letter) => letter.id === newlyDiscovered[0]);
      if (first) {
        const tone = 420 + (first.char.charCodeAt(0) % 7) * 28;
        playLetterRevealTone(tone);
      }
    }

    setDiscoveredIds((prev) => {
      const alreadySameLength = prev.size === discoveredIdsRef.current.size + newlyDiscovered.length;
      if (newlyDiscovered.length === 0 && alreadySameLength) {
        return prev;
      }

      const next = new Set(prev);
      discoveredNow.forEach((id) => next.add(id));
      discoveredIdsRef.current = next;

      if (next.size === prev.size) {
        return prev;
      }

      return next;
    });
  }, [mouse, playLetterRevealTone, realLetters]);

  useEffect(() => {
    if (elapsedSeconds >= 60 && !triggered60Ref.current) {
      triggered60Ref.current = true;
      chaosController.triggerRoast("Bir dəqiqə oldu. Hərflər qaçmır, sən qaçırsan.");
    }

    if (elapsedSeconds >= 120 && !triggered120Ref.current && realLetters.length > 0) {
      triggered120Ref.current = true;
      const pick = realLetters[Math.floor(Math.random() * realLetters.length)];
      setHintLetterId(pick.id);
    }

    if (elapsedSeconds >= 180 && !triggered180Ref.current) {
      triggered180Ref.current = true;
      setFlashAllLetters(true);
      window.setTimeout(() => {
        setFlashAllLetters(false);
      }, 300);
    }
  }, [elapsedSeconds, realLetters]);

  const discoveredUniqueCount = useMemo(() => {
    const discoveredChars = new Set(
      realLetters.filter((letter) => discoveredIds.has(letter.id)).map((letter) => letter.char),
    );
    return discoveredChars.size;
  }, [discoveredIds, realLetters]);

  const submit = () => {
    const candidate = safeUpper(inputValue);
    const target = safeUpper(wordPick.word);

    if (candidate === target) {
      setFeedback("correct");
      setFlashAllLetters(true);
      setShowVictory(true);
      recordSuccess();

      const definition = WORD_DEFINITIONS[target] ?? `${target}: Qaranlıqda tapılan söz. Hörmət!`;
      const foundCount = wordIndex + 1;

      if (foundCount >= TOTAL_WORDS_PER_STAGE) {
        setPanelMessage(`🎉 TAP! '${wordPick.word}' sözünü tapdın! • ${definition}`);
        window.setTimeout(() => {
          onComplete();
        }, 2000);
        return;
      }

      setPanelMessage(
        `🎉 ${foundCount}/${TOTAL_WORDS_PER_STAGE} tamamlandı! '${wordPick.word}' • ${definition} • Növbəti söz gəlir...`,
      );

      window.setTimeout(() => {
        setShowVictory(false);
        setFlashAllLetters(false);
        setWordIndex((prev) => prev + 1);
      }, 1500);

      return;
    }

    const roast =
      WRONG_ROASTS[Math.floor(Math.random() * WRONG_ROASTS.length)] ?? `İpucu: ${wordPick.word.length} hərf. Bundan artıq ipucu yoxdur.`;

    setFeedback("wrong");
    setPanelMessage(
      roast.includes("İpucu") ? roast : `${roast} • İpucu: ${wordPick.word.length} hərf. Bundan artıq ipucu yoxdur.`,
    );
    setInputValue("");
    setWrongAttempts((prev) => prev + 1);
    recordMistake();
    onFail();

    chaosController.triggerRoast(roast.includes("İpucu") ? roast : roast);

    if (wrongAttempts === 0) {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZƏĞIİÖŞÜÇ".split("");
      const filtered = alphabet.filter((char) => !safeUpper(wordPick.word).includes(char));
      const fakeCount = wordPick.tier === 2 ? 2 : 3 + Math.floor(Math.random() * 2);
      setFakeChars(shuffle(filtered).slice(0, fakeCount));
    }

    window.setTimeout(() => setFeedback("idle"), 550);
  };

  const handleConditionalSkip = () => {
    if (!canSkipByCondition) {
      setPanelMessage("Skip üçün şərti tam doldur: checkbox + kod.");
      return;
    }

    setPanelMessage("⚠ Cəza tətbiq olundu. Bu sözü skip etdin.");
    setInputValue("");
    setSkipCodeInput("");
    setSkipPenaltyAccepted(false);
    setFeedback("idle");
    recordMistake();
    onFail();

    if (wordIndex + 1 >= TOTAL_WORDS_PER_STAGE) {
      window.setTimeout(() => {
        onComplete();
      }, 500);
      return;
    }

    window.setTimeout(() => {
      setWordIndex((prev) => prev + 1);
    }, 500);
  };

  return (
    <section className="fixed inset-0 z-[112] overflow-hidden bg-[#050508]">
      <DarkOverlay mouse={mouse} radius={flashlightRadius} tintRadius={flickerActive ? 80 : 140} />

      <div className="absolute left-4 top-4 z-[121] rounded-lg border border-zinc-700 bg-zinc-900/75 px-3 py-2 text-xs font-semibold text-zinc-100">
        {wordPick.badge}
      </div>

      <div className="absolute right-4 top-4 z-[121] rounded-lg border border-zinc-700 bg-zinc-900/75 px-3 py-2 text-xs font-semibold text-zinc-100">
        Söz {wordIndex + 1}/{TOTAL_WORDS_PER_STAGE}
      </div>

      <div className="absolute left-1/2 top-5 z-[121] -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900/75 px-3 py-2 text-xs font-semibold text-zinc-100">
        ⏱ {elapsedSeconds}s
      </div>

      {letters.map((letter) => {
        const distCursor = distance(letter.x, letter.y, mouse.x, mouse.y);
        const distThief = distance(letter.x, letter.y, thiefPos.x, thiefPos.y);
        const canThiefReveal = elapsedSeconds >= 45 && letter.isFake;
        const visible =
          flashAllLetters || distCursor < 110 || (canThiefReveal && distThief < 110);
        const pulse = distCursor < 60;
        const highlighted = hintLetterId === letter.id;

        return (
          <FloatingLetter
            key={letter.id}
            letter={letter}
            visible={visible}
            pulse={pulse}
            highlighted={highlighted}
          />
        );
      })}

      {elapsedSeconds >= 45 && fakeLetters.length > 0 && (
        <div
          className="pointer-events-none absolute h-5 w-5 rounded-full bg-violet-300/70 blur-[3px]"
          style={{ left: thiefPos.x - 10, top: thiefPos.y - 10 }}
        />
      )}

      <InputPanel
        inputValue={inputValue}
        onChange={setInputValue}
        onSubmit={submit}
        discoveredCount={discoveredUniqueCount}
        totalLetters={wordPick.word.length}
        elapsed={elapsedSeconds}
        feedback={feedback}
        message={panelMessage}
      />

      {canOfferSkip && (
        <div className="fixed bottom-[128px] left-1/2 z-[123] w-[min(92vw,560px)] -translate-x-1/2 rounded-xl border border-amber-500/40 bg-zinc-900/90 p-3 text-zinc-100 shadow-xl">
          <p className="text-xs text-amber-300">Çətin sözdə ilişdin. Şərti qəbul etsən növbəti sözə keçə bilərsən.</p>
          <label className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={skipPenaltyAccepted}
              onChange={(event) => setSkipPenaltyAccepted(event.target.checked)}
            />
            Cəza qəbul edirəm (bu, uğursuz cəhd kimi sayılacaq)
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={skipCodeInput}
              onChange={(event) => setSkipCodeInput(event.target.value)}
              placeholder="Kod yaz: KEÇİR MƏNİ"
              className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-xs outline-none"
            />
            <button
              type="button"
              onClick={handleConditionalSkip}
              className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-black transition hover:bg-amber-500"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showVictory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-[124] bg-emerald-500/12"
          />
        )}
      </AnimatePresence>
    </section>
  );
}
