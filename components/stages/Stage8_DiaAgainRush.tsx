"use client";

import { useEffect, useRef, useState } from "react";

const WORLD_WIDTH = 760;
const WORLD_HEIGHT = 320;
const FLOOR_Y = WORLD_HEIGHT - 24;
const PLAYER_SIZE = 24;
const START_X = 24;
const START_Y = FLOOR_Y - PLAYER_SIZE;

const PLATFORMS = [
  { x: 112, y: 252, w: 130, h: 12 },
  { x: 286, y: 224, w: 120, h: 12 },
  { x: 454, y: 192, w: 106, h: 12 },
  { x: 600, y: 166, w: 86, h: 12 },
];

const DOOR = { x: 704, y: 108, w: 32, h: 76 };

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
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [dead, setDead] = useState(false);
  const [phase, setPhase] = useState<"heavy" | "hyper">("heavy");
  const [controlsInverted, setControlsInverted] = useState(false);
  const [status, setStatus] = useState("Start bas: əvvəl ağır jump, sonra hiper jump.");

  const [playerView, setPlayerView] = useState({ x: START_X, y: START_Y });

  const playerRef = useRef<Player>({ x: START_X, y: START_Y, vx: 0, vy: 0, onGround: true });
  const keysRef = useRef({ left: false, right: false, up: false });
  const rafRef = useRef<number | null>(null);
  const phaseTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (phaseTimerRef.current !== null) {
      window.clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  };

  const resetRun = () => {
    clearTimers();
    setStarted(false);
    setWon(false);
    setDead(false);
    setPhase("heavy");
    setControlsInverted(false);
    setStatus("Start bas: əvvəl ağır jump, sonra hiper jump.");
    keysRef.current = { left: false, right: false, up: false };
    playerRef.current = { x: START_X, y: START_Y, vx: 0, vy: 0, onGround: true };
    setPlayerView({ x: START_X, y: START_Y });
  };

  const startRun = () => {
    resetRun();
    setStarted(true);
    setStatus("Ağır jump aktivdir. Platformaları ritmlə keç.");

    phaseTimerRef.current = window.setTimeout(() => {
      setPhase("hyper");
      setControlsInverted(true);
      setStatus("Hiper jump + tərs idarəetmə aktiv oldu. Beyin yansın 🔥");
    }, 7000);
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
      if (started && !won && !dead) {
        const player = playerRef.current;
        const baseSpeed = phase === "heavy" ? 4 : 4.8;
        const jump = phase === "heavy" ? -8.8 : -16.4;
        const gravity = phase === "heavy" ? 0.9 : 0.62;

        const xDir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
        const movement = controlsInverted ? -xDir : xDir;

        player.vx = movement * baseSpeed;

        if (keysRef.current.up && player.onGround) {
          player.vy = jump;
          player.onGround = false;
        }

        player.vy = Math.min(14, player.vy + gravity);

        const prevY = player.y;
        let nextX = player.x + player.vx;
        let nextY = player.y + player.vy;
        let nextOnGround = false;

        nextX = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, nextX));

        for (const platform of PLATFORMS) {
          const prevBottom = prevY + PLAYER_SIZE;
          const nextBottom = nextY + PLAYER_SIZE;
          const fallingOnto = player.vy >= 0 && prevBottom <= platform.y && nextBottom >= platform.y;
          const overlapX = nextX + PLAYER_SIZE > platform.x && nextX < platform.x + platform.w;

          if (fallingOnto && overlapX) {
            nextY = platform.y - PLAYER_SIZE;
            player.vy = 0;
            nextOnGround = true;
          }
        }

        if (player.vy >= 0 && prevY + PLAYER_SIZE <= FLOOR_Y && nextY + PLAYER_SIZE >= FLOOR_Y) {
          nextY = FLOOR_Y - PLAYER_SIZE;
          player.vy = 0;
          nextOnGround = true;
        }

        const playerRight = nextX + PLAYER_SIZE;
        const playerBottom = nextY + PLAYER_SIZE;
        const touchesDoor =
          playerRight > DOOR.x && nextX < DOOR.x + DOOR.w && playerBottom > DOOR.y && nextY < DOOR.y + DOOR.h;

        if (touchesDoor) {
          setWon(true);
          setStarted(false);
          setStatus("Mərhələ 9 keçildi. Növbəti qapı oyunu səni gözləyir.");
          clearTimers();
          window.setTimeout(() => onComplete(), 320);
        }

        if (nextY > WORLD_HEIGHT + 24) {
          setDead(true);
          setStarted(false);
          setStatus("Yıxıldın. Yenidən cəhd et.");
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
  }, [controlsInverted, dead, onComplete, onFail, phase, started, won]);

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/85 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-black text-zinc-100">Stage 9: Dia Again Rush</h2>
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
            onClick={resetRun}
            className="rounded-md border border-zinc-500 bg-zinc-800/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-100"
          >
            Reset
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-300">{status}</p>

      <div className="relative mx-auto overflow-hidden rounded-xl border border-zinc-700 bg-[linear-gradient(180deg,#0f172a,#101827)]" style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT }}>
        <div className="absolute left-0 bg-zinc-700/80" style={{ top: FLOOR_Y, width: WORLD_WIDTH, height: WORLD_HEIGHT - FLOOR_Y }} />

        {PLATFORMS.map((platform) => (
          <div
            key={`${platform.x}-${platform.y}`}
            className="absolute rounded-sm border border-cyan-300/60 bg-cyan-500/30"
            style={{ left: platform.x, top: platform.y, width: platform.w, height: platform.h }}
          />
        ))}

        <div
          className="absolute border border-emerald-300/70 bg-emerald-500/30"
          style={{ left: DOOR.x, top: DOOR.y, width: DOOR.w, height: DOOR.h }}
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
