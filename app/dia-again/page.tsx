"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Platform = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fake?: boolean;
};

type Gate = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Hazard = {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
};

type StageConfig = {
  id: number;
  title: string;
  note: string;
  platforms: Platform[];
  gate: Gate;
  doorStartsAtCenter?: boolean;
  teleportDoorOnProximity?: boolean;
  teleportDistance?: number;
  cornerFlipEnabled?: boolean;
  swapGateTo?: Gate;
  swapGateDistance?: number;
  reverseAfterMs?: number;
  superJumpFactor?: number;
  gravityScale?: number;
  fallingHazards?: boolean;
  fakePlatformId?: number;
  trapSpikes?: boolean;
  windForce?: number;
};

type PlayerState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
};

const WORLD_WIDTH = 920;
const WORLD_HEIGHT = 500;
const FLOOR_Y = WORLD_HEIGHT - 32;
const PLAYER_SIZE = 28;

const BASE_MOVE_SPEED = 4.5;
const BASE_JUMP_SPEED = -12.5;
const GRAVITY = 0.72;
const MAX_FALL = 15;
const FAKE_PLATFORM_GRACE_MS = 620;

const START_X = 46;
const START_Y = FLOOR_Y - PLAYER_SIZE;

const STAGES: StageConfig[] = [
  {
    id: 1,
    title: "Mərhələ 1: Yağış Başlayır",
    note: "Yuxarıdan qutular düşür, ritmlə qaç.",
    fallingHazards: true,
    platforms: [
      { id: 1, x: 140, y: 392, width: 160, height: 16 },
      { id: 2, x: 388, y: 346, width: 145, height: 16 },
      { id: 3, x: 620, y: 308, width: 120, height: 16 },
    ],
    gate: { x: 842, y: 244, width: 40, height: 96 },
    teleportDoorOnProximity: true,
    teleportDistance: 120,
  },
  {
    id: 2,
    title: "Mərhələ 2: Ağır Ayaq + Saxta Döşəmə",
    note: "Ağır tullanırsan, fake platforma isə gecikmə ilə dağılır.",
    superJumpFactor: 0.78,
    gravityScale: 1.18,
    fakePlatformId: 2,
    platforms: [
      { id: 1, x: 125, y: 390, width: 160, height: 16 },
      { id: 2, x: 335, y: 362, width: 150, height: 16, fake: true },
      { id: 3, x: 552, y: 334, width: 145, height: 16 },
      { id: 4, x: 736, y: 306, width: 104, height: 16 },
    ],
    gate: { x: 852, y: 232, width: 36, height: 92 },
    teleportDoorOnProximity: true,
    teleportDistance: 110,
  },
  {
    id: 3,
    title: "Mərhələ 3: Tərsinə + Yalançı Qapı",
    note: "Qapıya yaxınlaşanda yox olur və sol tərəfdə yenidən açılır.",
    reverseAfterMs: 3000,
    swapGateDistance: 60,
    swapGateTo: { x: 44, y: 218, width: 38, height: 102 },
    platforms: [
      { id: 1, x: 138, y: 392, width: 140, height: 16 },
      { id: 2, x: 346, y: 344, width: 132, height: 16 },
      { id: 3, x: 566, y: 290, width: 124, height: 16 },
      { id: 4, x: 734, y: 254, width: 96, height: 16 },
      { id: 5, x: 116, y: 320, width: 112, height: 16 },
      { id: 6, x: 78, y: 276, width: 104, height: 16 },
    ],
    gate: { x: 846, y: 185, width: 38, height: 102 },
  },
  {
    id: 4,
    title: "Mərhələ 4: Super Jump",
    note: "Tullanış çox güclüdür, havada nəzarət et.",
    superJumpFactor: 1.55,
    windForce: -0.42,
    doorStartsAtCenter: true,
    teleportDoorOnProximity: true,
    teleportDistance: 150,
    cornerFlipEnabled: true,
    platforms: [
      { id: 1, x: 140, y: 396, width: 146, height: 16 },
      { id: 2, x: 325, y: 354, width: 118, height: 16 },
      { id: 3, x: 492, y: 308, width: 120, height: 16 },
      { id: 4, x: 666, y: 258, width: 108, height: 16 },
    ],
    gate: { x: 836, y: 178, width: 42, height: 108 },
  },
  {
    id: 5,
    title: "Mərhələ 5: Qapı Tələsi",
    note: "Qapıya yaxınlaşanda gizli tikanlar düşəcək, altından gir.",
    trapSpikes: true,
    fallingHazards: true,
    doorStartsAtCenter: true,
    teleportDoorOnProximity: true,
    teleportDistance: 140,
    cornerFlipEnabled: true,
    platforms: [
      { id: 1, x: 138, y: 390, width: 150, height: 16 },
      { id: 2, x: 355, y: 338, width: 146, height: 16 },
      { id: 3, x: 574, y: 290, width: 134, height: 16 },
      { id: 4, x: 748, y: 320, width: 90, height: 16 },
    ],
    gate: { x: 854, y: 242, width: 34, height: 90 },
  },
];

