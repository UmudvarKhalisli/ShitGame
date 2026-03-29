"use client";

import { useEffect, useState } from "react";

export default function MobileDesktopNudge() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isPhoneLike = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
    if (!isPhoneLike) {
      return;
    }

    setIsVisible(true);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950/95 p-5 text-zinc-100 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Diqqet, Esb Testi</p>
        <h2 className="mt-2 text-2xl font-black text-rose-300">Bu sayt telefonla tam acilmir :)</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Burasi siçanla esebleri yoxlamaq ucun duzeldilib. Telefon versiyasi sadece trailer kimidir,
          tam xaos paketi PC + mouse ile acilir.
        </p>
        <p className="mt-2 text-sm font-semibold text-amber-300">
          Komputerden ac, sonra de ki: Bu ne oyundu, niye cixa bilmirəm? :D
        </p>
        <p className="mt-5 text-xs text-zinc-500">Giris telefon ucun baglidir. Oyuna davam ucun PC istifade et.</p>
      </div>
    </div>
  );
}
