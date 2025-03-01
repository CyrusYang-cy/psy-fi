"use client";

import { useState, useRef, useEffect } from "react";
import { MOOD_QUADRANTS } from "@/lib/constants/mood";
import { format } from "date-fns";

type MoodGraphProps = {
  entries: any[];
};

const MoodGraph = ({ entries }: MoodGraphProps) => {
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

  // Get the last 14 days of entries for the graph
  const recentEntries = sortedEntries.slice(-14);

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
      <div className="text-center p-4 bg-gray-800 rounded-xl">
        <p className="text-gray-300">No mood data available.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-xl">
      <h3 className="text-lg font-semibold mb-4 text-white">Mood Trends</h3>

      <div
        ref={graphRef}
        className="relative h-40 w-full border-b border-l border-gray-600 mt-2"
      >
        {/* Y-axis labels */}
        <div className="absolute -left-20 top-4 text-xs text-yellow-400">
          High Energy, High Pleasant
        </div>
        <div className="absolute -left-20 top-16 text-xs text-red-400">
          High Energy, Low Pleasant
        </div>
        <div className="absolute -left-20 top-28 text-xs text-green-400">
          Low Energy, High Pleasant
        </div>
        <div className="absolute -left-20 top-36 text-xs text-blue-400">
          Low Energy, Low Pleasant
        </div>

        {/* Graph points */}
        <div className="relative h-full w-full">
          {recentEntries.map((entry, index) => {
            const xPos = (index / (recentEntries.length - 1 || 1)) * 100;
            const yPos = getYPosition(entry.quadrant);

            return (
              <div
                key={entry.$id}
                className={`absolute w-3 h-3 rounded-full ${getQuadrantColor(
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
                className="absolute z-10 p-2 bg-gray-900 text-white text-xs rounded shadow-lg"
                style={{
                  left: `${hoverPosition.x + 10}px`,
                  top: `${hoverPosition.y - 10}px`,
                  maxWidth: "200px",
                }}
              >
                <p className="font-semibold">
                  {format(new Date(hoveredEntry.timestamp), "MMM d, yyyy")}
                </p>
                <p>
                  Feeling:{" "}
                  <span className="font-medium">{hoveredEntry.feeling}</span>
                </p>
                <p>
                  Quadrant:{" "}
                  <span className="font-medium">
                    {
                      MOOD_QUADRANTS[
                        hoveredEntry.quadrant as keyof typeof MOOD_QUADRANTS
                      ].name
                    }
                  </span>
                </p>
                {hoveredEntry.note && (
                  <p className="mt-1 italic">"{hoveredEntry.note}"</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* X-axis dates */}
      <div className="flex justify-between mt-1 text-xs text-gray-400">
        {recentEntries.length > 0 && (
          <>
            <span>{format(new Date(recentEntries[0].timestamp), "MMM d")}</span>
            {recentEntries.length > 1 && (
              <span>
                {format(
                  new Date(recentEntries[recentEntries.length - 1].timestamp),
                  "MMM d"
                )}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MoodGraph;