export default function DiaAgainPage() {
  const router = useRouter();

  const [stageIndex, setStageIndex] = useState(0);
  const stage = STAGES[stageIndex];

  const [started, setStarted] = useState(false);
  const [dead, setDead] = useState(false);
  const [stageWon, setStageWon] = useState(false);
  const [allStagesCleared, setAllStagesCleared] = useState(false);

  const [controlsInverted, setControlsInverted] = useState(false);
  const [deathCount, setDeathCount] = useState(0);

  const [playerView, setPlayerView] = useState({ x: START_X, y: START_Y });

  const [hazardView, setHazardView] = useState<Hazard[]>([]);
  const [fakeBroken, setFakeBroken] = useState(false);
  const [fakeDropView, setFakeDropView] = useState(0);

  const [spikesTriggered, setSpikesTriggered] = useState(false);
  const [spikesY, setSpikesY] = useState(0);
  const [gateView, setGateView] = useState<Gate>(stage.gate);
  const [gateSwapped, setGateSwapped] = useState(false);
  const [gateScale, setGateScale] = useState(1);

  const keysRef = useRef({ left: false, right: false, up: false });
  const rafRef = useRef<number | null>(null);
  const reverseTimerRef = useRef<number | null>(null);

  const playerRef = useRef<PlayerState>({
    x: START_X,
    y: START_Y,
    vx: 0,
    vy: 0,
    onGround: true,
  });

  const fakeBrokenRef = useRef(false);
  const fakeDropRef = useRef(0);
  const fakeBrokenAtRef = useRef<number | null>(null);

  const hazardsRef = useRef<Hazard[]>([]);
  const lastHazardSpawnRef = useRef(0);
  const hazardIdRef = useRef(0);

  const spikesTriggeredRef = useRef(false);
  const spikesYRef = useRef(0);
  const gateRef = useRef<Gate>(stage.gate);
  const gateSwappedRef = useRef(false);
  const gateScaleRef = useRef(1);
  const gateTeleportCooldownUntilRef = useRef(0);
  const gateReformingRef = useRef(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const musicIntervalRef = useRef<number | null>(null);
  const musicStepRef = useRef(0);
  const chaosTimeoutsRef = useRef<number[]>([]);

  const lastTickRef = useRef(0);

  const spikeBox = useMemo(() => {
    const width = stage.gate.width - 8;
    return {
      x: stage.gate.x + 4,
      width,
      height: 28,
      hiddenY: stage.gate.y - 86,
      landedY: stage.gate.y - 14,
    };
  }, [stage.gate.width, stage.gate.x, stage.gate.y]);

  const clearReverseTimer = useCallback(() => {
    if (reverseTimerRef.current !== null) {
      window.clearTimeout(reverseTimerRef.current);
      reverseTimerRef.current = null;
    }
  }, []);

  const clearChaosTimeouts = useCallback(() => {
    chaosTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    chaosTimeoutsRef.current = [];
  }, []);

  const stopArcadeMusic = useCallback(() => {
    if (musicIntervalRef.current !== null) {
      window.clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startArcadeMusic = useCallback(() => {
    stopArcadeMusic();

    const BrowserAudioContext =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!BrowserAudioContext) {
      return;
    }

    try {
      const context = new BrowserAudioContext();
      audioContextRef.current = context;
      musicStepRef.current = 0;

      const notes = [440, 523, 659, 784, 659, 523, 587, 698];

      musicIntervalRef.current = window.setInterval(() => {
        const activeContext = audioContextRef.current;
        if (!activeContext) {
          return;
        }

        const step = musicStepRef.current;
        const note = notes[step % notes.length] + ((step % 4) * 24 - 24);
        const now = activeContext.currentTime;

        const oscillator = activeContext.createOscillator();
        const gain = activeContext.createGain();

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(note, now);
        oscillator.frequency.exponentialRampToValueAtTime(note * 1.08, now + 0.045);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.07, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

        oscillator.connect(gain);
        gain.connect(activeContext.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.09);

        musicStepRef.current += 1;
      }, 95);
    } catch {
      stopArcadeMusic();
    }
  }, [stopArcadeMusic]);

  const setGatePosition = useCallback((nextGate: Gate) => {
    gateRef.current = nextGate;
    setGateView(nextGate);
  }, []);

  const randomTeleportGate = useCallback(
    (playerX: number, playerY: number) => {
      const width = gateRef.current.width;
      const height = gateRef.current.height;

      const xMin = 18;
      const xMax = WORLD_WIDTH - width - 18;
      const yMin = 92;
      const yMax = FLOOR_Y - height - 26;

      for (let attempt = 0; attempt < 12; attempt += 1) {
        const candidateX = xMin + Math.random() * (xMax - xMin);
        const candidateY = yMin + Math.random() * (yMax - yMin);

        const centerDx = candidateX + width / 2 - (playerX + PLAYER_SIZE / 2);
        const centerDy = candidateY + height / 2 - (playerY + PLAYER_SIZE / 2);

        if (Math.hypot(centerDx, centerDy) > 170) {
          setGatePosition({ x: candidateX, y: candidateY, width, height });
          return;
        }
      }

      setGatePosition({ x: xMin + Math.random() * (xMax - xMin), y: yMin + Math.random() * (yMax - yMin), width, height });
    },
    [setGatePosition],
  );

  const resetPlayer = useCallback(() => {
    playerRef.current = {
      x: START_X,
      y: START_Y,
      vx: 0,
      vy: 0,
      onGround: true,
    };
    setPlayerView({ x: START_X, y: START_Y });
  }, []);

  const resetStageState = useCallback(() => {
    clearReverseTimer();
    clearChaosTimeouts();
    stopArcadeMusic();

    setDead(false);
    setStageWon(false);
    setControlsInverted(false);

    setFakeBroken(false);
    setFakeDropView(0);
    fakeBrokenRef.current = false;
    fakeDropRef.current = 0;
    fakeBrokenAtRef.current = null;

    hazardsRef.current = [];
    setHazardView([]);
    lastHazardSpawnRef.current = 0;

    setSpikesTriggered(false);
    setSpikesY(spikeBox.hiddenY);
    spikesTriggeredRef.current = false;
    spikesYRef.current = spikeBox.hiddenY;

    const centeredGate = {
      ...stage.gate,
      x: WORLD_WIDTH / 2 - stage.gate.width / 2,
      y: WORLD_HEIGHT / 2 - stage.gate.height / 2,
    };

    const initialGate = stage.doorStartsAtCenter ? centeredGate : stage.gate;
    gateRef.current = initialGate;
    setGateView(initialGate);
    gateSwappedRef.current = false;
    setGateSwapped(false);
    gateScaleRef.current = 1;
    setGateScale(1);
    gateTeleportCooldownUntilRef.current = 0;
    gateReformingRef.current = false;

    keysRef.current = { left: false, right: false, up: false };
    resetPlayer();
  }, [clearChaosTimeouts, clearReverseTimer, resetPlayer, spikeBox.hiddenY, stage.doorStartsAtCenter, stage.gate, stopArcadeMusic]);

  const hardResetAll = () => {
    setStarted(false);
    setStageIndex(0);
    setAllStagesCleared(false);
    resetStageState();
  };

  const startRun = () => {
    resetStageState();
    setStarted(true);
    startArcadeMusic();

    if (stage.reverseAfterMs) {
      reverseTimerRef.current = window.setTimeout(() => {
        setControlsInverted(true);
      }, stage.reverseAfterMs);
    }
  };

  const restartCurrentStage = () => {
    startRun();
  };

  const triggerDeath = useCallback(() => {
    if (dead || stageWon || allStagesCleared) {
      return;
    }

    setDead(true);
    setStarted(false);
    setDeathCount((prev) => prev + 1);
    clearReverseTimer();
    stopArcadeMusic();
  }, [allStagesCleared, clearReverseTimer, dead, stageWon, stopArcadeMusic]);

  const completeStage = useCallback(() => {
    setStarted(false);
    setStageWon(true);
    clearReverseTimer();
    stopArcadeMusic();

    if (stageIndex === STAGES.length - 1) {
      setAllStagesCleared(true);
    }
  }, [clearReverseTimer, stageIndex, stopArcadeMusic]);

  const goToNextStage = () => {
    if (stageIndex >= STAGES.length - 1) {
      return;
    }

    setStageIndex((prev) => prev + 1);
    setStarted(false);
    setAllStagesCleared(false);
    setDead(false);
    setStageWon(false);
  };

  useEffect(() => {
    resetStageState();
    setStarted(false);
    setDead(false);
    setStageWon(false);
  }, [stageIndex, resetStageState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        keysRef.current.left = true;
      }
      if (key === "arrowright" || key === "d") {
        keysRef.current.right = true;
      }
      if (key === "arrowup" || key === "w" || key === " ") {
        keysRef.current.up = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        keysRef.current.left = false;
      }
      if (key === "arrowright" || key === "d") {
        keysRef.current.right = false;
      }
      if (key === "arrowup" || key === "w" || key === " ") {
        keysRef.current.up = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearChaosTimeouts();
      stopArcadeMusic();
    };
  }, [clearChaosTimeouts, stopArcadeMusic]);

  useEffect(() => {
    const tick = (timestamp: number) => {
      if (lastTickRef.current === 0) {
        lastTickRef.current = timestamp;
      }

      const frameRatio = Math.min(2, (timestamp - lastTickRef.current) / 16.67);
      lastTickRef.current = timestamp;

      if (started && !dead && !stageWon && !allStagesCleared) {
        const player = playerRef.current;
        const now = Date.now();

        const xDir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
        const controlDir = controlsInverted ? -xDir : xDir;

        const wind = stage.windForce ?? 0;
        player.vx = controlDir * BASE_MOVE_SPEED + wind;

        if (keysRef.current.up && player.onGround) {
          const jumpFactor = stage.superJumpFactor ?? 1;
          player.vy = BASE_JUMP_SPEED * jumpFactor;
          player.onGround = false;
        }

        const gravityScale = stage.gravityScale ?? 1;
        player.vy = Math.min(MAX_FALL, player.vy + GRAVITY * gravityScale * frameRatio);

        const prevY = player.y;
        let nextX = player.x + player.vx * frameRatio;
        let nextY = player.y + player.vy * frameRatio;
        let nextOnGround = false;

        nextX = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, nextX));

        const activePlatforms = stage.platforms
          .filter((platform) => {
            if (platform.id !== stage.fakePlatformId) {
              return true;
            }

            const stillSolid =
              !fakeBrokenRef.current ||
              (fakeBrokenAtRef.current !== null && now - fakeBrokenAtRef.current < FAKE_PLATFORM_GRACE_MS);
            return stillSolid;
          })
          .map((platform) => {
            if (platform.id !== stage.fakePlatformId) {
              return platform;
            }
            return { ...platform, y: platform.y + fakeDropRef.current };
          });

        for (const platform of activePlatforms) {
          const prevBottom = prevY + PLAYER_SIZE;
          const nextBottom = nextY + PLAYER_SIZE;

          const fallingOnto = player.vy >= 0 && prevBottom <= platform.y && nextBottom >= platform.y;
          const overlapsX = nextX + PLAYER_SIZE > platform.x && nextX < platform.x + platform.width;

          if (fallingOnto && overlapsX) {
            nextY = platform.y - PLAYER_SIZE;
            player.vy = 0;
            nextOnGround = true;

            if (platform.id === stage.fakePlatformId && !fakeBrokenRef.current) {
              fakeBrokenRef.current = true;
              fakeBrokenAtRef.current = now;
              setFakeBroken(true);
            }
          }
        }

        const prevBottom = prevY + PLAYER_SIZE;
        const nextBottom = nextY + PLAYER_SIZE;
        if (player.vy >= 0 && prevBottom <= FLOOR_Y && nextBottom >= FLOOR_Y) {
          nextY = FLOOR_Y - PLAYER_SIZE;
          player.vy = 0;
          nextOnGround = true;
        }

        const canDropFake =
          fakeBrokenAtRef.current !== null && now - fakeBrokenAtRef.current >= FAKE_PLATFORM_GRACE_MS;
        if (fakeBrokenRef.current && canDropFake && fakeDropRef.current < 160) {
          fakeDropRef.current += 4.5 * frameRatio;
          setFakeDropView(fakeDropRef.current);
        }

        if (stage.fallingHazards) {
          if (lastHazardSpawnRef.current === 0 || now - lastHazardSpawnRef.current > 950) {
            lastHazardSpawnRef.current = now;
            const size = 16 + Math.floor(Math.random() * 14);
            hazardsRef.current = [
              ...hazardsRef.current,
              {
                id: hazardIdRef.current,
                x: 60 + Math.random() * (WORLD_WIDTH - 120),
                y: -size,
                size,
                speed: 3 + Math.random() * 2.5,
              },
            ];
            hazardIdRef.current += 1;
          }

          hazardsRef.current = hazardsRef.current
            .map((hazard) => ({
              ...hazard,
              y: hazard.y + hazard.speed * frameRatio,
            }))
            .filter((hazard) => hazard.y < WORLD_HEIGHT + 40);

          setHazardView(hazardsRef.current);
        } else if (hazardsRef.current.length > 0) {
          hazardsRef.current = [];
          setHazardView([]);
        }

        if (stage.trapSpikes) {
          const centerX = nextX + PLAYER_SIZE / 2;
          const gateCenterX = gateRef.current.x + gateRef.current.width / 2;
          if (!spikesTriggeredRef.current && Math.abs(centerX - gateCenterX) <= 56) {
            spikesTriggeredRef.current = true;
            setSpikesTriggered(true);
          }

          if (spikesTriggeredRef.current && spikesYRef.current < spikeBox.landedY) {
            spikesYRef.current = Math.min(spikeBox.landedY, spikesYRef.current + 9 * frameRatio);
            setSpikesY(spikesYRef.current);
          }
        }

        if (stage.swapGateTo && !gateSwappedRef.current) {
          const centerX = nextX + PLAYER_SIZE / 2;
          const centerY = nextY + PLAYER_SIZE / 2;
          const currentGate = gateRef.current;
          const gateCenterX = currentGate.x + currentGate.width / 2;
          const gateCenterY = currentGate.y + currentGate.height / 2;
          const dx = centerX - gateCenterX;
          const dy = centerY - gateCenterY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= (stage.swapGateDistance ?? 70)) {
            gateRef.current = stage.swapGateTo;
            setGateView(stage.swapGateTo);
            gateSwappedRef.current = true;
            setGateSwapped(true);
          }
        }

        if (stage.teleportDoorOnProximity && !gateReformingRef.current) {
          const centerX = nextX + PLAYER_SIZE / 2;
          const centerY = nextY + PLAYER_SIZE / 2;
          const currentGate = gateRef.current;
          const gateCenterX = currentGate.x + currentGate.width / 2;
          const gateCenterY = currentGate.y + currentGate.height / 2;
          const nearGate =
            Math.hypot(centerX - gateCenterX, centerY - gateCenterY) <= (stage.teleportDistance ?? 120);

          if (nearGate && now >= gateTeleportCooldownUntilRef.current) {
            gateTeleportCooldownUntilRef.current = now + 340;
            randomTeleportGate(nextX, nextY);
          }
        }

        if (stage.cornerFlipEnabled && !gateReformingRef.current && now >= gateTeleportCooldownUntilRef.current) {
          const gate = gateRef.current;
          const cornerMargin = 22;
          const nearLeft = gate.x <= cornerMargin;
          const nearRight = gate.x + gate.width >= WORLD_WIDTH - cornerMargin;
          const nearTop = gate.y <= 98;
          const nearBottom = gate.y + gate.height >= FLOOR_Y - 12;
          const inCorner = (nearLeft || nearRight) && (nearTop || nearBottom);

          if (inCorner) {
            const centerX = nextX + PLAYER_SIZE / 2;
            const centerY = nextY + PLAYER_SIZE / 2;
            const gateCenterX = gate.x + gate.width / 2;
            const gateCenterY = gate.y + gate.height / 2;

            if (Math.hypot(centerX - gateCenterX, centerY - gateCenterY) <= 54) {
              gateTeleportCooldownUntilRef.current = now + 700;
              gateReformingRef.current = true;
              gateScaleRef.current = 0;
              setGateScale(0);

              const vanishId = window.setTimeout(() => {
                const oppositeX = nearLeft ? WORLD_WIDTH - gate.width - 22 : 22;
                const oppositeY = nearTop ? FLOOR_Y - gate.height - 24 : 96;
                setGatePosition({ ...gate, x: oppositeX, y: oppositeY });

                const appearId = window.setTimeout(() => {
                  gateScaleRef.current = 1;
                  setGateScale(1);
                  gateReformingRef.current = false;
                }, 100);
                chaosTimeoutsRef.current.push(appearId);
              }, 150);

              chaosTimeoutsRef.current.push(vanishId);
            }
          }
        }

        const playerRight = nextX + PLAYER_SIZE;
        const playerBottom = nextY + PLAYER_SIZE;

        let hitHazard = false;
        for (const hazard of hazardsRef.current) {
          const overlaps =
            playerRight > hazard.x &&
            nextX < hazard.x + hazard.size &&
            playerBottom > hazard.y &&
            nextY < hazard.y + hazard.size;

          if (overlaps) {
            hitHazard = true;
            break;
          }
        }

        if (stage.trapSpikes) {
          const spikeRight = spikeBox.x + spikeBox.width;
          const spikeBottom = spikesYRef.current + spikeBox.height;
          const touchesSpikes =
            playerRight > spikeBox.x &&
            nextX < spikeRight &&
            playerBottom > spikesYRef.current &&
            nextY < spikeBottom;

          if (touchesSpikes) {
            hitHazard = true;
          }
        }

        if (hitHazard || nextY > WORLD_HEIGHT + 40) {
          triggerDeath();
        }

        const touchesGate =
          gateScaleRef.current > 0.35 &&
          playerRight > gateRef.current.x &&
          nextX < gateRef.current.x + gateRef.current.width &&
          playerBottom > gateRef.current.y &&
          nextY < gateRef.current.y + gateRef.current.height;

        if (touchesGate && !dead) {
          completeStage();
        }

        player.x = nextX;
        player.y = nextY;
        player.onGround = nextOnGround;

        setPlayerView({ x: nextX, y: nextY });
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      lastTickRef.current = 0;
      clearReverseTimer();
    };
  }, [
    allStagesCleared,
    clearReverseTimer,
    completeStage,
    controlsInverted,
    dead,
    stage,
    stage.gate.height,
    stage.gate.width,
    stage.gate.x,
    stage.gate.y,
    stageIndex,
    stageWon,
    spikeBox.height,
    spikeBox.landedY,
    spikeBox.width,
    spikeBox.x,
    started,
    triggerDeath,
    randomTeleportGate,
    setGatePosition,
  ]);

  const stageProgress = `${stageIndex + 1}/${STAGES.length}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl border border-rose-500/35 bg-zinc-950/95 p-4 shadow-[0_0_42px_rgba(244,63,94,0.14)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-[0.18em] text-rose-300 sm:text-3xl">
              Dia Again: 5 Mini Mərhələ
            </h1>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">{stage.title}</p>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">{stage.note}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={startRun}
              className="rounded-md border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-sm font-bold uppercase tracking-[0.14em] text-emerald-200 transition hover:bg-emerald-500/28"
            >
              Start
            </button>
            <button
              type="button"
              onClick={hardResetAll}
              className="rounded-md border border-zinc-400/50 bg-zinc-700/25 px-4 py-2 text-sm font-bold uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-zinc-600/35"
            >
              Reset All
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200">Mərhələ: {stageProgress}</span>
          <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200">
            Status: {allStagesCleared ? "Hamısı keçildi" : stageWon ? "Mərhələ keçildi" : dead ? "Öldün" : started ? "Oyundasan" : "Hazırsan"}
          </span>
          <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200">
            Tərs idarəetmə: {controlsInverted ? "Aktiv" : "Normal"}
          </span>
          <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200">Ölüm sayı: {deathCount}</span>
        </div>

        <div
          className="relative mx-auto w-full overflow-hidden rounded-xl border border-zinc-800 bg-[linear-gradient(180deg,#0f172a_0%,#0c111f_45%,#111827_100%)]"
          style={{ height: WORLD_HEIGHT, maxWidth: WORLD_WIDTH }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_22%_18%,rgba(251,191,36,0.2),transparent_24%),radial-gradient(circle_at_82%_9%,rgba(236,72,153,0.2),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.15),transparent_40%)]" />

          <div
            className="absolute left-0 border-t-2 border-zinc-500/50 bg-zinc-800"
            style={{ top: FLOOR_Y, width: WORLD_WIDTH, height: WORLD_HEIGHT - FLOOR_Y }}
          />

          {stage.platforms.map((platform) => {
            const isFake = platform.id === stage.fakePlatformId;
            const y = isFake ? platform.y + fakeDropView : platform.y;
            const hidden = isFake && fakeDropView > 8;

            return (
              <div
                key={platform.id}
                className={`absolute rounded-sm border transition-all duration-300 ${
                  isFake && fakeBroken
                    ? "border-rose-300/70 bg-rose-500/35"
                    : "border-cyan-300/50 bg-cyan-400/30"
                }`}
                style={{
                  left: platform.x,
                  top: y,
                  width: platform.width,
                  height: platform.height,
                  opacity: hidden ? 0 : 1,
                }}
              />
            );
          })}

          {hazardView.map((hazard) => (
            <div
              key={hazard.id}
              className="absolute rounded-sm border border-orange-200/60 bg-orange-400/80 shadow-[0_0_12px_rgba(251,146,60,0.65)]"
              style={{ left: hazard.x, top: hazard.y, width: hazard.size, height: hazard.size }}
            />
          ))}

          <motion.button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="absolute border border-emerald-300/80 bg-emerald-500/25"
            animate={{ x: gateView.x, y: gateView.y, scale: gateScale }}
            transition={{ type: "spring", stiffness: 250, damping: 20, mass: 0.65 }}
            style={{ left: 0, top: 0, width: gateView.width, height: gateView.height, transformOrigin: "center center" }}
          >
            <div className="absolute inset-x-0 top-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
              {gateSwapped ? "SONA CAT?" : "SONA CAT"}
            </div>
          </motion.button>

          {stage.trapSpikes && (
            <div
              className="absolute bg-rose-500/95 shadow-[0_0_18px_rgba(244,63,94,0.75)] transition-all duration-100"
              style={{
                left: spikeBox.x,
                top: spikesY,
                width: spikeBox.width,
                height: spikeBox.height,
                clipPath:
                  "polygon(0 100%,10% 0,20% 100%,30% 0,40% 100%,50% 0,60% 100%,70% 0,80% 100%,90% 0,100% 100%)",
                opacity: spikesTriggered ? 1 : 0,
              }}
            />
          )}

          <div
            className="absolute rounded-[4px] border border-amber-200 bg-amber-300 shadow-[0_0_18px_rgba(253,224,71,0.6)]"
            style={{ left: playerView.x, top: playerView.y, width: PLAYER_SIZE, height: PLAYER_SIZE }}
          />

          {!started && !dead && !stageWon && (
            <div className="absolute inset-0 grid place-items-center bg-zinc-950/50">
              <p className="text-center text-lg font-black uppercase tracking-[0.2em] text-zinc-100">
                Start bas və {stage.title.toLowerCase()} keç
              </p>
            </div>
          )}

          {stageWon && !allStagesCleared && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-emerald-950/45 p-4">
              <div className="text-center">
                <p className="text-center text-3xl font-black uppercase tracking-[0.2em] text-emerald-300">
                  Mərhələ Keçildi
                </p>
                <button
                  type="button"
                  onClick={goToNextStage}
                  className="mt-5 rounded-md border border-emerald-300/70 bg-emerald-600/25 px-5 py-2 text-sm font-bold uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-600/40"
                >
                  Növbəti mini mərhələ
                </button>
              </div>
            </div>
          )}

          {allStagesCleared && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-cyan-950/55 p-4">
              <div className="text-center">
                <p className="text-3xl font-black uppercase tracking-[0.2em] text-cyan-200">5/5 keçdin</p>
                <p className="mt-2 text-sm text-cyan-100/85">İndi əsas oyunun növbəti mərhələsinə keçə bilərsən.</p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/game")}
                    className="rounded-md border border-cyan-300/70 bg-cyan-500/25 px-5 py-2 text-sm font-bold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/40"
                  >
                    Növbəti mərhələyə keç
                  </button>
                  <button
                    type="button"
                    onClick={hardResetAll}
                    className="rounded-md border border-zinc-300/55 bg-zinc-700/30 px-5 py-2 text-sm font-bold uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-zinc-600/40"
                  >
                    Yenidən oyna
                  </button>
                </div>
              </div>
            </div>
          )}

          {dead && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/70 p-4">
              <div className="text-center">
                <p className="death-glitch text-3xl font-black uppercase text-red-500 sm:text-5xl">
                  Yenə ölməyi bacardın?
                </p>
                <button
                  type="button"
                  onClick={restartCurrentStage}
                  className="mt-5 rounded-md border border-red-400/70 bg-red-600/20 px-5 py-2 text-sm font-bold uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-600/35"
                >
                  Bu mərhələni yenidən başlat
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
