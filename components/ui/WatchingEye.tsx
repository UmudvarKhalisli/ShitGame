"use client";

import { useEffect, useRef, useState } from "react";

type Offset = { x: number; y: number };

const MAX_PUPIL_OFFSET = 16;

export default function WatchingEye() {
  const eyeRef = useRef<HTMLDivElement | null>(null);
  const [pupilOffset, setPupilOffset] = useState<Offset>({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const eye = eyeRef.current;
      if (!eye) {
        return;
      }

      const rect = eye.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const distance = Math.hypot(dx, dy) || 1;

      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      const offsetStrength = Math.min(MAX_PUPIL_OFFSET, 5 + distance * 0.06);

      setPupilOffset({
        x: -normalizedX * offsetStrength,
        y: -normalizedY * offsetStrength,
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <div className="pointer-events-none fixed right-6 top-4 z-[130]">
      <div
        className="relative h-[120px] w-[170px] border border-red-400/70 bg-red-950/70 shadow-[0_0_22px_rgba(239,68,68,0.65)]"
        style={{
          clipPath:
            "polygon(0% 12%, 16% 0%, 62% 0%, 84% 8%, 100% 28%, 100% 90%, 86% 100%, 18% 100%, 0% 84%, 4% 54%)",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.22),transparent_45%)]" />

        <div className="absolute -bottom-10 left-4 h-11 w-2 rounded-full bg-gradient-to-b from-red-400/80 via-red-500/85 to-red-900/10 eye-blood-drop" />
        <div className="absolute -bottom-8 left-14 h-8 w-1.5 rounded-full bg-gradient-to-b from-red-300/80 via-red-500/80 to-red-900/10 eye-blood-drop eye-blood-drop-delayed" />
        <div className="absolute -bottom-12 right-8 h-12 w-2 rounded-full bg-gradient-to-b from-red-400/85 via-red-600/85 to-red-900/10 eye-blood-drop eye-blood-drop-slow" />

        <div className="absolute left-1/2 top-1/2 h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-300 bg-white shadow-[0_0_16px_rgba(255,255,255,0.38)]">
          <div
            ref={eyeRef}
            className="absolute left-1/2 top-1/2 h-[56px] w-[56px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          >
            <div
              className="absolute left-1/2 top-1/2 h-[24px] w-[24px] rounded-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.7)] transition-transform duration-75"
              style={{
                transform: `translate(calc(-50% + ${pupilOffset.x}px), calc(-50% + ${pupilOffset.y}px))`,
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .eye-blood-drop {
          animation: eye-blood-drip 2.8s ease-in-out infinite;
          transform-origin: top center;
          filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.5));
        }

        .eye-blood-drop-delayed {
          animation-delay: 0.9s;
          animation-duration: 3.1s;
        }

        .eye-blood-drop-slow {
          animation-delay: 0.45s;
          animation-duration: 3.5s;
        }

        @keyframes eye-blood-drip {
          0% {
            opacity: 0.25;
            transform: translateY(-8px) scaleY(0.35);
          }
          25% {
            opacity: 0.95;
            transform: translateY(0px) scaleY(1);
          }
          68% {
            opacity: 0.82;
            transform: translateY(6px) scaleY(1.1);
          }
          100% {
            opacity: 0.18;
            transform: translateY(18px) scaleY(0.25);
          }
        }
      `}</style>
    </div>
  );
}
