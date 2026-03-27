"use client";

import confetti from "canvas-confetti";
import { jsPDF } from "jspdf";
import { animate, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useChaosController } from "@/hooks/useChaosController";

type LeaderboardEntry = {
  id: string;
  rank: number;
  playerName: string;
  patienceLevel: number;
  attempts: number;
  totalTimeSeconds: number;
  highlight?: boolean;
};

const FALLBACK_ROWS: Omit<LeaderboardEntry, "rank" | "highlight">[] = [
  { id: "f-1", playerName: "Terminal Kralı", patienceLevel: 920, attempts: 14, totalTimeSeconds: 211 },
  { id: "f-2", playerName: "Aysel Null", patienceLevel: 901, attempts: 16, totalTimeSeconds: 248 },
  { id: "f-3", playerName: "Qara Monitor", patienceLevel: 887, attempts: 18, totalTimeSeconds: 274 },
  { id: "f-4", playerName: "Sleep.exe", patienceLevel: 870, attempts: 22, totalTimeSeconds: 312 },
  { id: "f-5", playerName: "Bug Hunter", patienceLevel: 844, attempts: 26, totalTimeSeconds: 365 },
];

const SLANDER_LINE = "Mən boş adamam, vaxtımı bura xərcləyirəm";
const TERMINAL_BTN =
  "rounded-md border border-emerald-400/70 bg-emerald-700/20 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-emerald-200 transition hover:border-red-400/70 hover:bg-red-700/20 hover:text-red-200";
const NAME_POOL = [
  "Aysel Q.",
  "Ramin Dev",
  "Nigar K.",
  "Elvin Code",
  "Səbinə L.",
  "Murad N.",
  "Kənan Byte",
  "Günel H.",
  "Tural S.",
  "Mina A.",
  "Orxan D.",
  "Lalə M.",
  "Samir V.",
  "Fidan P.",
  "Vüsal R.",
  "Nərmin C.",
  "Zaur T.",
  "Kamal Ə.",
  "Afaq B.",
  "Rövşən Y.",
];

