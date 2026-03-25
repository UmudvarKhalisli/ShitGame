"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { chaosController } from "@/hooks/chaosController";

export interface GameState {
  currentStage: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | "complete";
  playerName: string;
  attempts: number;
  chaosLevel: number;
  entryAccepted: boolean;
  isBSODActive: boolean;
  bsodRecoveryToken: number;
  isSocialThreatActive: boolean;
  socialThreatMessageIndex: number;
  isDrunkBrowserActive: boolean;
  sobriety: number;
  isMicRequestCompleted: boolean;
}

interface ChaosContextValue {
  gameState: GameState;
  setPlayerName: (name: string) => void;
  incrementAttempts: () => void;
  setStage: (stage: GameState["currentStage"]) => void;
  advanceStage: () => void;
  acceptEntry: () => void;
  triggerBSOD: () => void;
  completeBSOD: () => void;
  triggerSocialThreat: () => void;
  completeSocialThreat: () => void;
  triggerDrunkBrowser: () => void;
  improveSobriety: () => void;
  completeMicRequest: () => void;
}

const defaultState: GameState = {
  currentStage: 1,
  playerName: "",
  attempts: 0,
  chaosLevel: 1,
  entryAccepted: false,
  isBSODActive: false,
  bsodRecoveryToken: 0,
  isSocialThreatActive: false,
  socialThreatMessageIndex: 0,
  isDrunkBrowserActive: false,
  sobriety: 15,
  isMicRequestCompleted: false,
};

const ChaosContext = createContext<ChaosContextValue | null>(null);

export function ChaosProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(defaultState);

  useEffect(() => {
    const unregister = chaosController.registerTriggerBSOD(() => {
      setGameState((prev) => ({
        ...prev,
        isBSODActive: true,
      }));
    });

    return unregister;
  }, []);

  useEffect(() => {
    const unregister = chaosController.registerTriggerSocialThreat(() => {
      setGameState((prev) => ({
        ...prev,
        isSocialThreatActive: true,
      }));
    });

    return unregister;
  }, []);

  useEffect(() => {
    const unregister = chaosController.registerTriggerDrunkBrowser(() => {
      setGameState((prev) => ({
        ...prev,
        isDrunkBrowserActive: true,
        sobriety: prev.sobriety <= 0 ? 15 : prev.sobriety,
      }));
    });

    return unregister;
  }, []);

  const value = useMemo<ChaosContextValue>(
    () => ({
      gameState,
      setPlayerName: (name) =>
        setGameState((prev) => ({
          ...prev,
          playerName: name,
        })),
      incrementAttempts: () =>
        setGameState((prev) => {
          const nextAttempts = prev.attempts + 1;
          return {
            ...prev,
            attempts: nextAttempts,
            isSocialThreatActive:
              nextAttempts === 3 ? true : prev.isSocialThreatActive,
          };
        }),
      setStage: (stage) =>
        setGameState((prev) => ({
          ...prev,
          currentStage: stage,
          chaosLevel: stage === "complete" ? prev.chaosLevel : Number(stage),
        })),
      advanceStage: () =>
        setGameState((prev) => {
          if (prev.currentStage === "complete") {
            return prev;
          }

          const nextStage: GameState["currentStage"] =
            prev.currentStage === 1
              ? 2
              : prev.currentStage === 2
                ? 3
                : prev.currentStage === 3
                  ? 4
                  : prev.currentStage === 4
                    ? 5
                    : prev.currentStage === 5
                      ? 6
                      : prev.currentStage === 6
                        ? 7
                        : prev.currentStage === 7
                          ? 8
                  : "complete";

          const startsDrunkMode = prev.currentStage === 2 && nextStage === 3;
          const nextDrunkMode = prev.isDrunkBrowserActive || startsDrunkMode;
          const nextSobriety = nextDrunkMode
            ? Math.min(100, (startsDrunkMode ? 15 : prev.sobriety) + 10)
            : prev.sobriety;

          return {
            ...prev,
            currentStage: nextStage,
            chaosLevel: nextStage === "complete" ? prev.chaosLevel : Number(nextStage),
            isBSODActive:
              prev.currentStage === 2 && nextStage === 3
                ? Math.random() < 0.25 || prev.isBSODActive
                : prev.isBSODActive,
            isSocialThreatActive:
              Math.random() < 0.2 || prev.isSocialThreatActive,
            isDrunkBrowserActive: nextDrunkMode,
            sobriety: nextSobriety,
            isMicRequestCompleted:
              nextStage === 2 ? false : prev.isMicRequestCompleted,
          };
        }),
      acceptEntry: () =>
        setGameState((prev) => ({
          ...prev,
          entryAccepted: true,
        })),
      triggerBSOD: () =>
        setGameState((prev) => ({
          ...prev,
          isBSODActive: true,
        })),
      completeBSOD: () =>
        setGameState((prev) => ({
          ...prev,
          isBSODActive: false,
          bsodRecoveryToken: prev.bsodRecoveryToken + 1,
        })),
      triggerSocialThreat: () =>
        setGameState((prev) => ({
          ...prev,
          isSocialThreatActive: true,
        })),
      completeSocialThreat: () =>
        setGameState((prev) => ({
          ...prev,
          isSocialThreatActive: false,
          socialThreatMessageIndex: (prev.socialThreatMessageIndex + 1) % 5,
        })),
      triggerDrunkBrowser: () =>
        setGameState((prev) => ({
          ...prev,
          isDrunkBrowserActive: true,
          sobriety: prev.sobriety <= 0 ? 15 : prev.sobriety,
        })),
      improveSobriety: () =>
        setGameState((prev) => ({
          ...prev,
          sobriety: Math.min(100, prev.sobriety + 10),
        })),
      completeMicRequest: () =>
        setGameState((prev) => ({
          ...prev,
          isMicRequestCompleted: true,
        })),
    }),
    [gameState],
  );

  return <ChaosContext.Provider value={value}>{children}</ChaosContext.Provider>;
}

export function useChaosState() {
  const context = useContext(ChaosContext);

  if (!context) {
    throw new Error("useChaosState must be used inside ChaosProvider");
  }

  return context;
}
