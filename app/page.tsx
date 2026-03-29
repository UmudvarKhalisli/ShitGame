"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const features = [
  {
    icon: "🖱️",
    title: "TƏRS KURSOR",
    description: "Siçanınız sizə itaət etməyi dayandırdı",
  },
  {
    icon: "⌨️",
    title: "TƏRSLƏNMIŞ YAZILI",
    description: "Hərflər öz başına işləyir",
  },
  {
    icon: "💀",
    title: "POPUP CƏHƏNNƏMİ",
    description: "Bağlanan hər pəncərə 2 yenisini açır",
  },
  {
    icon: "🧠",
    title: "MƏNTİQ OYUNLARI",
    description: "Cavab düzgündür, sistem qəbul etmir",
  },
];

const entrance = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="landing-page-cursor relative min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.26),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.2),transparent_48%)]" />
      <div className="scanline-overlay pointer-events-none fixed inset-0 z-[1]" />

      <nav className="fixed left-0 top-0 z-30 h-[52px] w-full border-b border-[rgba(124,58,237,0.2)] bg-[rgba(3,3,10,0.65)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-3 sm:px-6">
          <span
            className="text-lg text-[var(--accent-purple)] sm:text-2xl"
            style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, textShadow: "0 0 12px rgba(124,58,237,0.4)" }}
          >
            ƏSƏB BÖLMƏSİ
          </span>
          <span
            className="hidden rounded border border-[rgba(107,114,128,0.25)] px-2 py-1 text-[11px] text-[var(--text-muted)] sm:inline"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            SON SINAQ BURAXILIŞI
          </span>
        </div>
      </nav>

      <main className="relative z-10 pt-[52px]">
        <section className="mx-auto flex min-h-[calc(100vh-52px)] w-full max-w-6xl flex-col items-center justify-center px-4 text-center sm:px-6">
          <motion.div
            variants={entrance}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0, duration: 0.4, ease: "easeOut" }}
            className="mb-5 rounded-full border border-[rgba(124,58,237,0.4)] bg-[rgba(124,58,237,0.08)] px-4 py-2 text-[10px] tracking-[0.25em] text-[#A855F7] sm:mb-6 sm:px-5 sm:text-[11px] sm:tracking-[0.4em]"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            {"// ƏSƏB SINAĞI LABORATORİYASI //"}
          </motion.div>

          <motion.h1
            variants={entrance}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15, duration: 0.45, ease: "easeOut" }}
            className="leading-none text-[clamp(3.2rem,19vw,6rem)]"
            style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, color: "#F1F0FF" }}
          >
            ƏSƏB
          </motion.h1>

          <motion.h2
            variants={entrance}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3, duration: 0.45, ease: "easeOut" }}
            className="glitch-title -mt-1 leading-none text-[clamp(3.2rem,19vw,6rem)] sm:-mt-2"
            style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, color: "#7C3AED" }}
          >
            BÖLMƏSİ
          </motion.h2>

          <motion.p
            variants={entrance}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.45, duration: 0.4, ease: "easeOut" }}
            className="mt-4 max-w-[420px] text-center text-[15px] font-light text-[#9CA3AF] sm:mt-5 sm:text-[18px]"
            style={{ fontFamily: "'Noto Sans', sans-serif" }}
          >
            Bir düyməni basmaq bu qədər çətin olmamalıydı.
          </motion.p>

          <motion.div
            variants={entrance}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.6, duration: 0.45, ease: "easeOut" }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            {[
              { value: "8", label: "MƏRHƏLƏ" },
              { value: "∞", label: "CƏHD" },
              { value: "0%", label: "MERCİ" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[8px] border border-[rgba(124,58,237,0.15)] bg-[rgba(8,8,24,0.8)] px-4 py-3 sm:px-6"
              >
                <div
                  className="text-[30px] leading-none text-[var(--accent-cyan)] sm:text-[36px]"
                  style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800 }}
                >
                  {stat.value}
                </div>
                <div
                  className="mt-1 text-[9px] tracking-[0.3em] text-[#4B5563]"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            variants={entrance}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.75, duration: 0.45, ease: "easeOut" }}
            className="mt-10"
          >
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => router.push("/game")}
                className="cta-pulse w-full max-w-[320px] rounded-[6px] border-[1.5px] border-[var(--accent-purple)] bg-transparent px-7 py-4 text-[16px] tracking-[0.22em] text-[#C084FC] transition-all duration-300 hover:bg-[rgba(124,58,237,0.15)] sm:w-auto sm:max-w-none sm:px-14 sm:text-[18px] sm:tracking-[0.35em] sm:hover:tracking-[0.45em] hover:shadow-[0_0_28px_rgba(124,58,237,0.58)]"
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontWeight: 800,
                  boxShadow: "0 0 20px rgba(124,58,237,0.4)",
                }}
              >
                OYUNA BAŞLA →
              </button>
            </div>
            <p
              className="mt-4 text-[10px] text-[#4B5563]"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              ⚠ Davam etməklə əsəblərinizin 73% azalmasını qəbul edirsiniz
            </p>
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
          <div className="mb-10 flex flex-col items-center">
            <h3
              className="text-3xl leading-none text-[var(--text-primary)] sm:text-[42px]"
              style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800 }}
            >
              Sizi Nə Gözləyir?
            </h3>
            <div className="mt-4 h-[2px] w-[120px] bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)]" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="chaos-card rounded-xl border p-5 sm:p-6">
                <div className="text-[28px] leading-none sm:text-[32px]">{feature.icon}</div>
                <h4
                  className="mt-4 text-[18px] tracking-[0.12em] text-[#A855F7] sm:text-[20px] sm:tracking-[0.15em]"
                  style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800 }}
                >
                  {feature.title}
                </h4>
                <p className="mt-2 text-[13px] text-[var(--text-muted)]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 flex min-h-[60px] items-center justify-center border-t border-[rgba(124,58,237,0.1)] px-4 py-3 text-center text-[11px] text-[#374151] sm:px-6">
        <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          © 2026 Əsəb Bölməsi MMC • Bütün əsəblər qorunur.
        </span>
      </footer>
    </div>
  );
}