type ServerRow = {
  id: string;
  player_name: string;
  patience_level: number;
  attempts: number;
  total_time_seconds: number;
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickBotName(used: Set<string>, fallbackIndex: number) {
  for (let i = 0; i < 40; i += 1) {
    const name = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)] ?? `Oyunçu ${fallbackIndex + 1}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }

  const fallback = `Oyunçu ${fallbackIndex + 1}`;
  used.add(fallback);
  return fallback;
}

function buildShowcaseRows({
  safeName,
  attempts,
  totalTimeSeconds,
  apiRows,
}: {
  safeName: string;
  attempts: number;
  totalTimeSeconds: number;
  apiRows: ServerRow[];
}) {
  const userRank = randomBetween(2, 9);
  const usedNames = new Set<string>([safeName]);
  const apiNames = apiRows.map((item) => item.player_name).filter((name) => name && name !== safeName);
  const topPatience = randomBetween(900, 980);
  const patienceStep = randomBetween(18, 32);
  const rows: LeaderboardEntry[] = [];

  for (let rank = 1; rank <= 10; rank += 1) {
    const basePatience = Math.max(520, topPatience - (rank - 1) * patienceStep + randomBetween(-6, 6));

    if (rank === userRank) {
      rows.push({
        id: "user-row",
        rank,
        playerName: safeName,
        patienceLevel: basePatience,
        attempts,
        totalTimeSeconds,
        highlight: true,
      });
      continue;
    }

    const apiCandidate = apiNames.shift();
    const playerName = apiCandidate && !usedNames.has(apiCandidate)
      ? apiCandidate
      : pickBotName(usedNames, rank);

    rows.push({
      id: `bot-${rank}`,
      rank,
      playerName,
      patienceLevel: basePatience,
      attempts: randomBetween(8 + rank * 2, 45 + rank * 5),
      totalTimeSeconds: randomBetween(180 + rank * 18, 760 + rank * 34),
      highlight: false,
    });
  }

  return rows;
}

function toTime(seconds: number) {
  const clamped = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(clamped / 60);
  const ss = clamped % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function buildSlander(length: number) {
  if (length <= 0) {
    return "";
  }

  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += SLANDER_LINE[i % SLANDER_LINE.length] ?? " ";
  }

  return output;
}

export default function FakeLeaderboard({
  playerName,
  attempts,
}: {
  playerName: string;
  attempts: number;
}) {
  const { calculateFinalScore } = useChaosController();

  const finalScore = calculateFinalScore();
  const safeName = playerName || "Anonim Kölgə";
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [statusText, setStatusText] = useState("");

  const [displayAttempts, setDisplayAttempts] = useState(0);
  const [displayCells, setDisplayCells] = useState(0);
  const [displayIqLoss, setDisplayIqLoss] = useState(0);

  const [isSlanderOpen, setIsSlanderOpen] = useState(false);
  const [slanderText, setSlanderText] = useState("");
  const [slanderSending, setSlanderSending] = useState(false);

  const [certificateOpen, setCertificateOpen] = useState(false);
  const [certificateProgress, setCertificateProgress] = useState(0);
  const certificateTimerRef = useRef<number | null>(null);

  const [callPhase, setCallPhase] = useState<"idle" | "incoming" | "signal" | "goodbye">("idle");

  const patienceLevel = useMemo(() => {
    const base = 1000;
    const fromAttempts = attempts * 12;
    const fromTime = Math.floor(finalScore.totalTimeSeconds / 2);
    const bonus = finalScore.memoryRoundsCompleted * 22 + finalScore.quizCorrectAnswers * 14;
    return Math.max(0, base - fromAttempts - fromTime + bonus);
  }, [attempts, finalScore.memoryRoundsCompleted, finalScore.quizCorrectAnswers, finalScore.totalTimeSeconds]);

  const playSmoothCallTone = () => {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtx) {
      return;
    }

    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 1.1);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.25);
    osc.onended = () => {
      void ctx.close();
    };
  };

  useEffect(() => {
    const controls = [
      animate(0, attempts, {
        duration: 1.2,
        ease: "easeOut",
        onUpdate: (value: number) => setDisplayAttempts(Math.round(value)),
      }),
      animate(0, attempts * 847, {
        duration: 1.45,
        ease: "easeOut",
        onUpdate: (value: number) => setDisplayCells(Math.round(value)),
      }),
      animate(0, attempts * 2, {
        duration: 1.1,
        ease: "easeOut",
        onUpdate: (value: number) => setDisplayIqLoss(Math.round(value)),
      }),
    ];

    return () => {
      controls.forEach((control) => control.stop());
    };
  }, [attempts]);

  useEffect(() => {
    confetti({ particleCount: 120, spread: 78, origin: { y: 0.62 } });
  }, []);

  useEffect(() => {
    const submitAndLoad = async () => {
      setLoadingRows(true);

      try {
        await fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerName: safeName,
            attempts,
            totalTimeSeconds: finalScore.totalTimeSeconds,
            patienceLevel,
          }),
        });

        const response = await fetch("/api/leaderboard", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          rows?: ServerRow[];
        };

        const sourceRows = payload.ok && payload.rows ? payload.rows : [];
        const showcase = buildShowcaseRows({
          safeName,
          attempts,
          totalTimeSeconds: finalScore.totalTimeSeconds,
          apiRows: sourceRows,
        });

        setRows(showcase);
        setStatusText("Top 10 oyunçu: realistik müqayisə cədvəli yeniləndi.");
      } catch {
        const fallbackFromTemplate = FALLBACK_ROWS.map((item) => ({
          id: item.id,
          player_name: item.playerName,
          patience_level: item.patienceLevel,
          attempts: item.attempts,
          total_time_seconds: item.totalTimeSeconds,
        }));

        const showcase = buildShowcaseRows({
          safeName,
          attempts,
          totalTimeSeconds: finalScore.totalTimeSeconds,
          apiRows: fallbackFromTemplate,
        });

        setRows(showcase);
        setStatusText("Şəbəkə zəifdir, local top 10 göstərildi.");
      } finally {
        setLoadingRows(false);
      }
    };

    void submitAndLoad();
  }, [attempts, finalScore.totalTimeSeconds, patienceLevel, safeName]);

  const sendSlanderComplaint = async () => {
    if (!slanderText.trim()) {
      setStatusText("Şikayət boş ola bilməz.");
      return;
    }

    setSlanderSending(true);

    try {
      await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: safeName, message: slanderText }),
      });

      setStatusText("Şikayətiniz zibil qutusuna çatdırıldı.");
      setIsSlanderOpen(false);
      setSlanderText("");
    } catch {
      setStatusText("Şikayət sistemi indi də sizi saymadı.");
    } finally {
      setSlanderSending(false);
    }
  };

  const startCertificateFlow = () => {
    if (certificateOpen) {
      return;
    }

    setCertificateOpen(true);
    setCertificateProgress(0);

    let progress = 0;

    const tick = () => {
      progress += Math.random() < 0.7 ? 7 : 3;
      if (progress >= 99) {
        setCertificateProgress(99);
        const holdId = window.setTimeout(() => {
          setCertificateProgress(100);
          const pdf = new jsPDF({ unit: "mm", format: "a4" });
          pdf.setFillColor(8, 16, 12);
          pdf.rect(0, 0, 210, 297, "F");

          pdf.setDrawColor(0, 240, 16);
          pdf.setLineWidth(0.8);
          pdf.roundedRect(12, 12, 186, 273, 4, 4);

          pdf.setFillColor(0, 40, 18);
          pdf.circle(105, 38, 13, "F");
          pdf.setTextColor(0, 240, 16);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.text("BB", 101.2, 40.4);

          pdf.setFontSize(22);
          pdf.text("BOS-BES RƏSMİ DİPLOM", 105, 72, { align: "center" });

          pdf.setFontSize(13);
          pdf.text(`Ad: ${safeName}`, 24, 106);
          pdf.text(`Cəhd: ${attempts}`, 24, 118);
          pdf.text(`Vaxt: ${toTime(finalScore.totalTimeSeconds)}`, 24, 130);
          pdf.text(`Səbir Səviyyəsi: ${patienceLevel}`, 24, 142);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(11);
          pdf.text("Bu sənəd yalnız ciddi vaxt itkisindən sonra verilir.", 24, 164);
          pdf.text("Sistem təsdiqi: BOŞ-BEŞ Arxiv Qovluğu", 24, 176);

          pdf.setTextColor(120, 180, 130);
          pdf.setFontSize(9);
          pdf.text("www.bos-bes.local", 24, 268);
          pdf.text("Issued: 2026", 168, 268);

          pdf.save("bos-bes-diplom.pdf");
          setStatusText("Diplom sistem tərəfindən təsdiq edildi.");
          setCertificateOpen(false);
          setCertificateProgress(0);
        }, 3000);
        certificateTimerRef.current = holdId;
        return;
      }

      setCertificateProgress(progress);
      certificateTimerRef.current = window.setTimeout(tick, 180 + Math.floor(Math.random() * 220));
    };

    tick();
  };

  useEffect(() => {
    return () => {
      if (certificateTimerRef.current !== null) {
        window.clearTimeout(certificateTimerRef.current);
      }
    };
  }, []);

  const triggerFakeCallResult = () => {
    playSmoothCallTone();
    setCallPhase("signal");
    window.setTimeout(() => {
      setCallPhase("goodbye");
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative mx-auto w-full max-w-5xl space-y-5 rounded-2xl border border-zinc-800 bg-[#060906]/95 p-6 shadow-[0_0_40px_rgba(0,240,16,0.14)]"
    >
      <div className="space-y-2 text-center">
        <h2 className="glitch-title text-5xl font-black text-[#00f010]">LEADERBOARD // FINAL LOG</h2>
        <p className="text-sm text-zinc-300">
          {safeName}, sistem səni unutmadı. Sadəcə təsadüfi sıraya saldı.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-3 text-sm text-zinc-200">
          Cəhd: <span className="font-bold text-[#00f010]">{displayAttempts}</span>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-3 text-sm text-zinc-200">
          Sinir Hüceyrəsi: <span className="font-bold text-[#00f010]">{displayCells}</span>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-3 text-sm text-zinc-200">
          IQ itkisi: <span className="font-bold text-[#00f010]">{displayIqLoss}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setIsSlanderOpen(true)} className={TERMINAL_BTN}>
          Müəllifə Şikayət Et
        </button>
        <button type="button" onClick={startCertificateFlow} className={TERMINAL_BTN}>
          Rəsmi Diplomunu Al
        </button>
        <button type="button" onClick={() => setCallPhase("incoming")} className={TERMINAL_BTN}>
          Dərdimi Kimə Deyim?
        </button>
      </div>

      {certificateOpen && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-3">
          <p className="mb-2 text-xs text-zinc-300">Diplom hazırlanır... {certificateProgress}%</p>
          <div className="h-3 w-full overflow-hidden rounded bg-zinc-800">
            <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${certificateProgress}%` }} />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-800 text-zinc-200">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Ad</th>
              <th className="px-3 py-2">Səbir Səviyyəsi</th>
              <th className="px-3 py-2">Cəhd</th>
              <th className="px-3 py-2">Vaxt</th>
            </tr>
          </thead>
          <tbody>
            {!loadingRows && rows.length === 0 && (
              <tr className="bg-zinc-900 text-zinc-300">
                <td className="px-3 py-3" colSpan={5}>Məlumat tapılmadı.</td>
              </tr>
            )}

            {rows.map((entry) => (
              <tr
                key={entry.id}
                className={entry.highlight ? "bg-emerald-500/15 text-emerald-100" : "bg-zinc-900 text-zinc-200"}
              >
                <td className="px-3 py-2 font-semibold">{entry.rank}</td>
                <td className="px-3 py-2">{entry.playerName}</td>
                <td className="px-3 py-2">{entry.patienceLevel}</td>
                <td className="px-3 py-2">{entry.attempts}</td>
                <td className="px-3 py-2">{toTime(entry.totalTimeSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {statusText && <p className="text-xs text-amber-300">{statusText}</p>}

      {isSlanderOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-4">
            <h3 className="text-lg font-black text-zinc-100">Şikayət Masası</h3>
            <textarea
              value={slanderText}
              onChange={(event) => {
                const nextLen = event.target.value.length;
                setSlanderText(buildSlander(nextLen));
              }}
              rows={5}
              placeholder="Şikayətinizi yazın..."
              className="w-full resize-none rounded border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none"
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={TERMINAL_BTN} onClick={() => setIsSlanderOpen(false)}>
                Bağla
              </button>
              <button type="button" className={TERMINAL_BTN} disabled={slanderSending} onClick={sendSlanderComplaint}>
                {slanderSending ? "Göndərilir..." : "Göndər"}
              </button>
            </div>
          </div>
        </div>
      )}

      {callPhase === "incoming" && (
        <div className="fixed inset-0 z-[175] flex items-center justify-center bg-black p-4">
          <div className="w-full max-w-lg space-y-4 rounded-xl border border-emerald-400/60 bg-zinc-950 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Incoming Video Call</p>
            <h3 className="text-2xl font-black text-emerald-200">💩 Boss</h3>
            <div className="flex justify-center gap-3">
              <button type="button" className={TERMINAL_BTN} onClick={triggerFakeCallResult}>
                Qəbul Et
              </button>
              <button type="button" className={TERMINAL_BTN} onClick={triggerFakeCallResult}>
                Rədd Et
              </button>
            </div>
          </div>
        </div>
      )}

      {callPhase === "signal" && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/95 text-white">
          <div className="max-w-2xl space-y-3 px-6 text-center">
            <p className="text-6xl">📶</p>
            <p className="text-2xl font-bold">Zəng bağlandı, siqnal qaldı.</p>
            <p className="text-sm">CALL_END_SEQUENCE // Yeni sonluq hazırlanır...</p>
          </div>
        </div>
      )}

      {callPhase === "goodbye" && (
        <div className="fixed inset-0 z-[181] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(16,72,45,0.35),rgba(0,0,0,0.96)_55%)] p-4">
          <div className="w-full max-w-2xl rounded-xl border border-emerald-500/40 bg-zinc-950/95 p-6 text-center shadow-[0_0_45px_rgba(16,185,129,0.2)]">
            <h3 className="text-3xl font-black text-emerald-200">Oyunun Sonu</h3>
            <p className="mt-3 text-sm text-zinc-300">
              Sən bu dəfə sistemə uduzmadın, sadəcə onu bezdirdin. Final log saxlanıldı.
            </p>
            <button
              type="button"
              className="mt-5 rounded-md border border-emerald-400/70 bg-emerald-700/20 px-5 py-2 text-sm font-bold uppercase tracking-[0.12em] text-emerald-200 transition hover:bg-emerald-700/30"
              onClick={() => setCallPhase("idle")}
            >
              Siyahıya Qayıt
            </button>
          </div>
        </div>
      )}

      <footer className="pt-3 text-center text-[10px] text-zinc-500 animate-pulse">
        Bu saytı hazırlayarkən heç bir proqramçının əsəbi yerində qalmayıb.
      </footer>
    </motion.div>
  );
}
