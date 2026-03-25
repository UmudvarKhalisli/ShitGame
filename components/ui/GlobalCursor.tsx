"use client";

import { useEffect, useRef, useState } from "react";

export default function GlobalCursor() {
  const [inner, setInner] = useState({ x: -100, y: -100 });
  const [isHoveringClickable, setIsHoveringClickable] = useState(false);
  const [isClickBurst, setIsClickBurst] = useState(false);

  const outerRef = useRef({ x: -100, y: -100 });
  const targetRef = useRef({ x: -100, y: -100 });
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const isClickable = (element: Element | null) => {
      if (!element) {
        return false;
      }

      const closest = element.closest(
        "button, a, input, textarea, select, label, [role='button'], [data-clickable='true']",
      );

      return Boolean(closest);
    };

    const onMouseMove = (event: MouseEvent) => {
      targetRef.current = { x: event.clientX, y: event.clientY };
      setInner({ x: event.clientX, y: event.clientY });
      setIsHoveringClickable(isClickable(event.target as Element));
    };

    const onMouseDown = () => {
      setIsClickBurst(true);
      window.setTimeout(() => setIsClickBurst(false), 200);
    };

    const render = () => {
      const damping = 0.17;
      outerRef.current = {
        x: outerRef.current.x + (targetRef.current.x - outerRef.current.x) * damping,
        y: outerRef.current.y + (targetRef.current.y - outerRef.current.y) * damping,
      };

      const node = document.getElementById("global-cursor-outer");
      if (node) {
        node.style.transform = `translate(${outerRef.current.x - 12}px, ${outerRef.current.y - 12}px) scale(${isHoveringClickable ? 1.8 : 1})`;
      }

      animationRef.current = window.requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    animationRef.current = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isHoveringClickable]);

  return (
    <>
      <div
        id="global-cursor-outer"
        className={`pointer-events-none fixed left-0 top-0 z-[99999] h-6 w-6 rounded-full border-[1.5px] transition-[border-color,box-shadow] duration-150 ${
          isHoveringClickable
            ? "border-[var(--accent-primary)] shadow-[var(--glow-purple)]"
            : "border-[var(--accent-cyan)] shadow-[var(--glow-cyan)]"
        } ${isClickBurst ? "cursor-burst" : ""}`}
      />
      <div
        className="pointer-events-none fixed z-[99999] h-1.5 w-1.5 rounded-full bg-white"
        style={{
          transform: `translate(${inner.x - 3}px, ${inner.y - 3}px)`,
          boxShadow: "0 0 10px rgba(255,255,255,0.9)",
        }}
      />
    </>
  );
}
