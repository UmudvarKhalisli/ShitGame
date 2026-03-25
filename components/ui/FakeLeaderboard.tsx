"use client";

import confetti from "canvas-confetti";
import { animate, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { useChaosController } from "@/hooks/useChaosController";

type LeaderboardEntry = {
  rank: number;
  name: string;
  time: string;
  highlight?: boolean;
};

const FAKE_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, name: "Robbie McClick", time: "0:03" },
  { rank: 2, name: "Əli Kərimov", time: "2:17" },
  { rank: 3, name: "Nigar Turbo", time: "3:01" },
  { rank: 4, name: "Click Sultan", time: "3:45" },
  { rank: 5, name: "Aysel Qaz", time: "4:04" },
  { rank: 6, name: "Mister Mouse", time: "4:11" },
  { rank: 7, name: "Sürətli Samir", time: "4:29" },
  { rank: 8, name: "Kral Klikov", time: "4:48" },
  { rank: 9, name: "Ləman Matrix", time: "5:02" },
  { rank: 10, name: "Qəhrəman Qasım", time: "5:12" },
];

export default function FakeLeaderboard({
  playerName,
  attempts,
}: {
  playerName: string;
  attempts: number;
}) {
  const { calculateFinalScore } = useChaosController();
  const finalScore = calculateFinalScore();

  const safeName = playerName || "Anonim Qəhrəman";
  const playerRank = useMemo(
    () => 999998 + Math.floor(Math.random() * 6),
    [],
  );

  const actualTime = useMemo(() => {
    const totalSeconds = Math.max(9, Math.floor(finalScore.totalTimeSeconds));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [finalScore.totalTimeSeconds]);

  const leaderboardRows = useMemo<LeaderboardEntry[]>(
    () => [
      ...FAKE_ENTRIES,
      {
        rank: playerRank,
        name: safeName,
        time: actualTime,
        highlight: true,
      },
    ],
    [actualTime, playerRank, safeName],
  );

  const [displayAttempts, setDisplayAttempts] = useState(0);
  const [displayCells, setDisplayCells] = useState(0);
  const [displayIqLoss, setDisplayIqLoss] = useState(0);
  const [displayHairLoss, setDisplayHairLoss] = useState(0);
  const [shareStatus, setShareStatus] = useState("");

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
      animate(0, attempts * 13, {
        duration: 1.35,
        ease: "easeOut",
        onUpdate: (value: number) => setDisplayHairLoss(Math.round(value)),
      }),
    ];

    return () => {
      controls.forEach((control) => control.stop());
    };
  }, [attempts]);

  useEffect(() => {
    const burst = () => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.62 },
      });
    };

    burst();
    const intervalId = window.setInterval(burst, 1800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleShare = async () => {
    const link = typeof window !== "undefined" ? window.location.href : "";
    const text = `Mən 'Əsəb Bölməsi'ni keçdim! Cəhd sayı: ${attempts} 😤 ${link}`;

    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("Paylaşım mətni kopyalandı ✅");
    } catch {
      setShareStatus("Kopyalama alınmadı ❌");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="mx-auto w-full max-w-4xl space-y-6 rounded-2xl border border-zinc-700 bg-zinc-900/90 p-6 shadow-2xl"
    >
      <div className="space-y-2 text-center">
        <div className="text-6xl">🏆</div>
        <h2 className="text-4xl font-black text-zinc-100">TƏBRİKLƏR!</h2>
        <p className="text-zinc-300">
          <span className="font-semibold text-zinc-100">{safeName}</span>, Siz bu çətin yolu
          keçdiniz!
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/70 p-4 text-sm text-zinc-200">
          Ümumi cəhd sayı: <span className="font-bold text-zinc-100">{displayAttempts}</span>
        </div>
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/70 p-4 text-sm text-zinc-200">
          Xərclənmiş sinir hüceyrəsi: <span className="font-bold text-zinc-100">{displayCells}</span>
        </div>
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/70 p-4 text-sm text-zinc-200">
          IQ azalması: <span className="font-bold text-zinc-100">{displayIqLoss}</span> xal
        </div>
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/70 p-4 text-sm text-zinc-200">
          Tökülən saç teli: <span className="font-bold text-zinc-100">{displayHairLoss}</span>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 text-sm text-zinc-200">
        <p>
          Yadda saxlama gücü: <span className="font-bold text-zinc-100">{finalScore.memoryRoundsCompleted * 25}%</span>
        </p>
        <p>
          Məntiqi düşüncə: <span className="font-bold text-zinc-100">{finalScore.quizCorrectAnswers * 20}%</span>{" "}
          <span className="text-zinc-400">(Ortalama: 94%)</span>
        </p>
        <p>
          Boss döyüşü: <span className="font-bold text-zinc-100">{finalScore.bossRoundsCompleted}/5 raund</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-800 text-zinc-200">
            <tr>
              <th className="px-3 py-2">Sıra</th>
              <th className="px-3 py-2">Ad</th>
              <th className="px-3 py-2">Vaxt</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardRows.map((entry: LeaderboardEntry) => (
              <tr
                key={`${entry.rank}-${entry.name}`}
                className={entry.highlight ? "bg-emerald-500/20 text-emerald-100" : "bg-zinc-900 text-zinc-200"}
              >
                <td className="px-3 py-2 font-semibold">#{entry.rank}</td>
                <td className="px-3 py-2">{entry.name}</td>
                <td className="px-3 py-2">{entry.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-sm font-semibold text-amber-300">
        🎖️ Siz bu mərhələnin keçən {playerRank}-ci ən ZƏİF BƏNDİ sizsiniz!
      </p>

      <div className="space-y-2 text-center">
        <button
          type="button"
          onClick={handleShare}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Nəticəni paylaş
        </button>
        {shareStatus && <p className="text-xs text-zinc-300">{shareStatus}</p>}
      </div>
    </motion.div>
  );
}
