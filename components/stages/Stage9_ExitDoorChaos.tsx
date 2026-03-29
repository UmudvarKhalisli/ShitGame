"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const WORLD_WIDTH = 760;
const WORLD_HEIGHT = 320;
const PLAYER_SIZE = 22;
const MOVE_SPEED = 4.4;

type Door = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function Stage9_ExitDoorChaos({
  onComplete,
  onFail,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const REQUIRED_CATCHES = 3;
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [catchCount, setCatchCount] = useState(0);
  const [status, setStatus] = useState("Qapını tutmağa çalış. Yaxınlaşanda qaçacaq.");

  const [playerView, setPlayerView] = useState({ x: 24, y: WORLD_HEIGHT / 2 - PLAYER_SIZE / 2 });
  const [doorView, setDoorView] = useState<Door>({ x: WORLD_WIDTH / 2 - 64, y: WORLD_HEIGHT / 2 - 30, width: 128, height: 60 });
  const [doorScale, setDoorScale] = useState(1);

  const keysRef = useRef({ left: false, right: false, up: false, down: false });
  const rafRef = useRef<number | null>(null);
  const playerRef = useRef({ x: 24, y: WORLD_HEIGHT / 2 - PLAYER_SIZE / 2 });
  const doorRef = useRef<Door>({ x: WORLD_WIDTH / 2 - 64, y: WORLD_HEIGHT / 2 - 30, width: 128, height: 60 });
  const cooldownUntilRef = useRef(0);
  const noTeleportUntilRef = useRef(0);
  const isFlippingRef = useRef(false);
  const teleportBurstRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const musicIntervalRef = useRef<number | null>(null);
  const musicStepRef = useRef(0);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  };

  const setControl = (key: "left" | "right" | "up" | "down", pressed: boolean) => {
    keysRef.current[key] = pressed;
  };

  const stopMusic = useCallback(() => {
    if (musicIntervalRef.current !== null) {
      window.clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startMusic = useCallback(() => {
    stopMusic();

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
      const notes = [622, 698, 784, 932, 831, 740, 622, 740];

      musicIntervalRef.current = window.setInterval(() => {
        const active = audioContextRef.current;
        if (!active) {
          return;
        }

        const now = active.currentTime;
        const step = musicStepRef.current;
        const freq = notes[step % notes.length] + ((step % 3) * 26 - 26);

        const osc = active.createOscillator();
        const gain = active.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + 0.04);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

        osc.connect(gain);
        gain.connect(active.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        musicStepRef.current += 1;
      }, 90);
    } catch {
      stopMusic();
    }
  }, [stopMusic]);

  const setDoor = (door: Door) => {
    doorRef.current = door;
    setDoorView(door);
  };

  const randomDoor = useCallback((px: number, py: number) => {
    const width = doorRef.current.width;
    const height = doorRef.current.height;
    const minX = 14;
    const minY = 14;
    const maxX = WORLD_WIDTH - width - 14;
    const maxY = WORLD_HEIGHT - height - 14;

    for (let i = 0; i < 10; i += 1) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);
      const dx = x + width / 2 - (px + PLAYER_SIZE / 2);
      const dy = y + height / 2 - (py + PLAYER_SIZE / 2);
      if (Math.hypot(dx, dy) > 150) {
        setDoor({ x, y, width, height });
        return;
      }
    }
  }, []);

  const reset = useCallback(() => {
    clearTimeouts();
    stopMusic();
    setStarted(false);
    setWon(false);
    setCatchCount(0);
    setStatus("Qapını tutmağa çalış. Yaxınlaşanda qaçacaq.");
    playerRef.current = { x: 24, y: WORLD_HEIGHT / 2 - PLAYER_SIZE / 2 };
    setPlayerView(playerRef.current);
    const initialDoor = { x: WORLD_WIDTH / 2 - 64, y: WORLD_HEIGHT / 2 - 30, width: 128, height: 60 };
    setDoor(initialDoor);
    cooldownUntilRef.current = 0;
    noTeleportUntilRef.current = 0;
    isFlippingRef.current = false;
    teleportBurstRef.current = 0;
    setDoorScale(1);
  }, [stopMusic]);

  const start = () => {
    reset();
    setStarted(true);
    setStatus("Qapını 3 dəfə tutmalısan. Hər tutuşdan sonra çətinləşəcək.");
    startMusic();
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
      if (key === "arrowup" || key === "w") {
        keysRef.current.up = true;
      }
      if (key === "arrowdown" || key === "s") {
        keysRef.current.down = true;
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
      if (key === "arrowup" || key === "w") {
        keysRef.current.up = false;
      }
      if (key === "arrowdown" || key === "s") {
        keysRef.current.down = false;
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
      if (started && !won) {
        const now = Date.now();
        const player = playerRef.current;
        const difficultyLevel = catchCount;
        const catchRadius = difficultyLevel === 0 ? 58 : difficultyLevel === 1 ? 48 : 40;
        const teleportNearMax = difficultyLevel === 0 ? 172 : difficultyLevel === 1 ? 196 : 220;
        const teleportNearMin = difficultyLevel === 0 ? 88 : difficultyLevel === 1 ? 76 : 64;
        const teleportCooldown = difficultyLevel === 0 ? 460 : difficultyLevel === 1 ? 360 : 300;
        const noTeleportWindow = difficultyLevel === 0 ? 1300 : difficultyLevel === 1 ? 980 : 720;

        const xDir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
        const yDir = (keysRef.current.down ? 1 : 0) - (keysRef.current.up ? 1 : 0);

        player.x = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, player.x + xDir * MOVE_SPEED));
        player.y = Math.max(0, Math.min(WORLD_HEIGHT - PLAYER_SIZE, player.y + yDir * MOVE_SPEED));

        setPlayerView({ x: player.x, y: player.y });

        const door = doorRef.current;
        const playerCx = player.x + PLAYER_SIZE / 2;
        const playerCy = player.y + PLAYER_SIZE / 2;
        const doorCx = door.x + door.width / 2;
        const doorCy = door.y + door.height / 2;
        const dist = Math.hypot(playerCx - doorCx, playerCy - doorCy);

        if (dist < catchRadius && !isFlippingRef.current) {
          const nextCatchCount = catchCount + 1;

          if (nextCatchCount >= REQUIRED_CATCHES) {
            setCatchCount(nextCatchCount);
            setWon(true);
            setStarted(false);
            setStatus("3/3 tutdun! Bütün tutuşlar tamamlandı.");
            stopMusic();
            onComplete();
          } else {
            setCatchCount(nextCatchCount);
            setStatus(`${nextCatchCount}/${REQUIRED_CATCHES} tutuş. İndi daha çətindir...`);

            // Reposition door after each successful catch so player must chase again.
            cooldownUntilRef.current = now + 480;
            noTeleportUntilRef.current = now + 620;
            teleportBurstRef.current = 0;
            randomDoor(player.x, player.y);
          }
        } else if (
          dist < teleportNearMax &&
          dist > teleportNearMin &&
          now >= cooldownUntilRef.current &&
          now >= noTeleportUntilRef.current &&
          !isFlippingRef.current
        ) {
          cooldownUntilRef.current = now + teleportCooldown;
          teleportBurstRef.current += 1;
          randomDoor(player.x, player.y);

          if (teleportBurstRef.current >= 5) {
            teleportBurstRef.current = 0;
            noTeleportUntilRef.current = now + noTeleportWindow;
            setStatus("Qapı yoruldu... qısa şans pəncərən var!");
          }
        }

        const nearLeft = door.x <= 12;
        const nearRight = door.x + door.width >= WORLD_WIDTH - 12;
        const nearTop = door.y <= 12;
        const nearBottom = door.y + door.height >= WORLD_HEIGHT - 12;
        const cornered = (nearLeft || nearRight) && (nearTop || nearBottom);

        if (cornered && dist < 76 && !isFlippingRef.current && now >= cooldownUntilRef.current) {
          isFlippingRef.current = true;
          cooldownUntilRef.current = now + 800;
          setDoorScale(0);

          const flipId = window.setTimeout(() => {
            const newX = nearLeft ? WORLD_WIDTH - door.width - 12 : 12;
            const newY = nearTop ? WORLD_HEIGHT - door.height - 12 : 12;
            setDoor({ ...door, x: newX, y: newY });

            const appearId = window.setTimeout(() => {
              setDoorScale(1);
              isFlippingRef.current = false;
            }, 90);
            timeoutsRef.current.push(appearId);
          }, 150);

          timeoutsRef.current.push(flipId);
        }

        if (now > cooldownUntilRef.current + 12000 && !won) {
          setStatus("Qapı səni troll edir... daha aqressiv yaxınlaş.");
          onFail();
          cooldownUntilRef.current = now;
        }
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      clearTimeouts();
      stopMusic();
    };
  }, [catchCount, onComplete, onFail, randomDoor, started, stopMusic, won]);

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/85 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-black text-zinc-100">Qaçan Qapı Xaosu</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={start}
            className="rounded-md border border-violet-400/60 bg-violet-600/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-200"
          >
            Start
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-zinc-500 bg-zinc-800/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-100"
          >
            Reset
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-300">{status}</p>
      <p className="text-xs font-semibold text-rose-200">Tutuş: {catchCount}/{REQUIRED_CATCHES}</p>

      <div className="mx-auto w-full overflow-x-auto pb-1">
        <div
          className="relative mx-auto min-w-[760px] overflow-hidden rounded-xl border border-zinc-700 bg-[linear-gradient(180deg,#131521,#101826)]"
          style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT }}
        >
          <div
            className="absolute rounded-[4px] border border-amber-200 bg-amber-300 shadow-[0_0_14px_rgba(253,224,71,0.55)]"
            style={{ left: playerView.x, top: playerView.y, width: PLAYER_SIZE, height: PLAYER_SIZE }}
          />

          <motion.div
            className="absolute border border-rose-300/80 bg-rose-500/20"
            animate={{ x: doorView.x, y: doorView.y, scale: doorScale }}
            transition={{ type: "spring", stiffness: 260, damping: 20, mass: 0.55 }}
            style={{ left: 0, top: 0, width: doorView.width, height: doorView.height, transformOrigin: "center center" }}
          >
            <p className="pt-2 text-center text-xs font-black uppercase tracking-[0.2em] text-rose-200">QAPI</p>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:hidden">
        <div className="col-start-2">
          <button
            type="button"
            onTouchStart={() => setControl("up", true)}
            onTouchEnd={() => setControl("up", false)}
            onTouchCancel={() => setControl("up", false)}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-900/85 px-3 py-3 text-sm font-black text-zinc-100"
          >
            Yuxarı
          </button>
        </div>
        <button
          type="button"
          onTouchStart={() => setControl("left", true)}
          onTouchEnd={() => setControl("left", false)}
          onTouchCancel={() => setControl("left", false)}
          className="rounded-lg border border-zinc-600 bg-zinc-900/85 px-3 py-3 text-sm font-black text-zinc-100"
        >
          Sol
        </button>
        <button
          type="button"
          onTouchStart={() => setControl("down", true)}
          onTouchEnd={() => setControl("down", false)}
          onTouchCancel={() => setControl("down", false)}
          className="rounded-lg border border-zinc-600 bg-zinc-900/85 px-3 py-3 text-sm font-black text-zinc-100"
        >
          Aşağı
        </button>
        <button
          type="button"
          onTouchStart={() => setControl("right", true)}
          onTouchEnd={() => setControl("right", false)}
          onTouchCancel={() => setControl("right", false)}
          className="rounded-lg border border-zinc-600 bg-zinc-900/85 px-3 py-3 text-sm font-black text-zinc-100"
        >
          Sağ
        </button>
      </div>
    </section>
  );
}


