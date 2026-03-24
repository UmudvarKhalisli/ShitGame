"use client";

import { useEffect, useState } from "react";

export interface InverseMousePosition {
  x: number;
  y: number;
}

export function useInverseMouse() {
  const [position, setPosition] = useState<InverseMousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = window.innerWidth - event.clientX;
      const y = window.innerHeight - event.clientY;
      setPosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return position;
}
