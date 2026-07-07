"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const BackgroundRippleEffect = ({
  rows: rowsProp,
  cols: colsProp,
  cellSize = 32,
  className,
}: {
  rows?: number;
  cols?: number;
  cellSize?: number;
  className?: string;
}) => {
  const [clickedCell, setClickedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ rows: 24, cols: 30 });

  useEffect(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const updateDimensions = () => {
      const { width, height } = container.getBoundingClientRect();
      setDimensions({
        cols: colsProp ?? Math.max(20, Math.ceil(width / cellSize) + 2),
        rows: rowsProp ?? Math.max(16, Math.ceil(height / cellSize) + 2),
      });
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(container);
    return () => observer.disconnect();
  }, [cellSize, colsProp, rowsProp]);

  useEffect(() => {
    if (!clickedCell) return;
    const timeout = setTimeout(() => setClickedCell(null), 1200);
    return () => clearTimeout(timeout);
  }, [clickedCell]);

  const rows = rowsProp ?? dimensions.rows;
  const cols = colsProp ?? dimensions.cols;

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 z-[1] min-h-full w-full", className)}
    >
      <div className="relative flex h-full min-h-full w-full items-start justify-center">
        <DivGrid
          rows={rows}
          cols={cols}
          cellSize={cellSize}
          borderColor="var(--cell-border-color, var(--color-auth-grid-border))"
          fillColor="var(--cell-fill-color, var(--color-auth-grid-fill))"
          hoverColor="var(--cell-hover-color, var(--color-auth-grid-hover))"
          clickedCell={clickedCell}
          onCellClick={(row, col) => setClickedCell({ row, col })}
          interactive
        />
      </div>
    </div>
  );
};

type DivGridProps = {
  className?: string;
  rows: number;
  cols: number;
  cellSize: number;
  borderColor: string;
  fillColor: string;
  hoverColor: string;
  clickedCell: { row: number; col: number } | null;
  onCellClick?: (row: number, col: number) => void;
  interactive?: boolean;
};

type CellStyle = React.CSSProperties & {
  ["--delay"]?: string;
  ["--duration"]?: string;
};

const DivGrid = ({
  className,
  rows = 7,
  cols = 30,
  cellSize = 32,
  borderColor = "var(--color-auth-grid-border)",
  fillColor = "var(--color-auth-grid-fill)",
  hoverColor = "var(--color-auth-grid-hover)",
  clickedCell = null,
  onCellClick = () => {},
  interactive = true,
}: DivGridProps) => {
  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, idx) => idx),
    [rows, cols]
  );

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    width: cols * cellSize,
    minHeight: rows * cellSize,
    marginInline: "auto",
  };

  return (
    <div className={cn("relative", className)} style={gridStyle}>
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const distance = clickedCell
          ? Math.hypot(clickedCell.row - rowIdx, clickedCell.col - colIdx)
          : 0;
        const delay = clickedCell ? Math.max(0, distance * 55) : 0;
        const duration = 200 + distance * 80;

        const style: CellStyle = clickedCell
          ? {
              "--delay": `${delay}ms`,
              "--duration": `${duration}ms`,
            }
          : {};

        return (
          <div
            key={idx}
            className={cn(
              "cell group relative border-[0.5px] opacity-50 transition-opacity duration-150 will-change-[opacity,background-color] hover:opacity-75",
              clickedCell && "animate-cell-ripple [animation-fill-mode:none]",
              !interactive && "pointer-events-none"
            )}
            style={{
              backgroundColor: fillColor,
              borderColor: borderColor,
              ...style,
            }}
            onMouseEnter={(e) => {
              if (!clickedCell) {
                e.currentTarget.style.backgroundColor = hoverColor;
              }
            }}
            onMouseLeave={(e) => {
              if (!clickedCell) {
                e.currentTarget.style.backgroundColor = fillColor;
              }
            }}
            onClick={
              interactive ? () => onCellClick?.(rowIdx, colIdx) : undefined
            }
          />
        );
      })}
    </div>
  );
};
