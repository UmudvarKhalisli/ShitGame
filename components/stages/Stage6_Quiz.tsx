"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { chaosController } from "@/hooks/chaosController";
import { useChaosController } from "@/hooks/useChaosController";

type QuizOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type QuizQuestion = {
  id: number;
  prompt: string;
  options: QuizOption[];
};

const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    prompt: "Aşağıdakılardan hansı meyvədir?",
    options: [
      { id: "q1-a", text: "Stul", isCorrect: false },
      { id: "q1-b", text: "Alma", isCorrect: true },
      { id: "q1-c", text: "Kitab", isCorrect: false },
      { id: "q1-d", text: "Xoşbəxtlik", isCorrect: false },
    ],
  },
  {
    id: 2,
    prompt: "2 + 2 = ?",
    options: [
      { id: "q2-a", text: "5", isCorrect: false },
      { id: "q2-b", text: "Balıq", isCorrect: false },
      { id: "q2-c", text: "4", isCorrect: true },
      { id: "q2-d", text: "Bəli", isCorrect: false },
    ],
  },
  {
    id: 3,
    prompt: "Günəş hansı istiqamətdən doğur?",
    options: [
      { id: "q3-a", text: "Şərq", isCorrect: true },
      { id: "q3-b", text: "Qərb", isCorrect: false },
      { id: "q3-c", text: "Yuxarı", isCorrect: false },
      { id: "q3-d", text: "Pəncərədən", isCorrect: false },
    ],
  },
  {
    id: 4,
    prompt: "Aşağıdakılardan hansı proqramlaşdırma dilidir?",
    options: [
      { id: "q4-a", text: "Python", isCorrect: true },
      { id: "q4-b", text: "Makaron", isCorrect: false },
      { id: "q4-c", text: "Dəvə", isCorrect: false },
      { id: "q4-d", text: "Çərçivə", isCorrect: false },
    ],
  },
  {
    id: 5,
    prompt: "Bu saytın məqsədi nədir?",
    options: [
      { id: "q5-a", text: "Əsəbini pozmaq", isCorrect: true },
      { id: "q5-b", text: "Əsəbini pozmaq", isCorrect: false },
      { id: "q5-c", text: "Əsəbini pozmaq", isCorrect: false },
      { id: "q5-d", text: "Əsəbini pozmaq", isCorrect: false },
    ],
  },
];

