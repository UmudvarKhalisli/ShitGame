"use client";

import { useEffect, useRef, useState } from "react";

const WORLD_WIDTH = 760;
const WORLD_HEIGHT = 320;
const FLOOR_Y = WORLD_HEIGHT - 24;
const PLAYER_SIZE = 24;
const START_X = 24;
const START_Y = FLOOR_Y - PLAYER_SIZE;
const PLATFORM_SNAP_TOLERANCE = 2.8;

type Platform = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Door = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type FallingHazard = {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
};

type RoundConfig = {
  id: number;
  title: string;
  note: string;
  moveSpeed: number;
  jump: number;
  gravity: number;
  platforms: Platform[];
  door: Door;
  fakePlatformId?: number;
  fakeSupportMs?: number;
  invertAfterMs?: number;
  windX?: number;
  teleportDoorDistance?: number;
  fallingHazards?: boolean;
};

const ROUNDS: RoundConfig[] = [
  {
    id: 1,
    title: "Raund 1/5: Ağır Jump",
    note: "Ağır tullanış var, amma fake platforma gecikmə ilə dağılır.",
    moveSpeed: 4,
    jump: -9.6,
    gravity: 0.92,
    fakePlatformId: 2,
    fakeSupportMs: 520,
    platforms: [
      { id: 1, x: 104, y: 252, w: 154, h: 12 },
      { id: 2, x: 286, y: 224, w: 132, h: 12 },
      { id: 3, x: 454, y: 192, w: 106, h: 12 },
      { id: 4, x: 600, y: 166, w: 86, h: 12 },
    ],
    door: { x: 704, y: 108, w: 32, h: 76 },
  },
  {
    id: 2,
    title: "Raund 2/5: Tərsinə Beyin",
    note: "3 saniyədən sonra sağ-sol tərsinə çevrilir.",
    moveSpeed: 4.5,
    jump: -10.4,
    gravity: 0.8,
    invertAfterMs: 3000,
    platforms: [
      { id: 1, x: 120, y: 252, w: 130, h: 12 },
      { id: 2, x: 286, y: 216, w: 118, h: 12 },
      { id: 3, x: 442, y: 182, w: 110, h: 12 },
      { id: 4, x: 598, y: 152, w: 94, h: 12 },
    ],
    door: { x: 704, y: 96, w: 32, h: 74 },
  },
  {
    id: 3,
    title: "Raund 3/5: Külək + Yağış",
    note: "Sola külək vurur, yuxarıdan bloklar düşür.",
    moveSpeed: 4.7,
    jump: -10.8,
    gravity: 0.78,
    windX: -0.42,
    fallingHazards: true,
    platforms: [
      { id: 1, x: 100, y: 252, w: 142, h: 12 },
      { id: 2, x: 280, y: 220, w: 118, h: 12 },
      { id: 3, x: 446, y: 192, w: 106, h: 12 },
      { id: 4, x: 596, y: 164, w: 96, h: 12 },
    ],
    door: { x: 706, y: 110, w: 32, h: 74 },
  },
  {
    id: 4,
    title: "Raund 4/5: Qaçan Qapı",
    note: "Qapıya yaxınlaşanda random yerə qaçır.",
    moveSpeed: 4.9,
    jump: -11.2,
    gravity: 0.76,
    teleportDoorDistance: 116,
    platforms: [
      { id: 1, x: 112, y: 252, w: 130, h: 12 },
      { id: 2, x: 278, y: 220, w: 122, h: 12 },
      { id: 3, x: 440, y: 188, w: 108, h: 12 },
      { id: 4, x: 596, y: 156, w: 98, h: 12 },
    ],
    door: { x: 702, y: 96, w: 34, h: 74 },
  },
  {
    id: 5,
    title: "Raund 5/5: Final Qarışıqlıq",
    note: "Ağır jump + tərs idarə + qaçan qapı eyni anda.",
    moveSpeed: 4.3,
    jump: -9.4,
    gravity: 0.94,
    invertAfterMs: 2200,
    teleportDoorDistance: 108,
    fakePlatformId: 3,
    fakeSupportMs: 420,
    fallingHazards: true,
    platforms: [
      { id: 1, x: 104, y: 252, w: 146, h: 12 },
      { id: 2, x: 284, y: 226, w: 114, h: 12 },
      { id: 3, x: 436, y: 198, w: 108, h: 12 },
      { id: 4, x: 590, y: 170, w: 96, h: 12 },
    ],
    door: { x: 704, y: 108, w: 32, h: 74 },
  },
];

