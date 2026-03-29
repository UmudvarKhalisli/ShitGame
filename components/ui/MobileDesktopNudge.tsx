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
    <div className="fixed inset-0 z-[12050] flex h-[100dvh] items-center justify-center bg-black p-4">
      <div className="w-full max-w-md rounded-none border-x-2 border-b-2 border-t-8 border-red-600 bg-zinc-950 p-10 font-mono text-zinc-100 shadow-[0_0_80px_rgba(220,38,38,0.3)]">
        <p className="animate-pulse text-[10px] font-black uppercase tracking-[0.4em] text-red-600">
          Critical System Error: 0xBOS-BES
        </p>

        <h2 className="mt-6 text-3xl font-black uppercase leading-tight text-white">
          Telefonla bura <br /> girmək? <span className="text-red-600">Gülməli idi...</span>
        </h2>

        <p className="mt-8 text-sm leading-relaxed text-zinc-400">
          Sənin o balaca ekranın və yavaş sensorun bizim xaos paketimizi qaldıra bilməz. Bu saytın kodları sənin telefonunun prosessorunu əridə bilər. Bura barmaqla toxunmaq üçün yox, siçanla (mouse) döyüşmək üçündür.
        </p>

        <div className="mt-8 border-l-4 border-red-900 bg-red-950/20 py-3 pl-4">
          <p className="text-sm font-bold uppercase tracking-tighter text-red-500">
            Get özünə bir kompüter tap, siçanını götür və sübut et ki, nə qədər dözümlüsən.
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-2 opacity-30">
          <div className="h-[1px] w-full bg-red-900" />
          <span className="text-[9px] italic uppercase tracking-widest text-zinc-600">
            &quot;Bu saytı hazırlayarkən proqramçının əsəbi yerində qalmayıb.&quot;
          </span>
        </div>
      </div>
    </div>
  );
}
