"use client";

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
  reverseAfterMs?: number;
  superJumpFactor?: number;
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
  },
  {
    id: 2,
    title: "Mərhələ 2: Saxta Döşəmə",
    note: "2-ci platforma ayağının altında gecikmə ilə dağılır.",
    fakePlatformId: 2,
    platforms: [
      { id: 1, x: 125, y: 390, width: 160, height: 16 },
      { id: 2, x: 335, y: 340, width: 150, height: 16, fake: true },
      { id: 3, x: 565, y: 300, width: 145, height: 16 },
      { id: 4, x: 738, y: 326, width: 104, height: 16 },
    ],
    gate: { x: 852, y: 250, width: 36, height: 92 },
  },
  {
    id: 3,
    title: "Mərhələ 3: Beyin Tərsinə",
    note: "3 saniyədən sonra sağ-sol idarəsi tərsinə keçir.",
    reverseAfterMs: 3000,
    platforms: [
      { id: 1, x: 150, y: 390, width: 145, height: 16 },
      { id: 2, x: 360, y: 332, width: 132, height: 16 },
      { id: 3, x: 560, y: 286, width: 124, height: 16 },
      { id: 4, x: 730, y: 252, width: 96, height: 16 },
    ],
    gate: { x: 846, y: 185, width: 38, height: 102 },
  },
  {
    id: 4,
    title: "Mərhələ 4: Super Jump",
    note: "Tullanış çox güclüdür, havada nəzarət et.",
    superJumpFactor: 1.55,
    windForce: -0.42,
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

    keysRef.current = { left: false, right: false, up: false };
    resetPlayer();
  }, [clearReverseTimer, resetPlayer, spikeBox.hiddenY]);

  const hardResetAll = () => {
    setStarted(false);
    setStageIndex(0);
    setAllStagesCleared(false);
    resetStageState();
  };

  const startRun = () => {
    resetStageState();
    setStarted(true);

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
  }, [allStagesCleared, clearReverseTimer, dead, stageWon]);

  const completeStage = useCallback(() => {
    setStarted(false);
    setStageWon(true);
    clearReverseTimer();

    if (stageIndex === STAGES.length - 1) {
      setAllStagesCleared(true);
    }
  }, [clearReverseTimer, stageIndex]);

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

        player.vy = Math.min(MAX_FALL, player.vy + GRAVITY * frameRatio);

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
          const gateCenterX = stage.gate.x + stage.gate.width / 2;
          if (!spikesTriggeredRef.current && Math.abs(centerX - gateCenterX) <= 56) {
            spikesTriggeredRef.current = true;
            setSpikesTriggered(true);
          }

          if (spikesTriggeredRef.current && spikesYRef.current < spikeBox.landedY) {
            spikesYRef.current = Math.min(spikeBox.landedY, spikesYRef.current + 9 * frameRatio);
            setSpikesY(spikesYRef.current);
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
          playerRight > stage.gate.x &&
          nextX < stage.gate.x + stage.gate.width &&
          playerBottom > stage.gate.y &&
          nextY < stage.gate.y + stage.gate.height;

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

          <div
            className="absolute border border-emerald-300/70 bg-emerald-500/25"
            style={{ left: stage.gate.x, top: stage.gate.y, width: stage.gate.width, height: stage.gate.height }}
          >
            <div className="absolute inset-x-0 top-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
              Qapı
            </div>
          </div>

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
