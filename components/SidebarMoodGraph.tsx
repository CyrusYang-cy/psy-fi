"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import Link from "next/link";
import {
  subDays,
  subMonths,
  subWeeks,
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import { MOOD_QUADRANTS } from "@/lib/constants/mood";

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

// Time scale options
type TimeScale = "1D" | "1W" | "1M";

const SidebarMoodGraph = ({ entries }: SidebarMoodGraphProps) => {
  const [hoveredEntry, setHoveredEntry] = useState<any | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>("1W");
  const graphRef = useRef<HTMLDivElement>(null);

  // Sort entries by date
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Filter entries based on selected time scale
  const getFilteredEntries = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (timeScale) {
      case "1D":
        // For 1D, show from 5 AM today to midnight of the next day
        startDate = setMinutes(setHours(startOfDay(now), 5), 0);
        endDate = endOfDay(now);
        break;
      case "1W":
        // For 1W, show the last 7 days
        startDate = startOfDay(subDays(now, 6)); // 6 days ago + today = 7 days
        endDate = endOfDay(now);
        break;
      case "1M":
        // For 1M, show the current month
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfDay(subWeeks(now, 1));
        endDate = endOfDay(now);
    }

    return sortedEntries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    });
  };

  // Aggregate data for time scales
  const getAggregatedData = () => {
    const filteredEntries = getFilteredEntries();

    if (filteredEntries.length === 0) {
      return [];
    }

    // For 1D, return entries as-is
    if (timeScale === "1D") {
      return filteredEntries;
    }

    // For 1W and 1M, aggregate data by day
    const entriesByDay: Record<string, any[]> = {};
    const now = new Date();
    let dateRange: Date[] = [];

    if (timeScale === "1W") {
      // Create array of the last 7 days
      for (let i = 6; i >= 0; i--) {
        dateRange.push(subDays(now, i));
      }
    } else if (timeScale === "1M") {
      // Create array of all days in the current month
      dateRange = eachDayOfInterval({
        start: startOfMonth(now),
        end: endOfMonth(now),
      });
    }

    // Initialize empty arrays for each day
    dateRange.forEach((date) => {
      const dayKey = format(date, "yyyy-MM-dd");
      entriesByDay[dayKey] = [];
    });

    // Group entries by day
    filteredEntries.forEach((entry) => {
      const day = format(new Date(entry.timestamp), "yyyy-MM-dd");
      if (entriesByDay[day] !== undefined) {
        entriesByDay[day].push(entry);
      }
    });

    // Calculate average values for each day
    const aggregatedData: any[] = [];

    Object.entries(entriesByDay).forEach(([day, dayEntries]) => {
      if (dayEntries.length === 0) {
        // Add placeholder for days with no entries
        aggregatedData.push({
          $id: `placeholder-${day}`,
          timestamp: `${day}T12:00:00.000Z`,
          quadrant: "none",
          feeling: "none",
          isPlaceholder: true,
          entriesCount: 0,
        });
        return;
      }

      // Calculate average valence and arousal
      const totalValence = dayEntries.reduce((sum, entry) => {
        const feeling = MOOD_QUADRANTS[
          entry.quadrant as keyof typeof MOOD_QUADRANTS
        ]?.feelings.find((f) => f.name === entry.feeling);
        return sum + (feeling?.valence || 0);
      }, 0);

      const totalArousal = dayEntries.reduce((sum, entry) => {
        const feeling = MOOD_QUADRANTS[
          entry.quadrant as keyof typeof MOOD_QUADRANTS
        ]?.feelings.find((f) => f.name === entry.feeling);
        return sum + (feeling?.arousal || 0);
      }, 0);

      // Use the first entry of the day as a template and update with averages
      const aggregatedEntry = {
        ...dayEntries[0],
        timestamp: `${day}T12:00:00.000Z`, // Set to noon for consistent display
        avgValence: totalValence / dayEntries.length,
        avgArousal: totalArousal / dayEntries.length,
        entriesCount: dayEntries.length,
        originalEntries: dayEntries,
      };

      aggregatedData.push(aggregatedEntry);
    });

    return aggregatedData.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  // Get displayed entries (filtered by time scale)
  const displayedEntries = getAggregatedData();

  // Get feeling information for a specific entry
  const getFeelingInfo = (entry: any) => {
    if (entry.isPlaceholder) {
      return { valence: null, arousal: null };
    }

    const quadrant =
      MOOD_QUADRANTS[entry.quadrant as keyof typeof MOOD_QUADRANTS];
    if (!quadrant) return { valence: 0, arousal: 0 };

    const feeling = quadrant.feelings.find((f) => f.name === entry.feeling);
    if (!feeling) return { valence: 0, arousal: 0 };

    return {
      valence:
        entry.avgValence !== undefined ? entry.avgValence : feeling.valence,
      arousal:
        entry.avgArousal !== undefined ? entry.avgArousal : feeling.arousal,
    };
  };

  // Map valence/arousal values (-1 to 1) to y-axis positions (0-100)
  const getYPosition = (value: number | null) => {
    if (value === null) return 50; // Center for placeholder entries
    // Convert from [-1, 1] to [0, 100]
    return 50 - value * 40;
  };

  // Get X position based on time scale and index
  const getXPosition = (entry: any, index: number, entries: any[]) => {
    if (timeScale === "1D") {
      // For 1D, position based on time of day
      const entryDate = new Date(entry.timestamp);
      const startOfToday = setMinutes(setHours(startOfDay(new Date()), 5), 0); // 5 AM
      const endOfToday = endOfDay(new Date()); // Midnight
      const totalMinutes =
        (endOfToday.getTime() - startOfToday.getTime()) / (1000 * 60);
      const entryMinutes =
        (entryDate.getTime() - startOfToday.getTime()) / (1000 * 60);

      // If entry is before 5 AM, position at start
      if (entryMinutes < 0) return 0;

      // If entry is after midnight, position at end
      if (entryMinutes > totalMinutes) return 100;

      return (entryMinutes / totalMinutes) * 100;
    } else {
      // For 1W and 1M, evenly space entries
      return (index / (entries.length - 1 || 1)) * 100;
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
        <div className="flex">
          {(["1D", "1W", "1M"] as TimeScale[]).map((scale) => (
            <button
              key={scale}
              className={`px-1.5 py-0.5 text-[10px] rounded ${
                timeScale === scale
                  ? "bg-blue-500 text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              onClick={() => setTimeScale(scale)}
            >
              {scale}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={graphRef}
        className="relative h-20 w-full border-b border-l border-gray-600 ml-4 mt-2"
      >
        {/* Y-axis indicators */}
        <div className="absolute -left-2 top-0 h-full flex flex-col justify-between">
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        </div>

        {/* Connect valence points with lines */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          {displayedEntries.map((entry, index, array) => {
            if (index === 0) return null;
            if (entry.isPlaceholder || array[index - 1].isPlaceholder)
              return null;

            const prevEntry = array[index - 1];
            const x1 = getXPosition(prevEntry, index - 1, array);
            const feelingInfo = getFeelingInfo(prevEntry);
            const y1 = getYPosition(feelingInfo.valence);

            const x2 = getXPosition(entry, index, array);
            const currentFeelingInfo = getFeelingInfo(entry);
            const y2 = getYPosition(currentFeelingInfo.valence);

            return (
              <line
                key={`valence-line-${index}`}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>

        {/* Connect arousal points with lines */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          {displayedEntries.map((entry, index, array) => {
            if (index === 0) return null;
            if (entry.isPlaceholder || array[index - 1].isPlaceholder)
              return null;

            const prevEntry = array[index - 1];
            const x1 = getXPosition(prevEntry, index - 1, array);
            const feelingInfo = getFeelingInfo(prevEntry);
            const y1 = getYPosition(feelingInfo.arousal);

            const x2 = getXPosition(entry, index, array);
            const currentFeelingInfo = getFeelingInfo(entry);
            const y2 = getYPosition(currentFeelingInfo.arousal);

            return (
              <line
                key={`arousal-line-${index}`}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="rgba(239, 68, 68, 0.6)"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>

        {/* Graph points */}
        <div className="relative h-full w-full" style={{ zIndex: 10 }}>
          {displayedEntries.map((entry, index, array) => {
            if (entry.isPlaceholder) return null;

            const xPos = getXPosition(entry, index, array);
            const feelingInfo = getFeelingInfo(entry);
            const valencePos = getYPosition(feelingInfo.valence);
            const arousalPos = getYPosition(feelingInfo.arousal);
            const hasEvent = findSignificantEvent(entry.timestamp);

            return (
              <div key={`points-${entry.$id || index}`}>
                {/* Valence point */}
                <div
                  className="absolute"
                  style={{
                    left: `${xPos}%`,
                    top: `${valencePos}%`,
                    zIndex: 20,
                  }}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full bg-blue-500 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                      entry.entriesCount > 1
                        ? "ring-0.5 ring-white ring-opacity-70"
                        : ""
                    }`}
                    style={{ zIndex: 30 }}
                    onMouseMove={(e) => handleMouseMove(e, entry)}
                    onMouseLeave={handleMouseLeave}
                  />
                </div>

                {/* Arousal point */}
                <div
                  className="absolute"
                  style={{
                    left: `${xPos}%`,
                    top: `${arousalPos}%`,
                    zIndex: 20,
                  }}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full bg-red-500 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                      entry.entriesCount > 1
                        ? "ring-0.5 ring-white ring-opacity-70"
                        : ""
                    }`}
                    style={{ zIndex: 30 }}
                    onMouseMove={(e) => handleMouseMove(e, entry)}
                    onMouseLeave={handleMouseLeave}
                  />
                </div>

                {/* Tiny indicator for significant events */}
                {hasEvent && (
                  <div
                    className="absolute transform -translate-x-1/2 pointer-events-none"
                    style={{
                      left: `${xPos}%`,
                      top: "100%",
                    }}
                  >
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
                  {timeScale === "1D"
                    ? format(new Date(hoveredEntry.timestamp), "h:mm a")
                    : format(new Date(hoveredEntry.timestamp), "MMM d")}
                </p>

                {timeScale === "1D" && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${getQuadrantColor(
                        hoveredEntry.quadrant
                      )}`}
                    ></div>
                    <p className="text-[10px]">
                      <span className="font-medium">
                        {hoveredEntry.feeling}
                      </span>
                    </p>
                  </div>
                )}

                {/* Valence and Arousal values */}
                <div className="grid grid-cols-2 gap-1 mt-1 text-[9px]">
                  <div className="flex items-center">
                    <div className="w-1 h-1 rounded-full bg-blue-500 mr-1"></div>
                    <span className="text-blue-400">
                      {getFeelingInfo(hoveredEntry).valence?.toFixed(2) ||
                        "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-1 h-1 rounded-full bg-red-500 mr-1"></div>
                    <span className="text-red-400">
                      {getFeelingInfo(hoveredEntry).arousal?.toFixed(2) ||
                        "N/A"}
                    </span>
                  </div>
                </div>

                {/* Show entry count if aggregated */}
                {hoveredEntry.entriesCount > 1 && (
                  <div className="mt-0.5 text-[9px] text-gray-400">
                    {hoveredEntry.entriesCount} entries
                  </div>
                )}

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

      {/* Legend */}
      <div className="flex justify-between items-center mt-2">
        <div className="flex gap-2 text-[9px] text-gray-400">
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1"></div>
            <span>Valence</span>
          </div>
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1"></div>
            <span>Arousal</span>
          </div>
        </div>
        <Link
          href="/analysis"
          className="text-xs text-blue-400 hover:underline"
        >
          Analysis
        </Link>
      </div>
    </div>
  );
};

export default SidebarMoodGraph;
