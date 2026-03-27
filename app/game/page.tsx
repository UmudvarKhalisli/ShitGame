"use client";

import { AnimatePresence, motion } from "framer-motion";

import Stage00_BoshBesTrials from "@/components/stages/Stage00_BoshBesTrials";
import Stage0_BoshBesIntro from "@/components/stages/Stage0_BoshBesIntro";
import Stage1_Welcome from "@/components/stages/Stage1_Welcome";
import Stage2_Name from "@/components/stages/Stage2_Name";
import Stage3_Terms from "@/components/stages/Stage3_Terms";
import Stage4_Submit from "@/components/stages/Stage4_Submit";
import Stage_DarkSearch from "@/components/stages/Stage_DarkSearch";
import Stage5_Memory from "@/components/stages/Stage5_Memory";
import Stage6_Quiz from "@/components/stages/Stage6_Quiz";
import Stage7_BossRound from "@/components/stages/Stage7_BossRound";
import Stage8_DiaAgainRush from "@/components/stages/Stage8_DiaAgainRush";
import Stage9_ExitDoorChaos from "@/components/stages/Stage9_ExitDoorChaos";
import EntryAgreement from "@/components/ui/EntryAgreement";
import FakeBSOD from "@/components/ui/FakeBSOD";
import FakeLeaderboard from "../../components/ui/FakeLeaderboard";
import FakeMicRequest from "@/components/ui/FakeMicRequest";
import SocialThreatPopup from "@/components/ui/SocialThreatPopup";
import TheRoaster from "@/components/ui/TheRoaster";
import WatchingEye from "@/components/ui/WatchingEye";
import { ChaosControllerProvider } from "@/hooks/useChaosController";
import { ChaosProvider, useChaosState } from "@/hooks/useChaosState";
import { useEffect, useRef, useState } from "react";

