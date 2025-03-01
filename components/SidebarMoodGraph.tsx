"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import Link from "next/link";

type SidebarMoodGraphProps = {
  entries: any[];
};

// Define significant events for annotations (simplified version)
const SIGNIFICANT_EVENTS = [
  { date: "2023-06-15", label: "New job" },
  { date: "2023-08-01", label: "Vacation" },
  { date: "2023-09-20", label: "Birthday" },
  { date: "2023-11-25", label: "Holiday" },
  { date: "2024-01-01", label: "New Year" },
  { date: "2024-02-14", label: "Valentine's" },
];

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
        className="relative h-20 w-full border-b border-l border-gray-600 ml-4"
      >
        {/* Y-axis labels - simplified to just color dots */}
        <div className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-yellow-400"></div>
        <div className="absolute -left-4 top-7 w-2 h-2 rounded-full bg-red-400"></div>
        <div className="absolute -left-4 top-12 w-2 h-2 rounded-full bg-green-400"></div>
        <div className="absolute -left-4 top-[18px] w-2 h-2 rounded-full bg-blue-400"></div>

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
                  className={`w-2 h-2 rounded-full ${getQuadrantColor(
                    entry.quadrant
                  )} transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                    hasEvent ? "ring-1 ring-white ring-opacity-70" : ""
                  }`}
                  style={{ zIndex: 30 }}
                  onMouseMove={(e) => handleMouseMove(e, entry)}
                  onMouseLeave={handleMouseLeave}
                />

                {/* Tiny indicator for significant events */}
                {hasEvent && (
                  <div className="absolute top-2 left-0 transform -translate-x-1/2 pointer-events-none">
                    <div className="w-0.5 h-2 bg-white/50"></div>
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

              {/* Enhanced tooltip */}
              <div
                className="absolute z-50 p-1.5 bg-gray-900 text-white text-xs rounded shadow-lg border border-gray-700 pointer-events-none"
                style={{
                  left: `${hoverPosition.x + 5}px`,
                  top: `${hoverPosition.y - 5}px`,
                  maxWidth: "150px",
                }}
              >
                <p className="font-semibold text-[10px]">
                  {format(new Date(hoveredEntry.timestamp), "MMM d")}
                  <span className="font-normal text-gray-400 ml-1">
                    {format(new Date(hoveredEntry.timestamp), "h:mm a")}
                  </span>
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${getQuadrantColor(
                      hoveredEntry.quadrant
                    )}`}
                  ></div>
                  <p className="text-[10px]">
                    <span className="font-medium">{hoveredEntry.feeling}</span>
                  </p>
                </div>

                {/* Emotion intensity bar */}
                <div className="mt-1">
                  <div className="w-full bg-gray-700 h-1 rounded-full">
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

                {/* Event indicator */}
                {findSignificantEvent(hoveredEntry.timestamp) && (
                  <p className="text-[9px] text-gray-400 mt-1">
                    {findSignificantEvent(hoveredEntry.timestamp)?.label}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidebarMoodGraph;
