"use client";

import { ChaosProvider } from "@/hooks/useChaosState";

export default function ChaosEngine({ children }: { children: React.ReactNode }) {
  return <ChaosProvider>{children}</ChaosProvider>;
}