function StageRouter() {
  const {
    gameState,
    setPlayerName,
    setStage,
    incrementAttempts,
    advanceStage,
    acceptEntry,
    completeBSOD,
    completeSocialThreat,
    completeMicRequest,
  } = useChaosState();
  const [showRecoveredToast, setShowRecoveredToast] = useState(false);
  const [isStageReadyToAdvance, setIsStageReadyToAdvance] = useState(false);
  const [gateMessage, setGateMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminError, setAdminError] = useState("");
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [currentStageAttempts, setCurrentStageAttempts] = useState(0);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const rapidClickRef = useRef({ count: 0, lastClickAt: 0 });
  const TOTAL_STAGES = 12;

  const stageHintMap: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, { soft: string; hard: string }> = {
    1: {
      soft: "Düymə qaçırsa, məkanın mərkəzini nəzarətdə saxla.",
      hard: "Kursoru birbaşa düyməyə yox, qaçacağı istiqamətə sür.",
    },
    2: {
      soft: "5 düyməyə aldanma, küncləri də yoxla.",
      hard: "A: gizli düymə, B: yazı içəridə qalmır, C: timer 1-dən sonra da uzanır.",
    },
    3: {
      soft: "Düyməyə yox, hərəkət ritminə fikir ver. Eyni qayda ilə həmişə qaçmır.",
      hard: "Düymə qaçanda bir tərəfi sıxışdır və kənara qaçış yolunu bağla.",
    },
    4: {
      soft: "Bəzən ən sadə cavab ən gec qəbul olunur. Tələsmə, ardıcıl yoxla.",
      hard: "Adı bir dəfə yox, tam eyni şəkildə yenidən daxil et; boşluq və böyük-kiçik hərf fərqinə bax.",
    },
    5: {
      soft: "Burada məqsəd razılaşmaq deyil, düzgün anda səbir göstərməkdir.",
      hard: "Şərtləri sonuna qədər sürüşdür, sonra checkbox və təsdiqi ardıcıllıqla et.",
    },
    6: {
      soft: "Popup-lara qarşı güc yox, ardıcıllıq işləyir.",
      hard: "Əvvəl diqqəti yayındıran pəncərələri bağla, əsas submit düyməsinə ən sonda qayıt.",
    },
    7: {
      soft: "Qaranlıqda hərfləri ovla. Söz görünmür, hərf görünür.",
      hard: "Fənəri hərflərə yaxın tut, əvvəlcə hərfləri topla, sonra sözü yığ.",
    },
    8: {
      soft: "Rənglər aldadır. Mərkəz nöqtə düymənin kimliyidir.",
      hard: "Yalnız düymə indeksini yadda saxla (yerini/rəngini yox). 3→4→5 ardıcıllığına fokuslan.",
    },
    9: {
      soft: "Sual məzmununa inan, vizuala yox. Düz cavab var.",
      hard: "Q2-də mövqeyə yox, dəyərə bax. Q5-də ən böyük və sol-mərkəzdə olanı seç.",
    },
    10: {
      soft: "Qaydanı gör, sonra klik et. Hər raund ayrı oyun kimidir.",
      hard: "R1 normal, R2 tərsinə, R3 təkrarlananlar, R4 ilk+son, R5 istənilən 3 simvol.",
    },
    11: {
      soft: "Bu raundda jump fizikası dəyişir. Ritmi izləməyə çalış.",
      hard: "İlk hissədə aşağı jump, sonra hiper jump+tərs idarəetmə gəlir. Hərəkəti əvvəlcədən planla.",
    },
    12: {
      soft: "Qapı səni aldadacaq. Tam üstünə qaçma, bucaqla yaxınlaş.",
      hard: "Qapını küncə sıxışdıranda yox olub əks tərəfdə çıxır. Teleport cooldown anını tut.",
    },
  };

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const response = await fetch("/api/admin/auth", { method: "GET" });
        const data = (await response.json()) as { ok?: boolean };
        setIsAdmin(Boolean(data.ok));
      } catch {
        setIsAdmin(false);
      }
    };

    void checkAdminSession();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "1") {
      setShowAdminLogin(true);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const isPrimaryCombo =
        event.ctrlKey && event.shiftKey && (event.key.toLowerCase() === "u" || event.code === "KeyU");
      const isFallbackCombo =
        event.ctrlKey && event.altKey && (event.key.toLowerCase() === "u" || event.code === "KeyU");

      if (isPrimaryCombo || isFallbackCombo) {
        event.preventDefault();
        setShowAdminLogin((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (gameState.bsodRecoveryToken === 0) {
      return;
    }

    setShowRecoveredToast(true);
    const timeoutId = window.setTimeout(() => setShowRecoveredToast(false), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [gameState.bsodRecoveryToken]);

  useEffect(() => {
    setIsStageReadyToAdvance(false);
    setGateMessage("");
    setCurrentStageAttempts(0);
    setIsHelpOpen(false);
    rapidClickRef.current = { count: 0, lastClickAt: 0 };
  }, [gameState.currentStage]);

  const soberCompleted = gameState.sobriety >= 100;
  const stageNumber =
    gameState.currentStage === "complete" ? TOTAL_STAGES : Number(gameState.currentStage);

  const registerStageAttempt = () => {
    incrementAttempts();
    setCurrentStageAttempts((prev) => prev + 1);
  };

  const handleStageComplete = () => {
    if (gameState.currentStage === 1 || gameState.currentStage === 2 || gameState.currentStage === 5) {
      setGateMessage("");
      setIsStageReadyToAdvance(false);
      advanceStage();
      return;
    }

    setIsStageReadyToAdvance(true);
    setGateMessage("Mərhələ tamamlandı. İndi keçid oxunu tez-tez bas 😈");
  };

  const handleNextStageArrow = () => {
    if (gameState.currentStage === "complete") {
      return;
    }

    if (!isStageReadyToAdvance) {
      setGateMessage("Hələ tamamlamamısan 😅 Əvvəl bu mərhələni bitir, sonra oxu sıx.");
      registerStageAttempt();
      return;
    }

    const now = Date.now();
    const maxGapMs = 900;
    const requiredClicks = stageNumber;

    if (now - rapidClickRef.current.lastClickAt > maxGapMs) {
      rapidClickRef.current.count = 0;
    }

    rapidClickRef.current.count += 1;
    rapidClickRef.current.lastClickAt = now;

    const remaining = requiredClicks - rapidClickRef.current.count;

    if (remaining > 0) {
      setGateMessage(
        `Bu keçid düyməsi naz edir 🤡 Mərhələ ${stageNumber} üçün ${requiredClicks} dəfə tez bas. Qalıb: ${remaining}`,
      );
      return;
    }

    rapidClickRef.current = { count: 0, lastClickAt: 0 };
    setGateMessage("");
    setIsStageReadyToAdvance(false);
    advanceStage();
  };

  const handleAdminLogin = async () => {
    if (!adminKeyInput.trim()) {
      setAdminError("Açar boş ola bilməz.");
      return;
    }

    try {
      setIsAdminLoading(true);
      setAdminError("");

      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: adminKeyInput.trim() }),
      });

      if (!response.ok) {
        setAdminError("Admin açarı yanlışdır.");
        return;
      }

      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminKeyInput("");
    } catch {
      setAdminError("Admin yoxlaması alınmadı.");
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setIsAdmin(false);
  };

  const handleAdminSetStage = (stage: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | "complete") => {
    acceptEntry();
    completeMicRequest();
    setStage(stage);
    setIsStageReadyToAdvance(stage === "complete");
    setGateMessage(stage === "complete" ? "" : "Admin test rejimi: mərhələ əl ilə dəyişdirildi.");
  };

  const handleAdminUnlockCurrent = () => {
    setIsStageReadyToAdvance(true);
    setGateMessage("Admin test rejimi: bu mərhələ tamamlandı kimi işarələndi.");
  };

  const handleStageFail = () => {
    registerStageAttempt();
  };

  let stageNode: React.ReactNode;

  if (gameState.currentStage === "complete") {
    stageNode = <FakeLeaderboard playerName={gameState.playerName} attempts={gameState.attempts} />;
  } else if (gameState.currentStage === 1) {
    stageNode = <Stage0_BoshBesIntro onComplete={handleStageComplete} />;
  } else if (gameState.currentStage === 2) {
    stageNode = (
      <Stage00_BoshBesTrials
        onComplete={handleStageComplete}
        onFailToStart={() => {
          handleStageFail();
          setStage(1);
          setGateMessage("Saxta düymə seçildi. Yenidən başlanğıca qayıtdın.");
        }}
      />
    );
  } else if (gameState.currentStage === 3) {
    stageNode = <Stage1_Welcome onFail={handleStageFail} onComplete={handleStageComplete} />;
  } else if (gameState.currentStage === 4) {
    stageNode = gameState.isMicRequestCompleted ? (
      <Stage2_Name onFail={handleStageFail} onComplete={handleStageComplete} />
    ) : (
      <FakeMicRequest onComplete={completeMicRequest} />
    );
  } else if (gameState.currentStage === 5) {
    stageNode = <Stage3_Terms onFail={handleStageFail} onComplete={handleStageComplete} />;
  } else if (gameState.currentStage === 6) {
    stageNode = <Stage4_Submit onFail={handleStageFail} onComplete={handleStageComplete} />;
  } else if (gameState.currentStage === 7) {
    stageNode = <Stage_DarkSearch onFail={handleStageFail} onComplete={advanceStage} />;
  } else if (gameState.currentStage === 8) {
    stageNode = <Stage5_Memory onFail={handleStageFail} onComplete={handleStageComplete} />;
  } else if (gameState.currentStage === 9) {
    stageNode = <Stage6_Quiz onFail={handleStageFail} onComplete={handleStageComplete} />;
  } else if (gameState.currentStage === 10) {
    stageNode = <Stage7_BossRound onFail={handleStageFail} onComplete={advanceStage} />;
  } else if (gameState.currentStage === 11) {
    stageNode = <Stage8_DiaAgainRush onFail={handleStageFail} onComplete={advanceStage} />;
  } else {
    stageNode = <Stage9_ExitDoorChaos onFail={handleStageFail} onComplete={advanceStage} />;
  }

  const activeStageHint =
    gameState.currentStage === "complete" ? null : stageHintMap[gameState.currentStage];
  const isHardHintUnlocked = currentStageAttempts >= 20;

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="sticky top-4 z-40 rounded-xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-sm font-semibold text-zinc-100 backdrop-blur">
        Mərhələ {stageNumber}/{TOTAL_STAGES} | Cəhd: {gameState.attempts} | 😤
      </div>

      {(showAdminLogin || isAdmin) && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/90 p-4 text-zinc-100">
          {!isAdmin ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Test rejimi (yalnız sən)</p>
              <input
                type="password"
                value={adminKeyInput}
                onChange={(event) => setAdminKeyInput(event.target.value)}
                placeholder="Admin açarını yaz"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
              <button
                type="button"
                disabled={isAdminLoading}
                onClick={handleAdminLogin}
                className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {isAdminLoading ? "Yoxlanır..." : "Test rejimini aç"}
              </button>
              {adminError && <p className="text-xs text-rose-400">{adminError}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-emerald-300">Admin test rejimi aktivdir</p>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
                >
                  Bağla
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[...Array.from({ length: TOTAL_STAGES }, (_, index) => index + 1), "complete"].map((stage) => (
                  <button
                    key={String(stage)}
                    type="button"
                    onClick={() => handleAdminSetStage(stage as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | "complete")}
                    className="rounded-md border border-zinc-600 bg-zinc-950 px-2 py-2 text-xs font-bold hover:bg-zinc-800"
                  >
                    {stage === "complete" ? "Leaderboard" : `Mərhələ ${stage}`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAdminUnlockCurrent}
                className="w-full rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
              >
                Cari mərhələni tamamlanmış et
              </button>
            </div>
          )}
        </div>
      )}

      {gameState.isDrunkBrowserActive &&
        gameState.currentStage !== 7 &&
        gameState.currentStage !== 8 &&
        gameState.currentStage !== 10 && (
        <div className="fixed left-4 top-4 z-[110] w-[220px] rounded-xl border border-zinc-700 bg-zinc-900/95 p-3 shadow-xl backdrop-blur">
          <p className="mb-2 text-xs font-semibold text-zinc-100">🍺 Ayıqlıq:</p>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${gameState.sobriety}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-300">
            {soberCompleted ? "🎉 Ayıldın! Amma geç." : `${gameState.sobriety}%`}
          </p>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={String(gameState.currentStage)}
          initial={{ x: 90, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -90, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          {stageNode}
        </motion.div>
      </AnimatePresence>

      {gameState.currentStage !== "complete" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleNextStageArrow}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg font-black text-zinc-100 transition hover:bg-zinc-800"
          >
            Növbəti mərhələ →
          </button>
          {gateMessage && <p className="text-center text-sm text-amber-300">{gateMessage}</p>}
        </div>
      )}

      {!gameState.entryAccepted && (
        <EntryAgreement
          onAccept={(fullName) => {
            setPlayerName(fullName);
            acceptEntry();
          }}
        />
      )}

      <FakeBSOD active={gameState.isBSODActive} onRecovered={completeBSOD} />

      <SocialThreatPopup
        active={gameState.isSocialThreatActive}
        messageIndex={gameState.socialThreatMessageIndex}
        onConfirm={completeSocialThreat}
      />

      <AnimatePresence>
        {showRecoveredToast && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-24 z-[120] -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-3 text-sm font-semibold text-zinc-100 shadow-xl"
          >
            Sayt özünü sağaltdı. Davam et. 💪
          </motion.div>
        )}
      </AnimatePresence>

      {gameState.currentStage !== "complete" && activeStageHint && (
        <div className="fixed right-4 top-1/2 z-[118] -translate-y-1/2">
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setIsHelpOpen((prev) => !prev)}
              className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-2 text-sm font-bold text-zinc-100 shadow-lg transition hover:bg-zinc-800"
            >
              Kömək
            </button>

            <AnimatePresence>
              {isHelpOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="w-[290px] rounded-xl border border-zinc-700 bg-zinc-900/95 p-3 text-sm text-zinc-200 shadow-xl"
                >
                  <p className="font-semibold text-zinc-100">Mərhələ {stageNumber} kömək paneli</p>
                  <p className="mt-1 text-xs text-zinc-400">Bu mərhələ cəhd sayı: {currentStageAttempts}</p>
                  <p className="mt-2 text-amber-300">
                    {isHardHintUnlocked ? activeStageHint.hard : activeStageHint.soft}
                  </p>
                  {!isHardHintUnlocked && (
                    <p className="mt-2 text-[11px] text-zinc-500">
                      Tam ipucu {20 - currentStageAttempts} cəhddən sonra açılacaq.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

function ChaosApp() {
  const { gameState } = useChaosState();

  const intensityClass =
    gameState.chaosLevel <= 1
      ? "drunk-level-1"
      : gameState.chaosLevel === 2
        ? "drunk-level-2"
        : "drunk-level-3";
  const isPlainVisualStage =
    gameState.currentStage === 5 ||
    gameState.currentStage === 6 ||
    gameState.currentStage === 7 ||
    gameState.currentStage === 8 ||
    gameState.currentStage === 10 ||
    gameState.currentStage === 11 ||
    gameState.currentStage === 12;
  const isEffectActive =
    gameState.isDrunkBrowserActive && gameState.sobriety < 100 && !isPlainVisualStage;

  return (
    <>
      <main
        className={`mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-6 ${
          isPlainVisualStage ? "stage5-cursor-visible" : ""
        } ${
          isEffectActive ? `drunk-browser-active ${intensityClass}` : ""
        }`}
      >
        <StageRouter />
      </main>
      <WatchingEye />
      <TheRoaster />
    </>
  );
}

export default function HomePage() {
  return (
    <ChaosControllerProvider>
      <ChaosProvider>
        <ChaosApp />
      </ChaosProvider>
    </ChaosControllerProvider>
  );
}
