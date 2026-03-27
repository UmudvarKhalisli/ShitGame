"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { chaosController } from "@/hooks/chaosController";
import { useChaosController } from "@/hooks/useChaosController";
import { useChaosState } from "@/hooks/useChaosState";

const idleRoasts = [
  "Yatdın? Oyan da! 😴",
  "Ekran da sənə baxıb yoruldu",
  "Bu tempdə saatda 0.3 mərhələ keçərsən",
  "Kompüter özü keçəcək, sən dur yan",
  "...hələ burdasan?",
];

const mistakeRoasts = [
  "Bunu nənəm də səndən yaxşı edərdi 👵",
  "Proqramçı olmaq istəyirdin, deyirdilər",
  "Statistikamıza görə 3 yaşlı uşaqlar bu mərhələni keçib",
  "Əlin var, işlədir onu",
  "Siçanı sındırdın, yoxsa beynini?",
];

const stageRoasts: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, string> = {
  1: "Boş-Beşə girdin, vaxt da sənə güldü ⏳",
  2: "5 düymə gördün, birini də görmədin",
  3: "Düymə qaçır, sən də qaçırsan 🏃",
  4: "Adını da unudubsan görəsən • siçan itə bilər ;) (bug deyil)",
  5: "99%... 99%... hələ 99%... tanış gəlir?",
  6: "Popup bağlamaq istəyirsən? Çox şirin arzudur",
  7: "Qaranlıq oyunu başladı. İşıq var, amma etibar yoxdur",
  8: "Yaddaş oyunu başladı: rəngə yox, panikaya baxırsan",
  9: "Məntiq var, amma beynin artıq ona inanmır",
  10: "Boss fight-a çatdın. İndi beyin səni test edir",
  11: "Yeni level gəldi, amma barmaqların hələ köhnə rejimdədir",
  12: "SONA ÇAT qapısı sənə çatdırmaz. Sən onu aldatmalısan",
};

const NORMAL_ROAST_COOLDOWN_MS = 8000;
const AGGRESSIVE_ROAST_COOLDOWN_MS = 5000;
const ROAST_VISIBILITY_MS = 4000;
const IDLE_TRIGGER_MS = 10000;

export default function RoasterWidget() {
  const { gameState } = useChaosState();
  const {
    state: { roasterMode },
  } = useChaosController();

  const [idleTime, setIdleTime] = useState(0);
  const [message, setMessage] = useState("");
  const [isHovering, setIsHovering] = useState(false);

  const lastInteractionRef = useRef(Date.now());
  const lastRoastAtRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);
  const previousAttemptsRef = useRef(gameState.attempts);
  const previousStageRef = useRef(gameState.currentStage);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showRoast = useCallback((text: string) => {
    const now = Date.now();
    const cooldownMs =
      roasterMode === "aggressive" ? AGGRESSIVE_ROAST_COOLDOWN_MS : NORMAL_ROAST_COOLDOWN_MS;

    if (now - lastRoastAtRef.current < cooldownMs) {
      return false;
    }

    lastRoastAtRef.current = now;
    setMessage(text);
    clearHideTimer();

    hideTimerRef.current = window.setTimeout(() => {
      setMessage("");
    }, ROAST_VISIBILITY_MS);

    return true;
  }, [clearHideTimer, roasterMode]);

  useEffect(() => {
    const onInteraction = () => {
      lastInteractionRef.current = Date.now();
      setIdleTime((prev) => (prev === 0 ? prev : 0));
    };

    const events: Array<keyof WindowEventMap> = ["mousemove", "click", "keydown"];
    events.forEach((eventName) => {
      window.addEventListener(eventName, onInteraction, { passive: true });
    });

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      setIdleTime(now - lastInteractionRef.current);
    }, 500);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, onInteraction);
      });
      window.clearInterval(intervalId);
      clearHideTimer();
    };
  }, [clearHideTimer]);

  useEffect(() => {
    if (idleTime < IDLE_TRIGGER_MS) {
      return;
    }

    const roast = idleRoasts[Math.floor(Math.random() * idleRoasts.length)];
    if (showRoast(roast)) {
      lastInteractionRef.current = Date.now();
      setIdleTime(0);
    }
  }, [idleTime, showRoast]);

  useEffect(() => {
    if (gameState.attempts > previousAttemptsRef.current) {
      const roast = mistakeRoasts[Math.floor(Math.random() * mistakeRoasts.length)];
      showRoast(roast);
    }

    previousAttemptsRef.current = gameState.attempts;
  }, [gameState.attempts, showRoast]);

  useEffect(() => {
    const previousStage = previousStageRef.current;
    if (gameState.currentStage !== previousStage && gameState.currentStage !== "complete") {
      showRoast(stageRoasts[gameState.currentStage]);
    }

    previousStageRef.current = gameState.currentStage;
  }, [gameState.currentStage, showRoast]);

  useEffect(() => {
    const unregister = chaosController.registerTriggerRoast((externalMessage) => {
      showRoast(externalMessage);
    });

    return unregister;
  }, [showRoast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, x: 24, scale: 0.82 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 18 }}
      className="fixed right-5 top-5 z-[95]"
    >
      <div className="relative flex flex-col items-end gap-3">
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="max-w-[260px] rounded-2xl border border-zinc-700 bg-zinc-900/95 px-4 py-3 text-sm font-medium text-zinc-100 shadow-xl"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          aria-label="Roaster widget"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="h-14 w-14 rounded-full border border-rose-400/40 bg-gradient-to-br from-zinc-800 to-zinc-900 text-2xl shadow-lg"
        >
          <span className={isHovering ? "inline-block roaster-wink" : "inline-block"}>
            {isHovering ? "😉" : "😈"}
          </span>
        </motion.button>

      </div>
    </motion.div>
  );
}

