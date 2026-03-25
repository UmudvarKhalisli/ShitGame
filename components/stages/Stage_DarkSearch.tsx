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

type WordPick = { word: string; difficulty: Difficulty; badge: string };

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

function pickWord(playCount: number): WordPick {
  if (playCount <= 0) {
    return { word: pickFromPool([...SHORT_WORDS], "short"), difficulty: "easy", badge: "🟢 Asan" };
  }

  if (playCount === 1) {
    return { word: pickFromPool([...MEDIUM_WORDS], "medium"), difficulty: "medium", badge: "🟡 Orta" };
  }

  return { word: pickFromPool([...LONG_WORDS], "hard"), difficulty: "hard", badge: "🔴 Çətin" };
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
    const drift = (items: LetterNode[]) =>
      items.map((letter) => {
        let nextX = letter.x + letter.vx;
        let nextY = letter.y + letter.vy;
        let nextVx = letter.vx;
        let nextVy = letter.vy;

        if (nextX < EDGE_PADDING || nextX > viewport.width - EDGE_PADDING) {
          nextVx = -nextVx;
          nextX = Math.max(EDGE_PADDING, Math.min(viewport.width - EDGE_PADDING, nextX));
        }

        if (nextY < EDGE_PADDING || nextY > viewport.height - EDGE_PADDING - 120) {
          nextVy = -nextVy;
          nextY = Math.max(EDGE_PADDING, Math.min(viewport.height - EDGE_PADDING - 120, nextY));
        }

        return {
          ...letter,
          x: nextX,
          y: nextY,
          vx: nextVx,
          vy: nextVy,
        };
      });

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
  const lastSwooshRef = useRef(0);

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

  const playCursorSwoosh = useCallback(
    (speed: number) => {
      const now = Date.now();
      if (speed < 1.6 || now - lastSwooshRef.current < 120) {
        return;
      }

      lastSwooshRef.current = now;
      playNoiseBurst(0.06, 0.02);
    },
    [playNoiseBurst],
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
    playCursorSwoosh,
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

  const [wordPick, setWordPick] = useState<WordPick>({ word: "KOD", difficulty: "easy", badge: "🟢 Asan" });
  const [mouse, setMouse] = useState<MousePosition>({ x: 640, y: 360 });
  const [thiefPos, setThiefPos] = useState<MousePosition>({ x: 0, y: 0 });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [flashlightRadius, setFlashlightRadius] = useState(120);
  const [flickerActive, setFlickerActive] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "wrong" | "correct">("idle");
  const [panelMessage, setPanelMessage] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [fakeChars, setFakeChars] = useState<string[]>([]);
  const [discoveredIds, setDiscoveredIds] = useState<Set<string>>(new Set());
  const [hintLetterId, setHintLetterId] = useState<string | null>(null);
  const [flashAllLetters, setFlashAllLetters] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const initialPlayCountRef = useRef<number | null>(null);

  const stageStartRef = useRef<number>(Date.now());
  const lastMouseRef = useRef<MousePosition>({ x: 0, y: 0 });
  const triggered60Ref = useRef(false);
  const triggered120Ref = useRef(false);
  const triggered180Ref = useRef(false);

  const audio = useSpookyAudio();

  if (initialPlayCountRef.current === null) {
    initialPlayCountRef.current = state.darkSearchPlays;
  }

  useEffect(() => {
    const nextPick = pickWord(initialPlayCountRef.current ?? 0);
    setWordPick(nextPick);
    incrementDarkSearchPlay();
  }, [incrementDarkSearchPlay]);

  const { letters, realLetters, fakeLetters, viewport } = useLetterPositions(wordPick.word, fakeChars);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const next = { x: event.clientX, y: event.clientY };
      const delta = distance(next.x, next.y, lastMouseRef.current.x, lastMouseRef.current.y);
      lastMouseRef.current = next;
      setMouse(next);
      audio.playCursorSwoosh(delta);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [audio]);

  useEffect(() => {
    audio.startAmbient();
    stageStartRef.current = Date.now();

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - stageStartRef.current) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
      audio.stopAmbient();
    };
  }, [audio]);

  useEffect(() => {
    const loopFlicker = () => {
      const delay = 8000 + Math.random() * 7000;
      const timeoutId = window.setTimeout(() => {
        setFlickerActive(true);
        setFlashlightRadius(20);
        audio.playFlickerCrackle();

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
  }, [audio]);

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

    setDiscoveredIds((prev) => {
      const next = new Set(prev);
      discoveredNow.forEach((id) => next.add(id));
      return next;
    });
  }, [mouse, realLetters]);

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
      audio.playVictory();

      const definition = WORD_DEFINITIONS[target] ?? `${target}: Qaranlıqda tapılan söz. Hörmət!`;
      setPanelMessage(`🎉 TAP! '${wordPick.word}' sözünü tapdın! • ${definition}`);

      window.setTimeout(() => {
        onComplete();
      }, 2000);

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
      setFakeChars(shuffle(filtered).slice(0, 3 + Math.floor(Math.random() * 2)));
    }

    window.setTimeout(() => setFeedback("idle"), 550);
  };

  return (
    <section className="fixed inset-0 z-[112] cursor-none overflow-hidden bg-[#050508]">
      <DarkOverlay mouse={mouse} radius={flashlightRadius} tintRadius={flickerActive ? 80 : 140} />

      <div className="absolute left-4 top-4 z-[121] rounded-lg border border-zinc-700 bg-zinc-900/75 px-3 py-2 text-xs font-semibold text-zinc-100">
        {wordPick.badge}
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

      <div
        className="pointer-events-none fixed z-[123] h-2 w-2 rounded-full bg-white"
        style={{
          left: mouse.x - 4,
          top: mouse.y - 4,
          boxShadow: "0 0 12px 6px rgba(200,180,255,0.8)",
        }}
      />

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
