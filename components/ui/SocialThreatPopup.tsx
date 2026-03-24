"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type ThreatMessage = {
  title: string;
  body: string;
  confirmText: string;
};

const threatMessages: ThreatMessage[] = [
  {
    title: "⚠️ Son Xəbərdarlıq",
    body: "Bir dəfə də səhv etsən, brauzer tarixçəndə nə olduğunu hamı görəcək.",
    confirmText: "Yaxşı, yaxşı, anlayıram 😰",
  },
  {
    title: "📸 Ekran Görüntüsü Alındı",
    body: "Bu anın ekran görüntüsü 'Həyatda Uğursuzluqlar' arxivinə əlavə edildi.",
    confirmText: "Sil onu! (Olmayacaq)",
  },
  {
    title: "📊 Performans Hesabatı",
    body: "Bu səviyyənin nəticəsi LinkedIn profilinizə paylaşıldı: 'Sadə düyməni tapa bilmədi'",
    confirmText: "Bu zarafatdır... deyilmi?",
  },
  {
    title: "🤖 AI Müşahidəsi",
    body: "Hərəkətləriniz süni intellekt tərəfindən analiz edilir. Nəticə: 'Çox naümid edici'",
    confirmText: "Sən kim olursan ol 😤",
  },
  {
    title: "📱 SMS Göndərildi",
    body: "Əlaqə siyahınızdakı ilk 5 kontakta indiki vəziyyətiniz barədə məlumat göndərildi.",
    confirmText: "YALAN!!! ...Deyilmi???",
  },
];

export default function SocialThreatPopup({
  active,
  messageIndex,
  onConfirm,
}: {
  active: boolean;
  messageIndex: number;
  onConfirm: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const progressTimerRef = useRef<number | null>(null);

  const clearProgressTimer = () => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!active) {
      setProgress(0);
      setIsClosing(false);
      clearProgressTimer();
      return;
    }

    setProgress(0);
    setIsClosing(false);
    clearProgressTimer();

    let tick = 0;
    progressTimerRef.current = window.setInterval(() => {
      tick += 1;
      setProgress(Math.min(100, Math.round((tick / 70) * 100)));

      if (tick >= 70 && progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }, 80);

    return () => clearProgressTimer();
  }, [active]);

  const playThud = () => {
    const BrowserAudioContext =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!BrowserAudioContext) {
      return;
    }

    const context = new BrowserAudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(96, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(58, context.currentTime + 0.14);

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.7, context.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
    oscillator.onended = () => {
      context.close().catch(() => {
        return;
      });
    };
  };

  const handleConfirm = () => {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    playThud();
    window.setTimeout(() => {
      onConfirm();
    }, 280);
  };

  const message = useMemo(
    () => threatMessages[messageIndex % threatMessages.length],
    [messageIndex],
  );

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[128] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.65, y: 36 }}
            animate={
              isClosing
                ? { opacity: 0, scale: 0.9, x: [0, -10, 10, -8, 8, 0] }
                : {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    borderColor: ["rgba(244,63,94,0.9)", "rgba(190,18,60,1)", "rgba(244,63,94,0.9)"],
                    boxShadow: [
                      "0 0 0 rgba(244,63,94,0.15)",
                      "0 0 24px rgba(244,63,94,0.6)",
                      "0 0 0 rgba(244,63,94,0.15)",
                    ],
                  }
            }
            transition={{
              duration: isClosing ? 0.28 : 0.45,
              ease: "easeOut",
              borderColor: { duration: 1.2, repeat: Number.POSITIVE_INFINITY },
              boxShadow: { duration: 1.2, repeat: Number.POSITIVE_INFINITY },
            }}
            className="w-full max-w-lg rounded-2xl border-2 bg-zinc-950/95 p-6 text-zinc-100"
          >
            <h3 className="text-2xl font-black text-rose-300">{message.title}</h3>
            <p className="mt-3 text-sm leading-7 text-zinc-200">{message.body}</p>

            <div className="mt-5 space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-rose-500 transition-[width] duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400">Göndərilir... {progress}%</p>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className="mt-6 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-rose-500"
            >
              {message.confirmText}
            </button>

            <p className="mt-4 text-center text-[11px] text-zinc-500">
              * Bütün təhdidlər tamamilə yalandır. Yəqin ki.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