const OPTION_COLOR_CLASSES = [
  "border-cyan-500/70 bg-cyan-500/10",
  "border-fuchsia-500/70 bg-fuchsia-500/10",
  "border-amber-500/70 bg-amber-500/10",
  "border-violet-500/70 bg-violet-500/10",
] as const;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export default function Stage6_Quiz({
  onComplete,
  onFail,
}: {
  onComplete: () => void;
  onFail: () => void;
}) {
  const {
    setQuizQuestion,
    state: { isQuizColorSwapActive },
  } = useChaosController();

  const [questionIndex, setQuestionIndex] = useState(0);
  const [statusText, setStatusText] = useState("Bütün sualları düzgün cavabla. Sənə inanmırıq.");
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [counterText, setCounterText] = useState("Sual 1/5");
  const [isLocked, setIsLocked] = useState(false);
  const [q2Order, setQ2Order] = useState<string[]>(() => QUESTIONS[1].options.map((option) => option.id));
  const [q3Rotations, setQ3Rotations] = useState<Record<string, number>>({});
  const [q4Offsets, setQ4Offsets] = useState<Record<string, { x: number; y: number }>>({});
  const [optionColorOrder, setOptionColorOrder] = useState([0, 1, 2, 3]);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const hasCounterGlitchedRef = useRef(false);
  const hasShownQ5HintRef = useRef(false);
  const q4HoverTimersRef = useRef<Record<string, number>>({});
  const q4TouchHoldTimersRef = useRef<Record<string, number>>({});
  const q4TouchReadyRef = useRef<Set<string>>(new Set());

  const question = QUESTIONS[questionIndex];

  const q2OptionMap = useMemo(() => {
    return new Map(QUESTIONS[1].options.map((option) => [option.id, option]));
  }, []);

  useEffect(() => {
    const touchReadySet = q4TouchReadyRef.current;

    return () => {
      Object.values(q4HoverTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      q4HoverTimersRef.current = {};

      Object.values(q4TouchHoldTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      q4TouchHoldTimersRef.current = {};
      touchReadySet.clear();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const syncPointerMode = () => {
      setIsCoarsePointer(mediaQuery.matches);
    };

    syncPointerMode();
    mediaQuery.addEventListener("change", syncPointerMode);
    return () => {
      mediaQuery.removeEventListener("change", syncPointerMode);
    };
  }, []);

  useEffect(() => {
    setQuizQuestion(questionIndex + 1);
  }, [questionIndex, setQuizQuestion]);

  useEffect(() => {
    setIsLocked(false);
    setTimerSeconds(30);
    setStatusText("Cavabı tap və özündən şübhə et.");

    if (question.id === 2) {
      setQ2Order(shuffle(QUESTIONS[1].options.map((option) => option.id)));
    }

    if (question.id === 3) {
      const rotations: Record<string, number> = {};
      question.options.forEach((option) => {
        rotations[option.id] = Math.floor(Math.random() * 31) - 15;
      });
      setQ3Rotations(rotations);
    }

    if (question.id === 4) {
      setQ4Offsets({});
      q4TouchReadyRef.current.clear();
    }

    if (question.id === 5 && !hasShownQ5HintRef.current) {
      hasShownQ5HintRef.current = true;
      chaosController.triggerRoast("Ən böyüyünü seç. Bu dəfə zarafat deyil.");
    }
  }, [question.id, question.options]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (isLocked) {
        return;
      }

      setTimerSeconds((prev) => {
        const next = prev - 0.2 * (Math.random() * 2);
        if (next <= 0) {
          chaosController.triggerRoast("Vaxt bitdi. Saydım yenidən. Xahiş edirəm.");
          return 15;
        }

        return next;
      });
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [isLocked, questionIndex]);

  useEffect(() => {
    if (question.id !== 2 || isLocked) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setQ2Order((prev) => shuffle(prev));
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [question.id, isLocked]);

  useEffect(() => {
    if (!isQuizColorSwapActive || isLocked) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setOptionColorOrder((prev) => shuffle(prev));
    }, 700);

    return () => window.clearInterval(intervalId);
  }, [isLocked, isQuizColorSwapActive]);

  useEffect(() => {
    if (questionIndex === 3 && !hasCounterGlitchedRef.current && Math.random() < 0.8) {
      hasCounterGlitchedRef.current = true;
      setCounterText("Sual 4/7");

      const timeoutId = window.setTimeout(() => {
        setCounterText("Sual 4/5");
      }, 1400);

      return () => window.clearTimeout(timeoutId);
    }

    setCounterText(`Sual ${questionIndex + 1}/5`);
  }, [questionIndex]);

  const moveToNextQuestion = () => {
    if (questionIndex >= QUESTIONS.length - 1) {
      setStatusText("Hamısını düz tapdın. Sistem hələ də inanmır.");
      onComplete();
      return;
    }

    setQuestionIndex((prev) => prev + 1);
  };

  const handleWrongAnswer = () => {
    setStatusText("Yanlış cavab. Bu dəfə həqiqətən yanlışdır.");
    onFail();
  };

  const handleCorrectAnswer = () => {
    const shouldGaslight = Math.random() < 0.3;

    if (!shouldGaslight) {
      setStatusText("Düzdür. Hələlik...");
      setIsLocked(true);
      window.setTimeout(() => {
        moveToNextQuestion();
      }, 700);
      return;
    }

    setIsLocked(true);
    setStatusText("Yanlış! Yenidən cəhd et");

    window.setTimeout(() => {
      setStatusText("...Əslində düzgün idi. Bağışla.");
      window.setTimeout(() => {
        moveToNextQuestion();
      }, 800);
    }, 2000);
  };

  const handleOptionClick = (option: QuizOption) => {
    if (isLocked) {
      return;
    }

    if (question.id === 4 && isCoarsePointer && option.isCorrect) {
      if (!q4TouchReadyRef.current.has(option.id)) {
        triggerQ4RunAway(option.id);
        setStatusText("Telefon rejimi: düzgün cavabı 0.7s basıb saxla, sonra seç.");
        return;
      }

      q4TouchReadyRef.current.delete(option.id);
    }

    if (!option.isCorrect) {
      handleWrongAnswer();
      return;
    }

    handleCorrectAnswer();
  };

  const triggerQ4RunAway = (optionId: string) => {
    const randomDirection = Math.floor(Math.random() * 4);
    const distanceX = 260;
    const distanceY = 130;

    const offset =
      randomDirection === 0
        ? { x: distanceX, y: 0 }
        : randomDirection === 1
          ? { x: -distanceX, y: 0 }
          : randomDirection === 2
            ? { x: 0, y: distanceY }
            : { x: 0, y: -distanceY };

    setQ4Offsets((prev) => ({
      ...prev,
      [optionId]: offset,
    }));

    window.setTimeout(() => {
      setQ4Offsets((prev) => ({
        ...prev,
        [optionId]: { x: 0, y: 0 },
      }));
    }, 1000);
  };

  const handleQ4HoverStart = (optionId: string) => {
    if (question.id !== 4 || isLocked) {
      return;
    }

    window.clearTimeout(q4HoverTimersRef.current[optionId]);
    q4HoverTimersRef.current[optionId] = window.setTimeout(() => {
      triggerQ4RunAway(optionId);
    }, 1500);
  };

  const handleQ4HoverEnd = (optionId: string) => {
    window.clearTimeout(q4HoverTimersRef.current[optionId]);
    delete q4HoverTimersRef.current[optionId];
  };

  const handleQ4TouchStart = (optionId: string) => {
    if (!isCoarsePointer || question.id !== 4 || isLocked) {
      return;
    }

    window.clearTimeout(q4TouchHoldTimersRef.current[optionId]);
    q4TouchHoldTimersRef.current[optionId] = window.setTimeout(() => {
      q4TouchReadyRef.current.add(optionId);
      setStatusText("Hazırdır: indi buraxıb seçə bilərsən.");
    }, 700);
  };

  const handleQ4TouchEnd = (optionId: string) => {
    if (!isCoarsePointer || question.id !== 4 || isLocked) {
      return;
    }

    window.clearTimeout(q4TouchHoldTimersRef.current[optionId]);
    delete q4TouchHoldTimersRef.current[optionId];

    if (!q4TouchReadyRef.current.has(optionId)) {
      triggerQ4RunAway(optionId);
    }
  };

  const renderQ5OptionClass = (optionId: string) => {
    if (optionId === "q5-a") {
      return "col-start-1 row-start-1 row-span-2 self-center justify-self-start text-4xl font-black text-amber-300";
    }

    if (optionId === "q5-b") {
      return "col-start-2 row-start-1 self-start justify-self-end text-sm font-serif text-zinc-200";
    }

    if (optionId === "q5-c") {
      return "col-start-2 row-start-2 self-center justify-self-center text-lg font-mono text-fuchsia-300";
    }

    return "col-start-1 row-start-1 self-end justify-self-center text-base font-sans text-cyan-300";
  };

  const renderedOptions =
    question.id === 2
      ? q2Order.map((optionId) => q2OptionMap.get(optionId)).filter((option): option is QuizOption => Boolean(option))
      : question.options;

  return (
    <section className="relative w-full max-w-3xl space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-xl">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-black text-zinc-100">Mərhələ 6: Məntiq Viktorinası</h1>
        <p className="text-sm text-zinc-300">{counterText}</p>
        <p className="text-sm font-semibold text-rose-300">Qalan vaxt: {Math.max(0, Math.ceil(timerSeconds))}s</p>
        <p className="text-sm font-semibold text-amber-300">{statusText}</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="text-xl font-bold text-zinc-100">{question.prompt}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={question.id === 5 ? "grid min-h-[240px] grid-cols-2 grid-rows-2 gap-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}
        >
          {renderedOptions.map((option, index) => {
            const q3Rotation = q3Rotations[option.id] ?? 0;
            const q4Offset = q4Offsets[option.id] ?? { x: 0, y: 0 };
            const isQ3Wrong = question.id === 3 && !option.isCorrect;

            return (
              <motion.button
                key={option.id}
                type="button"
                layout
                onClick={() => handleOptionClick(option)}
                onMouseEnter={() => handleQ4HoverStart(option.id)}
                onMouseLeave={() => handleQ4HoverEnd(option.id)}
                onTouchStart={() => handleQ4TouchStart(option.id)}
                onTouchEnd={() => handleQ4TouchEnd(option.id)}
                onTouchCancel={() => handleQ4TouchEnd(option.id)}
                whileTap={{ scale: 0.96 }}
                animate={{
                  x: q4Offset.x,
                  y: q4Offset.y,
                  rotate: question.id === 3 ? q3Rotation : 0,
                }}
                transition={{ type: "spring", stiffness: 280, damping: 20 }}
                className={`rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 ${
                  isQuizColorSwapActive ? OPTION_COLOR_CLASSES[optionColorOrder[index % optionColorOrder.length]] : ""
                } ${
                  question.id === 5 ? renderQ5OptionClass(option.id) : ""
                } ${isQ3Wrong ? "text-lg" : "text-base"}`}
              >
                {question.id === 1 && option.isCorrect ? (
                  <span className="inline-block rotate-180 tracking-widest text-zinc-100">AԼM∀</span>
                ) : (
                  option.text
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-xs text-zinc-500">
        5/5 düzgün cavab tələb olunur. Sistem sənə psixoloji təzyiq göstərir.
      </p>
    </section>
  );
}


