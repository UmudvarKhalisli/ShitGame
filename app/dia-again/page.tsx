"use client";

import { useEffect, useRef, useState } from "react";

type Platform = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fake?: boolean;
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
const PLAYER_SIZE = 28;
const MOVE_SPEED = 4.4;
const JUMP_SPEED = -12.5;
const GRAVITY = 0.72;
const MAX_FALL = 15;

const START_X = 46;
const START_Y = WORLD_HEIGHT - 70 - PLAYER_SIZE;
const FLOOR_Y = WORLD_HEIGHT - 32;

const GATE = {
  x: 838,
  y: 232,
  width: 38,
  height: 98,
};

const SPIKES = {
  x: GATE.x - 6,
  width: GATE.width + 12,
  height: 34,
  hiddenY: GATE.y - 90,
  landedY: GATE.y - 8,
};

const PLATFORMS: Platform[] = [
  { id: 1, x: 120, y: 390, width: 150, height: 16 },
  { id: 2, x: 320, y: 336, width: 145, height: 16, fake: true },
  { id: 3, x: 535, y: 292, width: 135, height: 16 },
  { id: 4, x: 715, y: 256, width: 110, height: 16 },
];

export default function DiaAgainPage() {
  const [started, setStarted] = useState(false);
  const [controlsInverted, setControlsInverted] = useState(false);
  const [dead, setDead] = useState(false);
  const [won, setWon] = useState(false);
  const [deathCount, setDeathCount] = useState(0);

  const [playerView, setPlayerView] = useState({ x: START_X, y: START_Y });
  const [fakeBroken, setFakeBroken] = useState(false);
  const [fakePlatformDrop, setFakePlatformDrop] = useState(0);

  const [spikesTriggered, setSpikesTriggered] = useState(false);
  const [spikesY, setSpikesY] = useState(SPIKES.hiddenY);

  const keysRef = useRef({ left: false, right: false, up: false });
  const rafRef = useRef<number | null>(null);
  const invertTimeoutRef = useRef<number | null>(null);

  const playerRef = useRef<PlayerState>({
    x: START_X,
    y: START_Y,
    vx: 0,
    vy: 0,
    onGround: true,
  });

  const fakeDropRef = useRef(0);
  const fakeBrokenRef = useRef(false);
  const spikesTriggeredRef = useRef(false);
  const spikesYRef = useRef(SPIKES.hiddenY);

  const clearTimer = () => {
    if (invertTimeoutRef.current !== null) {
      window.clearTimeout(invertTimeoutRef.current);
      invertTimeoutRef.current = null;
    }
  };

  const hardReset = () => {
    clearTimer();
    setControlsInverted(false);
    setDead(false);
    setWon(false);
    setStarted(false);

    setFakeBroken(false);
    setFakePlatformDrop(0);
    fakeBrokenRef.current = false;
    fakeDropRef.current = 0;

    setSpikesTriggered(false);
    setSpikesY(SPIKES.hiddenY);
    spikesTriggeredRef.current = false;
    spikesYRef.current = SPIKES.hiddenY;

    keysRef.current = { left: false, right: false, up: false };

    playerRef.current = {
      x: START_X,
      y: START_Y,
      vx: 0,
      vy: 0,
      onGround: true,
    };

    setPlayerView({ x: START_X, y: START_Y });
  };

  const startRun = () => {
    clearTimer();

    setDead(false);
    setWon(false);
    setStarted(true);
    setControlsInverted(false);

    setFakeBroken(false);
    setFakePlatformDrop(0);
    fakeBrokenRef.current = false;
    fakeDropRef.current = 0;

    setSpikesTriggered(false);
    setSpikesY(SPIKES.hiddenY);
    spikesTriggeredRef.current = false;
    spikesYRef.current = SPIKES.hiddenY;

    playerRef.current = {
      x: START_X,
      y: START_Y,
      vx: 0,
      vy: 0,
      onGround: true,
    };
    setPlayerView({ x: START_X, y: START_Y });

    invertTimeoutRef.current = window.setTimeout(() => {
      setControlsInverted(true);
    }, 10000);
  };

  const triggerDeath = () => {
    if (dead || won) {
      return;
    }

    setDead(true);
    setDeathCount((prev) => prev + 1);
    clearTimer();
  };

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
      const player = playerRef.current;

      if (started && !dead && !won) {
        const leftPressed = keysRef.current.left;
        const rightPressed = keysRef.current.right;
        const xDir =
          (rightPressed ? 1 : 0) - (leftPressed ? 1 : 0);
        const movement = controlsInverted ? -xDir : xDir;

        player.vx = movement * MOVE_SPEED;

        if (keysRef.current.up && player.onGround) {
          player.vy = JUMP_SPEED;
          player.onGround = false;
        }

        player.vy = Math.min(MAX_FALL, player.vy + GRAVITY);

        const prevY = player.y;
        let nextX = player.x + player.vx;
        let nextY = player.y + player.vy;
        let nextOnGround = false;

        nextX = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, nextX));

        const activePlatforms = PLATFORMS.filter((platform) => {
          if (!platform.fake) {
            return true;
          }
          return !fakeBrokenRef.current;
        }).map((platform) => {
          if (platform.fake) {
            return {
              ...platform,
              y: platform.y + fakeDropRef.current,
            };
          }
          return platform;
        });

        for (const platform of activePlatforms) {
          const prevBottom = prevY + PLAYER_SIZE;
          const nextBottom = nextY + PLAYER_SIZE;

          const isFallingOntoPlatform =
            player.vy >= 0 && prevBottom <= platform.y && nextBottom >= platform.y;

          const overlapsX =
            nextX + PLAYER_SIZE > platform.x && nextX < platform.x + platform.width;

          if (isFallingOntoPlatform && overlapsX) {
            nextY = platform.y - PLAYER_SIZE;
            player.vy = 0;
            nextOnGround = true;

            if (platform.fake && !fakeBrokenRef.current) {
              fakeBrokenRef.current = true;
              setFakeBroken(true);
            }
          }
        }

        const prevFloorBottom = prevY + PLAYER_SIZE;
        const nextFloorBottom = nextY + PLAYER_SIZE;
        if (player.vy >= 0 && prevFloorBottom <= FLOOR_Y && nextFloorBottom >= FLOOR_Y) {
          nextY = FLOOR_Y - PLAYER_SIZE;
          player.vy = 0;
          nextOnGround = true;
        }

        if (fakeBrokenRef.current && fakeDropRef.current < 140) {
          fakeDropRef.current += 4.2;
          setFakePlatformDrop(fakeDropRef.current);
        }

        const playerCenterX = nextX + PLAYER_SIZE / 2;
        if (!spikesTriggeredRef.current && Math.abs(playerCenterX - (GATE.x + GATE.width / 2)) <= 50) {
          spikesTriggeredRef.current = true;
          setSpikesTriggered(true);
        }

        if (spikesTriggeredRef.current && spikesYRef.current < SPIKES.landedY) {
          spikesYRef.current = Math.min(SPIKES.landedY, spikesYRef.current + 8);
          setSpikesY(spikesYRef.current);
        }

        const playerRight = nextX + PLAYER_SIZE;
        const playerBottom = nextY + PLAYER_SIZE;

        const spikesTop = spikesYRef.current;
        const spikesBottom = spikesYRef.current + SPIKES.height;
        const spikesRight = SPIKES.x + SPIKES.width;
        const hitsSpikes =
          playerRight > SPIKES.x &&
          nextX < spikesRight &&
          playerBottom > spikesTop &&
          nextY < spikesBottom;

        if (hitsSpikes || nextY > WORLD_HEIGHT + 40) {
          triggerDeath();
        }

        const touchingGate =
          playerRight > GATE.x &&
          nextX < GATE.x + GATE.width &&
          playerBottom > GATE.y &&
          nextY < GATE.y + GATE.height;

        if (touchingGate && !dead) {
          clearTimer();
          setWon(true);
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
    };
  }, [started, dead, won, controlsInverted]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl border border-red-500/35 bg-zinc-950/95 p-4 shadow-[0_0_40px_rgba(239,68,68,0.12)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-[0.18em] text-red-300 sm:text-3xl">
              Dia Again Mini Level
            </h1>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
              WASD və ya ox düymələri ilə hərəkət et. 10 saniyədən sonra sağ-sol idarəsi tərsinə çevriləcək.
            </p>
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
              onClick={hardReset}
              className="rounded-md border border-zinc-400/50 bg-zinc-700/25 px-4 py-2 text-sm font-bold uppercase tracking-[0.14em] text-zinc-100 transition hover:bg-zinc-600/35"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm">
          <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200">
            Status: {won ? "Qalibiyyət" : dead ? "Öldün" : started ? "Qaçırsan" : "Başlamağa hazır"}
          </span>
          <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200">
            Tərs idarəetmə: {controlsInverted ? "Aktiv" : "Hələ normal"}
          </span>
          <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200">
            Ölüm sayı: {deathCount}
          </span>
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

          {PLATFORMS.map((platform) => {
            const isFake = Boolean(platform.fake);
            const platformY = isFake ? platform.y + fakePlatformDrop : platform.y;
            const hidden = isFake && fakeBroken;

            return (
              <div
                key={platform.id}
                className="absolute rounded-sm border border-cyan-300/50 bg-cyan-400/30 transition-all duration-300"
                style={{
                  left: platform.x,
                  top: platformY,
                  width: platform.width,
                  height: platform.height,
                  opacity: hidden ? 0 : 1,
                }}
              />
            );
          })}

          <div
            className="absolute border border-emerald-300/70 bg-emerald-500/25"
            style={{ left: GATE.x, top: GATE.y, width: GATE.width, height: GATE.height }}
          >
            <div className="absolute inset-x-0 top-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
              Qapı
            </div>
          </div>

          <div
            className="absolute bg-rose-500/95 shadow-[0_0_18px_rgba(244,63,94,0.75)] transition-all duration-100"
            style={{
              left: SPIKES.x,
              top: spikesY,
              width: SPIKES.width,
              height: SPIKES.height,
              clipPath: "polygon(0 100%,10% 0,20% 100%,30% 0,40% 100%,50% 0,60% 100%,70% 0,80% 100%,90% 0,100% 100%)",
              opacity: spikesTriggered ? 1 : 0,
            }}
          />

          <div
            className="absolute rounded-[4px] border border-amber-200 bg-amber-300 shadow-[0_0_18px_rgba(253,224,71,0.6)]"
            style={{ left: playerView.x, top: playerView.y, width: PLAYER_SIZE, height: PLAYER_SIZE }}
          />

          {!started && (
            <div className="absolute inset-0 grid place-items-center bg-zinc-950/55">
              <p className="text-center text-lg font-black uppercase tracking-[0.2em] text-zinc-100">
                Start düyməsini bas və qaç
              </p>
            </div>
          )}

          {won && (
            <div className="absolute inset-0 grid place-items-center bg-emerald-950/45">
              <p className="text-center text-3xl font-black uppercase tracking-[0.2em] text-emerald-300">
                Qalibiyyət!
              </p>
            </div>
          )}

          {dead && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/70">
              <div className="text-center">
                <p className="death-glitch text-3xl font-black uppercase text-red-500 sm:text-5xl">
                  Yenə ölməyi bacardın?
                </p>
                <button
                  type="button"
                  onClick={hardReset}
                  className="mt-5 rounded-md border border-red-400/70 bg-red-600/20 px-5 py-2 text-sm font-bold uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-600/35"
                >
                  Ən başa qayıt
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
