"use client";

import React, { useState, useEffect, useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface ContainerTextFlipProps {
  words?: string[];
  interval?: number;
  className?: string;
  textClassName?: string;
  wordClassNames?: Partial<Record<string, string>>;
  animationDuration?: number;
}

const HORIZONTAL_PADDING = 32;

export function ContainerTextFlip({
  words = ["better", "modern", "beautiful", "awesome"],
  interval = 3000,
  className,
  textClassName,
  wordClassNames,
  animationDuration = 700,
}: ContainerTextFlipProps) {
  const id = useId();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [width, setWidth] = useState<number | "auto">("auto");
  const textRef = React.useRef<HTMLSpanElement>(null);

  const updateWidthForWord = () => {
    if (textRef.current) {
      setWidth(textRef.current.scrollWidth + HORIZONTAL_PADDING);
    }
  };

  useEffect(() => {
    updateWidthForWord();
  }, [currentWordIndex]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, interval);

    return () => clearInterval(intervalId);
  }, [words, interval]);

  const hasCustomStyle = Boolean(
    className && /\b(bg[-:]|from-|to-|\[background)/.test(className)
  );

  return (
    <motion.div
      layout
      layoutId={`words-here-${id}`}
      animate={{ width }}
      transition={{ duration: animationDuration / 2000 }}
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg text-center font-bold",
        !hasCustomStyle && [
          "pt-2 pb-3 text-4xl text-black md:text-7xl dark:text-white",
          "[background:linear-gradient(to_bottom,#f3f4f6,#e5e7eb)]",
          "shadow-[inset_0_-1px_#d1d5db,inset_0_0_0_1px_#d1d5db,_0_4px_8px_#d1d5db]",
          "dark:[background:linear-gradient(to_bottom,#374151,#1f2937)]",
          "dark:shadow-[inset_0_-1px_#10171e,inset_0_0_0_1px_hsla(205,89%,46%,.24),_0_4px_8px_#00000052]",
        ],
        className
      )}
      key={words[currentWordIndex]}
    >
      <motion.span
        transition={{
          duration: animationDuration / 1000,
          ease: "easeInOut",
        }}
        className={cn(
          "inline-block whitespace-nowrap",
          textClassName,
          wordClassNames?.[words[currentWordIndex]]
        )}
        ref={textRef}
        layoutId={`word-div-${words[currentWordIndex]}-${id}`}
      >
        {words[currentWordIndex].split("").map((letter, index) => (
          <motion.span
            key={index}
            initial={{
              opacity: 0,
              filter: "blur(10px)",
            }}
            animate={{
              opacity: 1,
              filter: "blur(0px)",
            }}
            transition={{
              delay: index * 0.02,
            }}
          >
            {letter}
          </motion.span>
        ))}
      </motion.span>
    </motion.div>
  );
}
