"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import Link from "next/link";

type SidebarMoodGraphProps = {
  entries: any[];
};

const SidebarMoodGraph = ({ entries }: SidebarMoodGraphProps) => {
  const [hoveredEntry, setHoveredEntry] = useState<any | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  // Sort entries by date
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Get the last 7 days of entries for the graph
  const recentEntries = sortedEntries.slice(-7);

  // Map quadrants to y-axis positions (0-100)
  const getYPosition = (quadrant: string) => {
    switch (quadrant) {
      case "yellow":
        return 20; // High energy, high pleasantness
      case "red":
        return 40; // High energy, low pleasantness
      case "green":
        return 60; // Low energy, high pleasantness
      case "blue":
        return 80; // Low energy, low pleasantness
      default:
        return 50;
    }
  };

  const handleMouseMove = (e: React.MouseEvent, entry: any) => {
    if (graphRef.current) {
      const rect = graphRef.current.getBoundingClientRect();
      setHoverPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setHoveredEntry(entry);
    }
  };

  const handleMouseLeave = () => {
    setHoveredEntry(null);
    setHoverPosition(null);
  };

  // Get color based on quadrant
  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case "red":
        return "bg-red-500";
      case "blue":
        return "bg-blue-500";
      case "green":
        return "bg-green-500";
      case "yellow":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center p-3 bg-gray-800 rounded-lg">
        <p className="text-gray-300 text-xs">No mood data</p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-white">Recent Moods</h3>
        <Link
          href="/analysis"
          className="text-xs text-blue-400 hover:underline"
        >
          View Analysis
        </Link>
      </div>

      <div
        ref={graphRef}
        className="relative h-20 w-full border-b border-l border-gray-600"
      >
        {/* Graph points */}
        <div className="relative h-full w-full">
          {recentEntries.map((entry, index) => {
            const xPos = (index / (recentEntries.length - 1 || 1)) * 100;
            const yPos = getYPosition(entry.quadrant);

            return (
              <div
                key={entry.$id}
                className={`absolute w-2 h-2 rounded-full ${getQuadrantColor(
                  entry.quadrant
                )} transform -translate-x-1/2 -translate-y-1/2 cursor-pointer`}
                style={{
                  left: `${xPos}%`,
                  top: `${yPos}%`,
                }}
                onMouseMove={(e) => handleMouseMove(e, entry)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}

          {/* Connect points with lines */}
          <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
            {recentEntries.map((entry, index) => {
              if (index === 0) return null;

              const prevEntry = recentEntries[index - 1];
              const x1 = ((index - 1) / (recentEntries.length - 1 || 1)) * 100;
              const y1 = getYPosition(prevEntry.quadrant);
              const x2 = (index / (recentEntries.length - 1 || 1)) * 100;
              const y2 = getYPosition(entry.quadrant);

              return (
                <line
                  key={`line-${index}`}
                  x1={`${x1}%`}
                  y1={`${y1}%`}
                  x2={`${x2}%`}
                  y2={`${y2}%`}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
              );
            })}
          </svg>

          {/* Hover indicator */}
          {hoveredEntry && hoverPosition && (
            <>
              {/* Vertical line */}
              <div
                className="absolute h-full w-px bg-white/50"
                style={{ left: `${hoverPosition.x}px` }}
              />

              {/* Tooltip */}
              <div
                className="absolute z-10 p-1.5 bg-gray-900 text-white text-xs rounded shadow-lg"
                style={{
                  left: `${hoverPosition.x + 5}px`,
                  top: `${hoverPosition.y - 5}px`,
                  maxWidth: "150px",
                }}
              >
                <p className="font-semibold text-[10px]">
                  {format(new Date(hoveredEntry.timestamp), "MMM d")}
                </p>
                <p className="text-[10px]">
                  Feeling:{" "}
                  <span className="font-medium">{hoveredEntry.feeling}</span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidebarMoodGraph;