type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
};

export default function Stage8_DiaAgainRush({
  onComplete,
  onFail,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const round = ROUNDS[roundIndex];

  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [dead, setDead] = useState(false);
  const [controlsInverted, setControlsInverted] = useState(false);
  const [status, setStatus] = useState("5 raundlu chaos başladı. Start bas.");
  const [roundFailCounts, setRoundFailCounts] = useState<number[]>(Array.from({ length: ROUNDS.length }, () => 0));
  const [roundApproachCounts, setRoundApproachCounts] = useState<number[]>(
    Array.from({ length: ROUNDS.length }, () => 0),
  );

  const [playerView, setPlayerView] = useState({ x: START_X, y: START_Y });
  const [doorView, setDoorView] = useState<Door>(round.door);
  const [fakeBroken, setFakeBroken] = useState(false);
  const [fakeDrop, setFakeDrop] = useState(0);
  const [hazardView, setHazardView] = useState<FallingHazard[]>([]);
  const round4ApproachCount = roundApproachCounts[3] ?? 0;
  const isRound4Mercy = round.id === 4 && round4ApproachCount >= 24;

  const playerRef = useRef<Player>({ x: START_X, y: START_Y, vx: 0, vy: 0, onGround: true });
  const keysRef = useRef({ left: false, right: false, up: false });
  const rafRef = useRef<number | null>(null);
  const invertTimerRef = useRef<number | null>(null);
  const autoStartNextRoundRef = useRef(false);

  const doorRef = useRef<Door>(round.door);
  const doorCooldownUntilRef = useRef(0);

  const fakeBrokenRef = useRef(false);
  const fakeDropRef = useRef(0);
  const fakeBrokenAtRef = useRef<number | null>(null);

  const hazardRef = useRef<FallingHazard[]>([]);
  const hazardSpawnAtRef = useRef(0);
  const hazardIdRef = useRef(0);

  const clearTimers = () => {
    if (invertTimerRef.current !== null) {
      window.clearTimeout(invertTimerRef.current);
      invertTimerRef.current = null;
    }
  };

  const randomizeDoor = (playerX: number, playerY: number) => {
    const width = doorRef.current.w;
    const height = doorRef.current.h;

    for (let i = 0; i < 12; i += 1) {
      const x = 22 + Math.random() * (WORLD_WIDTH - width - 44);
      const y = 80 + Math.random() * (FLOOR_Y - height - 94);
      const dx = x + width / 2 - (playerX + PLAYER_SIZE / 2);
      const dy = y + height / 2 - (playerY + PLAYER_SIZE / 2);

      if (Math.hypot(dx, dy) > 160) {
        const nextDoor = { x, y, w: width, h: height };
        doorRef.current = nextDoor;
        setDoorView(nextDoor);
        return;
      }
    }
  };

  const setupRound = (startImmediately: boolean) => {
    clearTimers();

    setStarted(startImmediately);
    setWon(false);
    setDead(false);
    setControlsInverted(false);

    const initialDoor = round.door;
    doorRef.current = initialDoor;
    setDoorView(initialDoor);
    doorCooldownUntilRef.current = 0;

    setFakeBroken(false);
    setFakeDrop(0);
    fakeBrokenRef.current = false;
    fakeDropRef.current = 0;
    fakeBrokenAtRef.current = null;

    hazardRef.current = [];
    setHazardView([]);
    hazardSpawnAtRef.current = 0;

    keysRef.current = { left: false, right: false, up: false };
    playerRef.current = { x: START_X, y: START_Y, vx: 0, vy: 0, onGround: true };
    setPlayerView({ x: START_X, y: START_Y });

    if (!startImmediately) {
      const mercyText = isRound4Mercy
        ? " • Mercy unlock aktivdir."
        : round.id === 4
          ? ` • Yaxınlaşma: ${round4ApproachCount}/24`
          : "";
      setStatus(`${round.title} hazırdır. Start bas.${mercyText}`);
    } else {
      const mercyText = isRound4Mercy
        ? " Mercy unlock: qapı daha az qaçacaq."
        : round.id === 4
          ? ` Yaxınlaşma: ${round4ApproachCount}/24`
          : "";
      setStatus(`${round.note}${mercyText}`);
    }

    if (startImmediately && round.invertAfterMs) {
      invertTimerRef.current = window.setTimeout(() => {
        setControlsInverted(true);
        setStatus(`${round.note} • İdarəetmə tərsinə keçdi.`);
      }, round.invertAfterMs);
    }
  };

  const resetRun = () => {
    clearTimers();
    setRoundFailCounts(Array.from({ length: ROUNDS.length }, () => 0));
    setRoundApproachCounts(Array.from({ length: ROUNDS.length }, () => 0));
    autoStartNextRoundRef.current = false;

    if (roundIndex !== 0) {
      setRoundIndex(0);
      return;
    }

    setupRound(false);
    setStatus("5 raundlu chaos başladı. Start bas.");
  };

  const startRun = () => {
    setupRound(true);
  };

  const restartCurrentRound = () => {
    setupRound(false);
  };

  useEffect(() => {
    setupRound(autoStartNextRoundRef.current);
    autoStartNextRoundRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

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
    const tick = () => {
      if (started && !won && !dead) {
        const player = playerRef.current;
        const now = Date.now();

        const xDir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
        const movement = controlsInverted ? -xDir : xDir;

        player.vx = movement * round.moveSpeed + (round.windX ?? 0);

        if (keysRef.current.up && player.onGround) {
          player.vy = round.jump;
          player.onGround = false;
        }

        player.vy = Math.min(14, player.vy + round.gravity);

        const prevY = player.y;
        let nextX = player.x + player.vx;
        let nextY = player.y + player.vy;
        let nextOnGround = false;

        nextX = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, nextX));

        const fakeStillSolid =
          round.fakePlatformId === undefined ||
          !fakeBrokenRef.current ||
          (fakeBrokenAtRef.current !== null && now - fakeBrokenAtRef.current < (round.fakeSupportMs ?? 500));

        const activePlatforms = round.platforms
          .filter((platform) => (platform.id === round.fakePlatformId ? fakeStillSolid : true))
          .map((platform) => {
            if (platform.id === round.fakePlatformId) {
              return { ...platform, y: platform.y + fakeDropRef.current };
            }
            return platform;
          });

        for (const platform of activePlatforms) {
          const prevBottom = prevY + PLAYER_SIZE;
          const nextBottom = nextY + PLAYER_SIZE;
          const fallingOnto = player.vy >= 0 && prevBottom <= platform.y && nextBottom >= platform.y;
          const overlapX = nextX + PLAYER_SIZE > platform.x && nextX < platform.x + platform.w;
          const standingOnTop =
            player.vy >= 0 &&
            overlapX &&
            Math.abs(prevBottom - platform.y) <= PLATFORM_SNAP_TOLERANCE;

          if ((fallingOnto && overlapX) || standingOnTop) {
            nextY = platform.y - PLAYER_SIZE;
            player.vy = 0;
            nextOnGround = true;

            if (platform.id === round.fakePlatformId && !fakeBrokenRef.current) {
              fakeBrokenRef.current = true;
              fakeBrokenAtRef.current = now;
              setFakeBroken(true);
            }
          }
        }

        if (player.vy >= 0 && prevY + PLAYER_SIZE <= FLOOR_Y && nextY + PLAYER_SIZE >= FLOOR_Y) {
          nextY = FLOOR_Y - PLAYER_SIZE;
          player.vy = 0;
          nextOnGround = true;
        }

        const canDropFake =
          fakeBrokenAtRef.current !== null && now - fakeBrokenAtRef.current >= (round.fakeSupportMs ?? 500);
        if (fakeBrokenRef.current && canDropFake && fakeDropRef.current < 140) {
          fakeDropRef.current += 4.2;
          setFakeDrop(fakeDropRef.current);
        }

        if (round.fallingHazards) {
          if (hazardSpawnAtRef.current === 0 || now - hazardSpawnAtRef.current > 850) {
            hazardSpawnAtRef.current = now;
            const size = 14 + Math.floor(Math.random() * 9);
            hazardRef.current = [
              ...hazardRef.current,
              {
                id: hazardIdRef.current,
                x: 40 + Math.random() * (WORLD_WIDTH - 80),
                y: -size,
                size,
                speed: 2.7 + Math.random() * 1.9,
              },
            ];
            hazardIdRef.current += 1;
          }

          hazardRef.current = hazardRef.current
            .map((hazard) => ({
              ...hazard,
              y: hazard.y + hazard.speed,
            }))
            .filter((hazard) => hazard.y < WORLD_HEIGHT + 20);

          setHazardView(hazardRef.current);
        } else if (hazardRef.current.length > 0) {
          hazardRef.current = [];
          setHazardView([]);
        }

        if (round.teleportDoorDistance && now >= doorCooldownUntilRef.current) {
          const playerCenterX = nextX + PLAYER_SIZE / 2;
          const playerCenterY = nextY + PLAYER_SIZE / 2;
          const doorCenterX = doorRef.current.x + doorRef.current.w / 2;
          const doorCenterY = doorRef.current.y + doorRef.current.h / 2;

          const distance = Math.hypot(playerCenterX - doorCenterX, playerCenterY - doorCenterY);
          const effectiveTeleportDistance = isRound4Mercy ? 76 : round.teleportDoorDistance;
          const minTeleportDistance = isRound4Mercy ? 70 : 52;
          const teleportCooldown = isRound4Mercy ? 1300 : 420;

          if (distance < effectiveTeleportDistance && distance > minTeleportDistance) {
            if (round.id === 4) {
              const nextApproachCount = (roundApproachCounts[roundIndex] ?? 0) + 1;
              setRoundApproachCounts((prev) => {
                const next = [...prev];
                next[roundIndex] = nextApproachCount;
                return next;
              });

              if (nextApproachCount === 24) {
                setStatus("Raund 4: 24 yaxınlaşmadan sonra mercy unlock açıldı. Qapı indi daha yavaş qaçır.");
              }
            }

            doorCooldownUntilRef.current = now + teleportCooldown;
            randomizeDoor(nextX, nextY);
          }
        }

        const playerRight = nextX + PLAYER_SIZE;
        const playerBottom = nextY + PLAYER_SIZE;

        let hitHazard = false;
        for (const hazard of hazardRef.current) {
          const overlap =
            playerRight > hazard.x &&
            nextX < hazard.x + hazard.size &&
            playerBottom > hazard.y &&
            nextY < hazard.y + hazard.size;

          if (overlap) {
            hitHazard = true;
            break;
          }
        }

        const catchPadding = isRound4Mercy ? 14 : 0;
        const touchesDoor =
          playerRight > doorRef.current.x &&
          nextX < doorRef.current.x + doorRef.current.w + catchPadding &&
          playerBottom > doorRef.current.y &&
          nextY < doorRef.current.y + doorRef.current.h + catchPadding;

        if (touchesDoor) {
          setWon(true);
          setStarted(false);
          clearTimers();

          if (roundIndex >= ROUNDS.length - 1) {
            setStatus("Stage 9-un bütün 5 raundunu keçdin! 🔥");
            window.setTimeout(() => onComplete(), 320);
          } else {
            setStatus(`${round.title} keçildi. Növbəti raunda keçilir...`);
            autoStartNextRoundRef.current = true;
            window.setTimeout(() => {
              setRoundIndex((prev) => prev + 1);
            }, 260);
          }
        }

        if (hitHazard || nextY > WORLD_HEIGHT + 24) {
          setDead(true);
          setStarted(false);
          const nextRoundFailCount = (roundFailCounts[roundIndex] ?? 0) + 1;
          setRoundFailCounts((prev) => {
            const next = [...prev];
            next[roundIndex] = nextRoundFailCount;
            return next;
          });

          setStatus(`${round.title}: uduzdun. Bu raundu yenidən başlat.`);

          clearTimers();
          onFail();
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
      clearTimers();
    };
  }, [
    controlsInverted,
    dead,
    isRound4Mercy,
    onComplete,
    onFail,
    round,
    round4ApproachCount,
    roundApproachCounts,
    roundFailCounts,
    roundIndex,
    started,
    won,
  ]);

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/85 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-black text-zinc-100">Stage 9: Dia Again Rush ({round.title})</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startRun}
            className="rounded-md border border-emerald-400/60 bg-emerald-600/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-200"
          >
            Start
          </button>
          <button
            type="button"
            onClick={restartCurrentRound}
            className="rounded-md border border-zinc-500 bg-zinc-800/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-100"
          >
            Reset Raund
          </button>
          <button
            type="button"
            onClick={resetRun}
            className="rounded-md border border-zinc-500 bg-zinc-800/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-100"
          >
            Reset Hamısı
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-300">{status}</p>

      <div className="relative mx-auto overflow-hidden rounded-xl border border-zinc-700 bg-[linear-gradient(180deg,#0f172a,#101827)]" style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT }}>
        <div className="absolute left-0 bg-zinc-700/80" style={{ top: FLOOR_Y, width: WORLD_WIDTH, height: WORLD_HEIGHT - FLOOR_Y }} />

        {round.platforms.map((platform) => {
          const isFake = platform.id === round.fakePlatformId;
          const y = isFake ? platform.y + fakeDrop : platform.y;
          const hidden = isFake && fakeDrop > 8;

          return (
          <div
            key={`${platform.x}-${platform.y}`}
            className={`absolute rounded-sm border ${
              isFake && fakeBroken ? "border-rose-300/70 bg-rose-500/35" : "border-cyan-300/60 bg-cyan-500/30"
            }`}
            style={{ left: platform.x, top: y, width: platform.w, height: platform.h, opacity: hidden ? 0 : 1 }}
          />
          );
        })}

        {hazardView.map((hazard) => (
          <div
            key={hazard.id}
            className="absolute rounded-sm border border-orange-300/70 bg-orange-400/80 shadow-[0_0_10px_rgba(251,146,60,0.7)]"
            style={{ left: hazard.x, top: hazard.y, width: hazard.size, height: hazard.size }}
          />
        ))}

        <div
          className="absolute border border-emerald-300/70 bg-emerald-500/30"
          style={{ left: doorView.x, top: doorView.y, width: doorView.w, height: doorView.h }}
        >
          <span className="absolute inset-x-0 top-1 text-center text-[10px] font-bold uppercase text-emerald-100">SONA</span>
        </div>

        <div
          className="absolute rounded-[4px] border border-amber-200 bg-amber-300 shadow-[0_0_14px_rgba(253,224,71,0.55)]"
          style={{ left: playerView.x, top: playerView.y, width: PLAYER_SIZE, height: PLAYER_SIZE }}
        />
      </div>
    </section>
  );
}
