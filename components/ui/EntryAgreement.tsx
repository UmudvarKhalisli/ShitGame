"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

const clauses = [
  {
    title: "Psixoloji Dözümlülük",
    text: "Bu platformaya daxil olan şəxs, səbəbsiz gərginlik, düymə qorxusu, progress bar travması və qəfil 'niyə belədir?' suallarına məruz qalacağını qabaqcadan qəbul edir. İstifadəçi təsdiqləyir ki, əsəblərinin elastikliyi müvəqqəti olaraq itə bilər və bu hal hüquqi olaraq 'normal oyun reaksiyası' sayılır.",
  },
  {
    title: "Simulyasiya Bəyannaməsi",
    text: "Buradakı bütün təhlükələr estetik şəkildə şişirdilmiş simulyasiyadır. Sistem sizi çaşdırmaq, tələsməyə məcbur etmək və bir düyməni dünyanın ən çətin missiyası kimi göstərmək hüququnu özündə saxlayır. İstifadəçi bu prosesin məntiqə uyğun olmamasını əvvəlcədən qəbul edir.",
  },
  {
    title: "Məsuliyyətdən İmtina",
    text: "Əsəb Bölməsi MMC istifadəçinin ani 'Alt+F4' qərarı, klaviaturaya sərt baxışı, monitora fəlsəfi suallar verməsi və ya ekranla mübahisəsi nəticəsində yaranan mənəvi təsirlərə görə məsuliyyət daşımır. Davam etməklə siz bütün riskləri könüllü şəkildə üzərinizə götürürsünüz.",
  },
];

export default function EntryAgreement({ onAccept }: { onAccept: (fullName: string) => void }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [fullName, setFullName] = useState("");
  const [nameError, setNameError] = useState("");
  const [scrollScore, setScrollScore] = useState(0);
  const [scrollRequirement, setScrollRequirement] = useState(1);
  const [isSigning, setIsSigning] = useState(false);
  const [isDramaticExit, setIsDramaticExit] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const travelDistance = Math.max(1, element.scrollHeight - element.clientHeight);
    setScrollRequirement(travelDistance * 3);
  }, []);

  useEffect(() => {
    const handleEscapeBlock = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleEscapeBlock, { capture: true });
    return () => window.removeEventListener("keydown", handleEscapeBlock, { capture: true });
  }, []);

  const unlockProgress = Math.min(100, Math.round((scrollScore / scrollRequirement) * 100));
  const isUnlocked = unlockProgress >= 100;
  const isNameValid = fullName.trim().length > 0;
  const canSubmit = isUnlocked && isNameValid && !isSigning;

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const movement = Math.abs(element.scrollTop - (Number(element.dataset.lastTop) || 0));
    element.dataset.lastTop = String(element.scrollTop);

    if (movement > 0) {
      setScrollScore((prev) => Math.min(prev + movement, scrollRequirement));
    }
  };

  const handleAccept = async () => {
    if (isSigning || !isUnlocked) {
      return;
    }

    if (!isNameValid) {
      setNameError("Ad və soyad yazılmalıdır.");
      return;
    }

    setNameError("");
    setIsSigning(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
    setIsDramaticExit(true);

    await new Promise((resolve) => window.setTimeout(resolve, 700));
    onAccept(fullName.trim());
  };

  const actionText = !isUnlocked ? "HƏYATIMI RİSKƏ ATIRAM" : "Əminsən?";

  const stampText = useMemo(
    () => "ƏSƏB BÖLMƏSİ MMC • RƏSMİ XƏBƏRDARLIQ • TƏSDİQLƏNİB",
    [],
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 1 }}
          animate={
            isDramaticExit
              ? {
                  scale: [1, 0.95, 1.05, 1],
                }
              : { scale: 1 }
          }
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-300/20 bg-zinc-950/95 shadow-2xl"
        >
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-22deg] text-[28px] font-black tracking-[0.2em] text-rose-400">
              {stampText}
            </div>
          </div>

          {isDramaticExit && <div className="pointer-events-none absolute inset-0 bg-red-500/40" />}

          <div className="relative z-10 space-y-5 p-6 sm:p-8">
            <header className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4">
              <h2 className="text-center text-lg font-extrabold text-rose-300 sm:text-xl">
                ⚠ DİQQƏT: PSİXOLOJİ SAĞLAMLIQ VƏ CİHAZ TƏHLÜKƏSİZLİYİ XƏBƏRDARLIĞI
              </h2>
            </header>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="max-h-80 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900/80 p-5 text-sm leading-7 text-zinc-200"
            >
              <ol className="space-y-5">
                {clauses.map((clause, index) => (
                  <li key={clause.title}>
                    <h3 className="mb-2 text-base font-bold text-zinc-100">
                      {index + 1}. {clause.title}
                    </h3>
                    <p>{clause.text}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-lg border border-zinc-700 bg-zinc-950/80 p-4">
                <label className="mb-2 block text-sm font-semibold text-zinc-100">Ad və Soyad:</label>
                <input
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    if (nameError) {
                      setNameError("");
                    }
                  }}
                  placeholder="Ad və soyadınızı yazın"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-400"
                />
                {nameError && <p className="mt-2 text-xs text-rose-400">{nameError}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-rose-500 transition-all duration-200"
                  style={{ width: `${unlockProgress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400">
                Oxuma tamamlanması (qeyri-rəsmi): {unlockProgress}% • Minimum 300% scroll tələb olunur.
              </p>
            </div>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleAccept}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-extrabold tracking-wide text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {isSigning ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                  İmzalanır...
                </>
              ) : (
                actionText
              )}
            </button>

            <p className="text-center text-xs text-zinc-500">
              © 2025 Əsəb Bölməsi MMC. Bütün əsəblər qorunur.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
