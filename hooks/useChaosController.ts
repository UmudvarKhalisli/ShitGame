"use client";

import {
  createElement,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface ChaosState {
  currentStage: "agreement" | 1 | 2 | 2.5 | 3 | 4 | 5 | 6 | 7 | 8 | "complete";
  playerName: string;

  attempts: number;
  mistakeCount: number;
  stressScore: number;
  startTime: number;

  isInverseMouse: boolean;
  isDrunkMode: boolean;
  isBSODActive: boolean;
  drunkLevel: 1 | 2 | 3;
  sobrietyPercent: number;

  lastRoastTime: number;
  idleStartTime: number;

  shownThreats: number[];

  showSocialThreat: boolean;
  showBSOD: boolean;

  memoryRound: number;
  quizQuestion: number;
  bossRound: number;
  darkSearchPlays: number;
  roasterMode: "normal" | "aggressive";
  isQuizColorSwapActive: boolean;
}

interface FinalScore {
  playerName: string;
  attempts: number;
  mistakeCount: number;
  stressScore: number;
  stressColor: "green" | "yellow" | "red";
  elapsedMs: number;
  elapsedSeconds: number;
  shownThreatCount: number;
  sobrietyPercent: number;
  completed: boolean;
  memoryRoundsCompleted: number;
  quizCorrectAnswers: number;
  bossRoundsCompleted: number;
  totalTimeSeconds: number;
}

interface ChaosControllerContextValue {
  state: ChaosState;
  advanceStage: () => void;
  recordMistake: () => void;
  recordSuccess: () => void;
  triggerBSOD: () => void;
  triggerSocialThreat: () => void;
  updateSobriety: (amount: number) => void;
  setMemoryRound: (round: number) => void;
  setQuizQuestion: (question: number) => void;
  setBossRound: (round: number) => void;
  incrementDarkSearchPlay: () => void;
  setRoasterAggressive: () => void;
  calculateFinalScore: () => FinalScore;
  setPlayerName: (name: string) => void;
  closeSocialThreat: () => void;
  closeBSOD: () => void;
  stressColor: "green" | "yellow" | "red";
}

const MAX_STRESS = 100;
const NORMAL_ROAST_COOLDOWN_MS = 8_000;
const AGGRESSIVE_ROAST_COOLDOWN_MS = 5_000;
const IDLE_STRESS_STEP_MS = 10_000;
const TOTAL_THREATS = 5;

const defaultState: ChaosState = {
  currentStage: "agreement",
  playerName: "",

  attempts: 0,
  mistakeCount: 0,
  stressScore: 0,
  startTime: 0,

  isInverseMouse: false,
  isDrunkMode: false,
  isBSODActive: false,
  drunkLevel: 1,
  sobrietyPercent: 15,

  lastRoastTime: 0,
  idleStartTime: Date.now(),

  shownThreats: [],

  showSocialThreat: false,
  showBSOD: false,

  memoryRound: 1,
  quizQuestion: 1,
  bossRound: 1,
  darkSearchPlays: 0,
  roasterMode: "normal",
  isQuizColorSwapActive: false,
};

const ChaosControllerContext = createContext<ChaosControllerContextValue | null>(null);

function clampStress(value: number) {
  return Math.max(0, Math.min(MAX_STRESS, Math.round(value)));
}

function getStressColor(score: number): "green" | "yellow" | "red" {
  if (score < 30) {
    return "green";
  }

  if (score < 60) {
    return "yellow";
  }

  return "red";
}

function nextStage(stage: ChaosState["currentStage"]): ChaosState["currentStage"] {
  if (stage === "agreement") {
    return 1;
  }

  if (stage === 1) {
    return 2;
  }

  if (stage === 2) {
    return 2.5;
  }

  if (stage === 2.5) {
    return 3;
  }

  if (stage === 3) {
    return 4;
  }

  if (stage === 4) {
    return 5;
  }

  if (stage === 5) {
    return 6;
  }

  if (stage === 6) {
    return 7;
  }

  if (stage === 7) {
    return 8;
  }

  if (stage === 8) {
    return "complete";
  }

  return "complete";
}

function applyStageChaos(prev: ChaosState, stage: ChaosState["currentStage"]): ChaosState {
  if (stage === "agreement") {
    return {
      ...prev,
      currentStage: stage,
      isInverseMouse: false,
      isDrunkMode: false,
      isBSODActive: false,
      drunkLevel: 1,
      showBSOD: false,
    };
  }

  if (stage === 1) {
    return {
      ...prev,
      currentStage: stage,
      isInverseMouse: true,
      isDrunkMode: false,
      isBSODActive: false,
      drunkLevel: 1,
      showBSOD: false,
    };
  }

  if (stage === 2) {
    return {
      ...prev,
      currentStage: stage,
      isInverseMouse: false,
      isDrunkMode: false,
      isBSODActive: false,
      drunkLevel: 1,
      showBSOD: false,
    };
  }

  if (stage === 2.5) {
    return {
      ...prev,
      currentStage: stage,
      isInverseMouse: false,
      isDrunkMode: false,
      isBSODActive: false,
      drunkLevel: 1,
      showBSOD: false,
    };
  }

  if (stage === 3) {
    return {
      ...prev,
      currentStage: stage,
      isInverseMouse: false,
      isDrunkMode: true,
      drunkLevel: 1,
    };
  }

  if (stage === 4) {
    return {
      ...prev,
      currentStage: stage,
      isInverseMouse: false,
      isDrunkMode: true,
      drunkLevel: 2,
    };
  }

  if (stage === 5) {
    return {
      ...prev,
      currentStage: stage,
      isInverseMouse: false,
      isDrunkMode: false,
      isBSODActive: false,
      drunkLevel: 1,
      roasterMode: "normal",
      isQuizColorSwapActive: false,
    };
  }

  if (stage === 6) {
    return {
      ...prev,
      currentStage: stage,
      memoryRound: Math.max(1, Math.min(4, prev.memoryRound)),
      isDrunkMode: prev.memoryRound >= 3,
      drunkLevel: 1,
      roasterMode: "normal",
      isQuizColorSwapActive: false,
    };
  }

  if (stage === 7) {
    return {
      ...prev,
      currentStage: stage,
      isDrunkMode: false,
      drunkLevel: 1,
      roasterMode: "normal",
      isQuizColorSwapActive: true,
      quizQuestion: Math.max(1, Math.min(5, prev.quizQuestion)),
    };
  }

  if (stage === 8) {
    return {
      ...prev,
      currentStage: stage,
      isDrunkMode: true,
      drunkLevel: 2,
      roasterMode: "aggressive",
      isQuizColorSwapActive: false,
      bossRound: Math.max(1, Math.min(5, prev.bossRound)),
    };
  }

  return {
    ...prev,
    currentStage: "complete",
    isInverseMouse: false,
    isDrunkMode: false,
    isBSODActive: false,
    drunkLevel: 1,
    showSocialThreat: false,
    showBSOD: false,
    roasterMode: "normal",
    isQuizColorSwapActive: false,
  };
}

export function ChaosControllerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChaosState>(defaultState);
  const idleStepsAwardedRef = useRef(0);
  const lastInteractionUpdateRef = useRef(0);

  const markInteraction = useCallback(() => {
    const now = Date.now();
    if (now - lastInteractionUpdateRef.current < 120) {
      return;
    }

    lastInteractionUpdateRef.current = now;
    setState((prev) => ({
      ...prev,
      startTime: prev.startTime === 0 ? now : prev.startTime,
      idleStartTime: now,
    }));
    idleStepsAwardedRef.current = 0;
  }, []);

  useEffect(() => {
    const onInteraction = () => {
      markInteraction();
    };

    const events: Array<keyof WindowEventMap> = ["mousemove", "click", "keydown"];
    events.forEach((eventName) => {
      window.addEventListener(eventName, onInteraction, { passive: true });
    });

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, onInteraction);
      });
    };
  }, [markInteraction]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setState((prev) => {
        const now = Date.now();
        const idleElapsed = now - prev.idleStartTime;
        const idleSteps = Math.floor(idleElapsed / IDLE_STRESS_STEP_MS);

        if (idleSteps <= idleStepsAwardedRef.current) {
          return prev;
        }

        const delta = idleSteps - idleStepsAwardedRef.current;
        idleStepsAwardedRef.current = idleSteps;

        return {
          ...prev,
          stressScore: clampStress(prev.stressScore + delta),
        };
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const setPlayerName = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      playerName: name,
    }));
  }, []);

  const triggerSocialThreat = useCallback(() => {
    setState((prev) => {
      const unseen = Array.from({ length: TOTAL_THREATS }, (_, index) => index).filter(
        (index) => !prev.shownThreats.includes(index),
      );

      const nextIndex = unseen.length > 0 ? unseen[0] : prev.shownThreats.length % TOTAL_THREATS;
      const nextShown = unseen.length > 0 ? [...prev.shownThreats, nextIndex] : [nextIndex];

      return {
        ...prev,
        shownThreats: nextShown,
        showSocialThreat: true,
        stressScore: clampStress(prev.stressScore + 3),
        lastRoastTime: Date.now(),
      };
    });
  }, []);

  const triggerBSOD = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isBSODActive: true,
      showBSOD: true,
      stressScore: clampStress(prev.stressScore + 10),
      lastRoastTime: Date.now(),
    }));
  }, []);

  const updateSobriety = useCallback((amount: number) => {
    setState((prev) => {
      const nextSobriety = Math.max(0, Math.min(100, prev.sobrietyPercent + amount));

      let nextDrunkLevel: 1 | 2 | 3 = prev.drunkLevel;
      if (nextSobriety >= 70) {
        nextDrunkLevel = 1;
      } else if (nextSobriety >= 35) {
        nextDrunkLevel = 2;
      } else {
        nextDrunkLevel = 3;
      }

      return {
        ...prev,
        sobrietyPercent: nextSobriety,
        isDrunkMode: nextSobriety >= 100 ? false : prev.isDrunkMode,
        drunkLevel: nextDrunkLevel,
      };
    });
  }, []);

  const recordMistake = useCallback(() => {
    const now = Date.now();

    setState((prev) => {
      const nextMistakeCount = prev.mistakeCount + 1;
      const nextState: ChaosState = {
        ...prev,
        attempts: prev.attempts + 1,
        mistakeCount: nextMistakeCount,
        stressScore: clampStress(prev.stressScore + 5),
        startTime: prev.startTime === 0 ? now : prev.startTime,
        idleStartTime: now,
      };

      const roastCooldown =
        prev.roasterMode === "aggressive"
          ? AGGRESSIVE_ROAST_COOLDOWN_MS
          : NORMAL_ROAST_COOLDOWN_MS;

      if (now - prev.lastRoastTime >= roastCooldown) {
        nextState.lastRoastTime = now;
      }

      if (nextMistakeCount >= 3 && !prev.showSocialThreat) {
        const unseen = Array.from({ length: TOTAL_THREATS }, (_, index) => index).filter(
          (index) => !prev.shownThreats.includes(index),
        );
        const nextThreatIndex = unseen.length > 0 ? unseen[0] : prev.shownThreats.length % TOTAL_THREATS;

        nextState.shownThreats = unseen.length > 0 ? [...prev.shownThreats, nextThreatIndex] : [nextThreatIndex];
        nextState.showSocialThreat = true;
        nextState.stressScore = clampStress(nextState.stressScore + 3);
      }

      return nextState;
    });

    idleStepsAwardedRef.current = 0;
  }, []);

  const recordSuccess = useCallback(() => {
    const now = Date.now();

    setState((prev) => ({
      ...prev,
      startTime: prev.startTime === 0 ? now : prev.startTime,
      idleStartTime: now,
      sobrietyPercent: Math.min(100, prev.sobrietyPercent + 10),
      isDrunkMode: Math.min(100, prev.sobrietyPercent + 10) >= 100 ? false : prev.isDrunkMode,
      drunkLevel:
        Math.min(100, prev.sobrietyPercent + 10) >= 70
          ? 1
          : Math.min(100, prev.sobrietyPercent + 10) >= 35
            ? 2
            : 3,
    }));

    idleStepsAwardedRef.current = 0;
  }, []);

  const setMemoryRound = useCallback((round: number) => {
    const now = Date.now();
    setState((prev) => {
      const nextRound = Math.max(1, Math.min(4, Math.floor(round)));
      return {
        ...prev,
        currentStage: 6,
        memoryRound: nextRound,
        isDrunkMode: nextRound >= 3,
        drunkLevel: 1,
        roasterMode: "normal",
        isQuizColorSwapActive: false,
        startTime: prev.startTime === 0 ? now : prev.startTime,
        idleStartTime: now,
      };
    });
  }, []);

  const setQuizQuestion = useCallback((question: number) => {
    const now = Date.now();
    setState((prev) => {
      const nextQuestion = Math.max(1, Math.min(5, Math.floor(question)));
      return {
        ...prev,
        currentStage: 7,
        quizQuestion: nextQuestion,
        isDrunkMode: false,
        drunkLevel: 1,
        roasterMode: "normal",
        isQuizColorSwapActive: true,
        startTime: prev.startTime === 0 ? now : prev.startTime,
        idleStartTime: now,
      };
    });
  }, []);

  const setBossRound = useCallback((round: number) => {
    const now = Date.now();
    setState((prev) => {
      const nextRound = Math.max(1, Math.min(5, Math.floor(round)));
      return {
        ...prev,
        currentStage: 8,
        bossRound: nextRound,
        isDrunkMode: true,
        drunkLevel: 2,
        roasterMode: "aggressive",
        isQuizColorSwapActive: false,
        startTime: prev.startTime === 0 ? now : prev.startTime,
        idleStartTime: now,
      };
    });
  }, []);

  const setRoasterAggressive = useCallback(() => {
    setState((prev) => ({
      ...prev,
      roasterMode: "aggressive",
    }));
  }, []);

  const incrementDarkSearchPlay = useCallback(() => {
    setState((prev) => ({
      ...prev,
      darkSearchPlays: prev.darkSearchPlays + 1,
    }));
  }, []);

  const advanceStage = useCallback(() => {
    const now = Date.now();

    setState((prev) => {
      const upcoming = nextStage(prev.currentStage);
      const baseState = applyStageChaos(
        {
          ...prev,
          startTime: prev.startTime === 0 ? now : prev.startTime,
          idleStartTime: now,
        },
        upcoming,
      );

      return {
        ...baseState,
        showSocialThreat: upcoming === "complete" ? false : baseState.showSocialThreat,
        showBSOD: upcoming === "complete" ? false : baseState.showBSOD,
      };
    });

    idleStepsAwardedRef.current = 0;
  }, []);

  const closeSocialThreat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showSocialThreat: false,
    }));
  }, []);

  const closeBSOD = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showBSOD: false,
      isBSODActive: false,
    }));
  }, []);

  const calculateFinalScore = useCallback((): FinalScore => {
    const now = Date.now();
    const start = state.startTime === 0 ? now : state.startTime;
    const elapsedMs = Math.max(0, now - start);

    return {
      playerName: state.playerName,
      attempts: state.attempts,
      mistakeCount: state.mistakeCount,
      stressScore: state.stressScore,
      stressColor: getStressColor(state.stressScore),
      elapsedMs,
      elapsedSeconds: Math.floor(elapsedMs / 1000),
      shownThreatCount: state.shownThreats.length,
      sobrietyPercent: state.sobrietyPercent,
      completed: state.currentStage === "complete",
      memoryRoundsCompleted: Math.max(0, Math.min(4, state.memoryRound)),
      quizCorrectAnswers: Math.max(0, Math.min(5, state.quizQuestion)),
      bossRoundsCompleted: Math.max(0, Math.min(5, state.bossRound)),
      totalTimeSeconds: elapsedMs / 1000,
    };
  }, [state]);

  const contextValue = useMemo<ChaosControllerContextValue>(
    () => ({
      state,
      advanceStage,
      recordMistake,
      recordSuccess,
      triggerBSOD,
      triggerSocialThreat,
      updateSobriety,
      setMemoryRound,
      setQuizQuestion,
      setBossRound,
      incrementDarkSearchPlay,
      setRoasterAggressive,
      calculateFinalScore,
      setPlayerName,
      closeSocialThreat,
      closeBSOD,
      stressColor: getStressColor(state.stressScore),
    }),
    [
      state,
      advanceStage,
      recordMistake,
      recordSuccess,
      triggerBSOD,
      triggerSocialThreat,
      updateSobriety,
      setMemoryRound,
      setQuizQuestion,
      setBossRound,
      incrementDarkSearchPlay,
      setRoasterAggressive,
      calculateFinalScore,
      setPlayerName,
      closeSocialThreat,
      closeBSOD,
    ],
  );

  return createElement(ChaosControllerContext.Provider, { value: contextValue }, children);
}

export function useChaosController() {
  const context = useContext(ChaosControllerContext);

  if (!context) {
    throw new Error("useChaosController must be used within ChaosControllerProvider");
  }

  return context;
}
