"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useChaosController } from "@/hooks/useChaosController";

type ToneType = OscillatorType;

const BASE_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

const FREQUENCIES = [261, 294, 329, 349, 392, 440, 494, 523, 587] as const;
const TOTAL_ROUNDS = 3;
const GAP_MS = 550;
const FLASH_MS = 900;

function buildSequence(length: number) {
  return Array.from({ length }, () => Math.floor(Math.random() * 9));
}

export default function Stage5_Memory({
  onComplete,
  onFail,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const { recordMistake, recordSuccess, setMemoryRound } = useChaosController();

  const [round, setRound] = useState(1);
  const [sequenceLength, setSequenceLength] = useState(3);
  const [primarySequence, setPrimarySequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);

  const [gridOrder] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const [slotColors] = useState<string[]>([...BASE_COLORS]);

  const [activeButtonId, setActiveButtonId] = useState<number | null>(null);
  const [isPlayback, setIsPlayback] = useState(false);
  const [isAwaitingInput, setIsAwaitingInput] = useState(false);
  const [isPassed, setIsPassed] = useState(false);
  const [statusText, setStatusText] = useState("Hazırlaş... yaddaşın test olunur 🧠");
  const [playbackStep, setPlaybackStep] = useState(0);
  const [hintText, setHintText] = useState("");
  const [fakeCountdown, setFakeCountdown] = useState<number | null>(null);
  const [flashOverlay, setFlashOverlay] = useState<"red" | "green" | null>(null);
  const [shakeAll, setShakeAll] = useState(false);
  const [failedAttemptsInStage, setFailedAttemptsInStage] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const timeoutIdsRef = useRef<number[]>([]);
  const playbackTokenRef = useRef(0);
  const mountedRef = useRef(true);
  const prepareRoundRef = useRef<(activeRound: number) => Promise<void>>(async () => {
    return;
  });

  const sequenceLengthByRound = useMemo(() => [3, 4, 5], []);

  const clearScheduledTimeouts = () => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  };

  useEffect(() => {
    mountedRef.current = true;
    document.documentElement.style.cursor = "auto";
    document.body.style.cursor = "auto";

    return () => {
      mountedRef.current = false;
      clearScheduledTimeouts();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }

      document.documentElement.style.cursor = "";
      document.body.style.cursor = "";
    };
  }, []);

  useEffect(() => {
    setMemoryRound(round);
  }, [round, setMemoryRound]);

  const scheduleTimeout = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeoutIdsRef.current.push(id);
    return id;
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      scheduleTimeout(resolve, ms);
    });

  const getAudioContext = () => {
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
  };

  const playTone = (frequency: number, durationSec: number, type: ToneType = "sine") => {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    const startAt = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + durationSec + 0.03);
  };

  const playWrongBuzz = () => {
    playTone(150, 0.5, "sawtooth");
  };

  const playSuccessArpeggio = async () => {
    const tones = [261, 329, 392, 523];
    for (const frequency of tones) {
      playTone(frequency, 0.16, "triangle");
      await wait(120);
    }
  };

  const flashButton = async (buttonId: number, ms: number, token: number) => {
    if (!mountedRef.current || token !== playbackTokenRef.current) {
      return;
    }

    setActiveButtonId(buttonId);
    playTone(FREQUENCIES[buttonId], 0.24, "sine");
    await wait(ms);

    if (!mountedRef.current || token !== playbackTokenRef.current) {
      return;
    }

    setActiveButtonId(null);
  };

  const runSequencePlayback = async (
    sequence: number[],
    token: number,
    options?: { decoyIndex?: number },
  ) => {
    for (let index = 0; index < sequence.length; index += 1) {
      if (!mountedRef.current || token !== playbackTokenRef.current) {
        return;
      }

      const id = sequence[index];
      setPlaybackStep(index + 1);

      await flashButton(id, FLASH_MS, token);

      if (options?.decoyIndex === index) {
        await wait(160);
        await flashButton(id, 280, token);
      }

      await wait(GAP_MS);
    }

    setPlaybackStep(0);
  };

  const applyPostPlaybackChaos = () => {
    setHintText("Rəng ardıcıllığını təkrarla 🎯");
    setFakeCountdown(null);

  };

  const prepareRound = async (activeRound: number) => {
    const token = playbackTokenRef.current + 1;
    playbackTokenRef.current = token;

    const targetLength = sequenceLengthByRound[activeRound - 1] ?? 6;

    setIsAwaitingInput(false);
    setIsPlayback(true);
    setStatusText("Ardıcıllıq göstərilir...");
    setUserInput([]);
    setPrimarySequence([]);
    setSequenceLength(targetLength);
    setFakeCountdown(null);

    const primary = buildSequence(targetLength);

    setPrimarySequence(primary);

    await wait(320);

    if (!mountedRef.current || token !== playbackTokenRef.current) {
      return;
    }

    await runSequencePlayback(primary, token);

    if (!mountedRef.current || token !== playbackTokenRef.current) {
      return;
    }

    applyPostPlaybackChaos();

    setIsPlayback(false);
    setIsAwaitingInput(true);
    setStatusText("İndi sıra səndədir 👇");
  };

  prepareRoundRef.current = prepareRound;

  useEffect(() => {
    void prepareRoundRef.current(1);
  }, []);

  const validateInputPrefix = (candidateInput: number[]) => {
    const expectedColors = primarySequence.map((id) => slotColors[id]);
    const candidateColors = candidateInput.map((id) => slotColors[id]);

    const primaryPrefixMatches = expectedColors
      .slice(0, candidateColors.length)
      .every((value, index) => value === candidateColors[index]);

    return {
      isValidPrefix: primaryPrefixMatches,
      isPrimaryComplete: candidateInput.length === primarySequence.length && primaryPrefixMatches,
      isAlternateComplete: false,
    };
  };

  const handleWrongAttempt = async () => {
    setIsAwaitingInput(false);
    setShakeAll(true);
    setFlashOverlay("red");
    playWrongBuzz();
    setFailedAttemptsInStage((prev) => prev + 1);

    recordMistake();
    onFail();

    setStatusText("Səhv ardıcıllıq 😵 Yenidən baxaq.");

    await wait(500);

    if (!mountedRef.current) {
      return;
    }

    setFlashOverlay(null);
    setShakeAll(false);
    setUserInput([]);

    await wait(350);
    if (mountedRef.current) {
      void prepareRound(round);
    }
  };

  const handleRoundSuccess = async () => {
    setIsAwaitingInput(false);
    setFlashOverlay("green");
    setStatusText("Düz tapdın ✅");

    recordSuccess();
    await playSuccessArpeggio();
    await wait(280);

    if (!mountedRef.current) {
      return;
    }

    setFlashOverlay(null);
    setUserInput([]);

    if (round >= TOTAL_ROUNDS) {
      setStatusText("Son imtahan keçildi. Respect 🫡");
      setIsPassed(true);
      await wait(500);
      if (mountedRef.current) {
        onComplete();
      }
      return;
    }

    const nextRound = round + 1;
    setRound(nextRound);
    setStatusText("Növbəti raund hazırlanır...");
    await wait(550);
    if (mountedRef.current) {
      void prepareRound(nextRound);
    }
  };

  const handleButtonClick = (buttonId: number) => {
    if (!isAwaitingInput || isPlayback || isPassed) {
      return;
    }

    playTone(FREQUENCIES[buttonId], 0.18, "triangle");

    const nextInput = [...userInput, buttonId];
    setUserInput(nextInput);

    const verdict = validateInputPrefix(nextInput);

    if (!verdict.isValidPrefix) {
      void handleWrongAttempt();
      return;
    }

    if (verdict.isPrimaryComplete || verdict.isAlternateComplete) {
      void handleRoundSuccess();
    }
  };

  const canUnlockSkip = round >= 3 && failedAttemptsInStage >= 20 && !isPlayback;

  const handleSkipAfterFailures = () => {
    setStatusText("20+ cəhddən sonra keçid aktiv oldu. Növbəti mərhələyə keçdin.");
    recordMistake();
    onFail();
    window.setTimeout(() => {
      onComplete();
    }, 450);
  };

  return (
    <section
      className="relative w-full max-w-3xl space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-xl"
    >
      {flashOverlay && (
        <div
          className={`pointer-events-none fixed inset-0 z-40 ${
            flashOverlay === "red" ? "bg-red-500/35" : "bg-emerald-500/30"
          }`}
        />
      )}

      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-black text-zinc-100">Yaddaş Testi: Simon Says Chaos</h1>
        <p className="text-sm text-zinc-300">
          Mərhələ {round} / {TOTAL_ROUNDS} • Ardıcıllıq uzunluğu: {sequenceLength}
        </p>
        <p className="text-sm font-semibold text-amber-300">{statusText}</p>
        {isPlayback && playbackStep > 0 && (
          <p className="text-xs font-semibold text-cyan-300">
            Göstərilən addım: {playbackStep}/{sequenceLength}
            {activeButtonId !== null ? ` • Yanan düymə: #${activeButtonId + 1}` : ""}
          </p>
        )}
        <p className="text-xs text-zinc-400">Daxil etdiyin addım: {userInput.length}</p>
        {hintText && <p className="text-xs text-zinc-400">{hintText}</p>}
        {fakeCountdown !== null && round >= 3 && (
          <p className="text-xs font-bold text-rose-300">Tələsmə: {fakeCountdown}...</p>
        )}
      </div>

      <motion.div
        animate={shakeAll ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-3 gap-3"
      >
        {gridOrder.map((id) => {
          const isActive = activeButtonId === id;
          const shouldDim = isPlayback && activeButtonId !== null && !isActive;
          return (
            <motion.button
              key={id}
              layout
              type="button"
              onClick={() => handleButtonClick(id)}
              whileTap={{ scale: 0.94 }}
              animate={{
                scale: isActive ? 1.18 : 1,
                opacity: shouldDim ? 0.12 : 1,
                filter: isActive ? "brightness(2.4) saturate(2)" : "brightness(1)",
                backgroundColor: isActive ? "#ffffff" : slotColors[id],
                boxShadow: isActive
                  ? `0 0 0 3px rgba(255,255,255,0.9), 0 0 36px ${slotColors[id]}, 0 0 70px ${slotColors[id]}`
                  : "0 0 0px rgba(0,0,0,0)",
              }}
              transition={{ duration: isActive ? 0.08 : 0.15, ease: "linear" }}
              className="h-20 rounded-xl border border-zinc-700"
              aria-label={`Memory button ${id + 1}`}
            />
          );
        })}
      </motion.div>

      <p className="text-center text-xs text-zinc-500">
        Düzgün cavab rəng ardıcıllığına bağlıdır.
      </p>

      {canUnlockSkip && (
        <div className="rounded-xl border border-amber-500/40 bg-zinc-900/90 p-3 text-center">
          <p className="text-xs text-amber-300">
            20 cəhddən sonra kömək keçidi açıldı. İstəsən bu mərhələni keçə bilərsən.
          </p>
          <button
            type="button"
            onClick={handleSkipAfterFailures}
            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-black transition hover:bg-amber-500"
          >
            Mərhələni Keç
          </button>
        </div>
      )}
    </section>
  );
}
