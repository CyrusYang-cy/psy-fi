"use client";

import { useState, useRef, useEffect } from "react";
import { MOOD_QUADRANTS } from "@/lib/constants/mood";
import { format, parseISO } from "date-fns";

type MoodGraphProps = {
  entries: any[];
};

// Define significant events for annotations
const SIGNIFICANT_EVENTS = [
  { date: "2023-06-15", label: "Started new job" },
  { date: "2023-08-01", label: "Vacation" },
  { date: "2023-09-20", label: "Birthday" },
  { date: "2023-11-25", label: "Holiday season" },
  { date: "2024-01-01", label: "New Year" },
  { date: "2024-02-14", label: "Valentine's Day" },
];

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

  // Calculate emotion intensity based on quadrant and feeling
  const getEmotionIntensity = (entry: any) => {
    // This is a simplified calculation - could be more sophisticated
    const intensityMap = {
      yellow: 0.8, // High energy, high pleasantness
      red: 0.9, // High energy, low pleasantness
      green: 0.6, // Low energy, high pleasantness
      blue: 0.7, // Low energy, low pleasantness
    };

    const baseIntensity =
      intensityMap[entry.quadrant as keyof typeof intensityMap] || 0.5;

    // Add some randomness to simulate varying intensities
    const randomFactor = 0.1 * (Math.random() - 0.5);
    return Math.min(Math.max(baseIntensity + randomFactor, 0.1), 1.0).toFixed(
      2
    );
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

  // Find significant events that match entry dates
  const findSignificantEvent = (timestamp: string) => {
    const entryDate = format(new Date(timestamp), "yyyy-MM-dd");
    return SIGNIFICANT_EVENTS.find((event) => event.date === entryDate);
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
        className="relative h-40 w-full border-b border-l border-gray-600 mt-2 ml-8"
      >
        {/* Y-axis labels - simplified to just color names */}
        <div className="absolute -left-8 top-4 text-xs text-yellow-400 font-medium">
          Yellow
        </div>
        <div className="absolute -left-8 top-16 text-xs text-red-400 font-medium">
          Red
        </div>
        <div className="absolute -left-8 top-28 text-xs text-green-400 font-medium">
          Green
        </div>
        <div className="absolute -left-8 top-36 text-xs text-blue-400 font-medium">
          Blue
        </div>

        {/* Connect points with lines - moved before points to ensure points are on top */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
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

        {/* Graph points */}
        <div className="relative h-full w-full" style={{ zIndex: 10 }}>
          {recentEntries.map((entry, index) => {
            const xPos = (index / (recentEntries.length - 1 || 1)) * 100;
            const yPos = getYPosition(entry.quadrant);
            const hasEvent = findSignificantEvent(entry.timestamp);

            return (
              <div
                key={entry.$id}
                className="absolute"
                style={{
                  left: `${xPos}%`,
                  top: `${yPos}%`,
                  zIndex: 20,
                }}
              >
                {/* The mood point */}
                <div
                  className={`w-3 h-3 rounded-full ${getQuadrantColor(
                    entry.quadrant
                  )} transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                    hasEvent ? "ring-2 ring-white ring-opacity-70" : ""
                  }`}
                  style={{ zIndex: 30 }}
                  onMouseMove={(e) => handleMouseMove(e, entry)}
                  onMouseLeave={handleMouseLeave}
                />

                {/* Annotation marker for significant events */}
                {hasEvent && (
                  <div className="absolute top-4 left-0 transform -translate-x-1/2 pointer-events-none">
                    <div className="w-0.5 h-4 bg-white/50"></div>
                    <div className="text-xs text-white/70 whitespace-nowrap transform -rotate-45 origin-top-left mt-1">
                      {hasEvent.label}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Hover indicator */}
          {hoveredEntry && hoverPosition && (
            <>
              {/* Vertical line */}
              <div
                className="absolute h-full w-px bg-white/50 pointer-events-none"
                style={{ left: `${hoverPosition.x}px`, zIndex: 15 }}
              />

              {/* Enhanced tooltip with more data */}
              <div
                className="absolute z-50 p-3 bg-gray-900 text-white text-xs rounded shadow-lg border border-gray-700 pointer-events-none"
                style={{
                  left: `${hoverPosition.x + 10}px`,
                  top: `${hoverPosition.y - 10}px`,
                  maxWidth: "220px",
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="font-semibold">
                    {format(new Date(hoveredEntry.timestamp), "MMM d, yyyy")}
                  </p>
                  <span className="text-[10px] text-gray-400">
                    {format(new Date(hoveredEntry.timestamp), "h:mm a")}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-2 h-2 rounded-full ${getQuadrantColor(
                      hoveredEntry.quadrant
                    )}`}
                  ></div>
                  <p>
                    <span className="font-medium">{hoveredEntry.feeling}</span>
                    <span className="text-gray-400 ml-1">
                      (
                      {
                        MOOD_QUADRANTS[
                          hoveredEntry.quadrant as keyof typeof MOOD_QUADRANTS
                        ].name
                      }
                      )
                    </span>
                  </p>
                </div>

                <div className="mt-1 mb-2">
                  <p className="text-[10px] text-gray-400">Emotion Intensity</p>
                  <div className="w-full bg-gray-700 h-1.5 rounded-full mt-1">
                    <div
                      className={`h-full rounded-full ${
                        hoveredEntry.quadrant === "red"
                          ? "bg-red-500"
                          : hoveredEntry.quadrant === "blue"
                          ? "bg-blue-500"
                          : hoveredEntry.quadrant === "green"
                          ? "bg-green-500"
                          : "bg-yellow-500"
                      }`}
                      style={{
                        width: `${
                          parseFloat(getEmotionIntensity(hoveredEntry)) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                {hoveredEntry.note && (
                  <p className="mt-1 italic border-t border-gray-700 pt-1">
                    "{hoveredEntry.note}"
                  </p>
                )}

                {findSignificantEvent(hoveredEntry.timestamp) && (
                  <div className="mt-1 pt-1 border-t border-gray-700">
                    <p className="text-[10px] text-gray-400">Event</p>
                    <p className="text-white/90">
                      {findSignificantEvent(hoveredEntry.timestamp)?.label}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* X-axis dates */}
      <div className="flex justify-between mt-1 text-xs text-gray-400 ml-8">
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

      {/* Legend for annotations */}
      <div className="mt-4 flex items-center">
        <div className="w-3 h-3 rounded-full bg-gray-500 ring-2 ring-white ring-opacity-70 mr-2"></div>
        <span className="text-xs text-gray-300">Significant event</span>
      </div>
    </div>
  );
};

export default MoodGraph;
