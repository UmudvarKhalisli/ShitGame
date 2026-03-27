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
    <div className="pointer-events-none fixed right-4 top-2 z-[130]">
      <div className="relative h-[170px] w-[230px]">
        <svg viewBox="0 0 230 170" className="absolute inset-0 h-full w-full drop-shadow-[0_0_18px_rgba(239,68,68,0.45)]">
          <path
            d="M18 82 C40 46, 80 26, 115 28 C150 30, 188 50, 212 84 C186 116, 151 136, 114 138 C76 140, 37 120, 18 82 Z"
            fill="#161214"
            stroke="#120a0b"
            strokeWidth="4"
          />

          <path d="M36 56 l8 -18 l8 16 l8 -17 l7 15 l8 -14 l8 15 l8 -15 l7 16 l8 -16 l9 17 l8 -16 l9 18" fill="none" stroke="#1e1415" strokeWidth="4" strokeLinecap="round" />

          <ellipse cx="116" cy="84" rx="50" ry="42" fill="#f7f7f7" stroke="#202020" strokeWidth="6" />
          <ellipse cx="116" cy="84" rx="36" ry="30" fill="none" stroke="#8f8f8f" strokeWidth="2" strokeDasharray="2 6" />

          <path d="M70 114 C98 124, 136 124, 163 112" fill="none" stroke="#cf1212" strokeWidth="8" strokeLinecap="round" />

          <path
            d="M162 112 C170 114, 176 122, 176 132 C176 146, 166 157, 152 157 C138 157, 129 147, 129 133 C129 122, 136 114, 146 112 C149 132, 151 145, 152 160"
            fill="#ef2a2a"
            stroke="#8a1010"
            strokeWidth="3"
            className="tear-drop"
          />
        </svg>

        <div ref={eyeRef} className="absolute left-1/2 top-1/2 h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 rounded-full">
          <div
            className="absolute left-1/2 top-1/2 h-[26px] w-[26px] rounded-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-transform duration-75"
            style={{
              transform: `translate(calc(-50% + ${pupilOffset.x}px), calc(-50% + ${pupilOffset.y}px))`,
            }}
          />
        </div>
      </div>

      <style jsx>{`
        .tear-drop {
          transform-origin: 152px 112px;
          animation: tear-pulse 2.8s ease-in-out infinite;
        }

        @keyframes tear-pulse {
          0% {
            transform: scaleY(0.72);
            opacity: 0.75;
          }
          35% {
            transform: scaleY(1.04);
            opacity: 0.96;
          }
          72% {
            transform: scaleY(1.15);
            opacity: 0.88;
          }
          100% {
            transform: scaleY(0.78);
            opacity: 0.78;
          }
        }
      `}</style>
    </div>
  );
}
