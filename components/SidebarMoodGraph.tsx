"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { format, differenceInDays, addDays } from "date-fns";
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
type TimeScale = "1D" | "1W" | "1M" | "All";

const SidebarMoodGraph = ({ entries }: SidebarMoodGraphProps) => {
  const [hoveredEntryIndex, setHoveredEntryIndex] = useState<number | null>(
    null
  );
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>("1W");
  const graphRef = useRef<HTMLDivElement>(null);

  // Sort entries by date - memoized to avoid unnecessary re-sorting
  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    [entries]
  );

  // Filter entries based on selected time scale
  const getFilteredEntries = useCallback(() => {
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
        // Show a full month (not just current month)
        startDate = startOfDay(subDays(now, 30));
        endDate = endOfDay(now);
        break;
      case "All":
        // Return all entries
        return sortedEntries;
      default:
        startDate = startOfDay(subWeeks(now, 1));
        endDate = endOfDay(now);
    }

    // Convert timestamps to ISO strings for consistent comparison
    const startTimestamp = startDate.toISOString();
    const endTimestamp = endDate.toISOString();

    return sortedEntries.filter((entry) => {
      // Ensure consistent date format comparison
      const entryTimestamp = new Date(entry.timestamp).toISOString();
      return entryTimestamp >= startTimestamp && entryTimestamp <= endTimestamp;
    });
  }, [timeScale, sortedEntries]);

  // Aggregate data for time scales
  const getAggregatedData = useCallback(() => {
    const filteredEntries = getFilteredEntries();

    if (filteredEntries.length === 0) {
      return [];
    }

    // For 1D, return entries as-is
    if (timeScale === "1D") {
      return filteredEntries;
    }

    // For 1W, 1M, and All, aggregate data by day
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
    } else if (timeScale === "All" && filteredEntries.length > 0) {
      // For "All", create a date range from the first to the last entry
      const firstEntryDate = new Date(filteredEntries[0].timestamp);
      const lastEntryDate = new Date(
        filteredEntries[filteredEntries.length - 1].timestamp
      );

      // Create array of all days between first and last entry
      const dayDiff = differenceInDays(lastEntryDate, firstEntryDate);

      // If there are too many days, just use the days with entries
      if (dayDiff > 60) {
        // Just use the days that have entries
        const uniqueDays = new Set<string>();
        filteredEntries.forEach((entry) => {
          const day = format(new Date(entry.timestamp), "yyyy-MM-dd");
          uniqueDays.add(day);
        });

        // Convert unique day strings back to Date objects
        dateRange = Array.from(uniqueDays).map((day) => new Date(day));
      } else {
        // Create a continuous range of days
        for (let i = 0; i <= dayDiff; i++) {
          dateRange.push(addDays(firstEntryDate, i));
        }
      }
    }

    // Initialize empty arrays for each day
    dateRange.forEach((date) => {
      const dayKey = format(date, "yyyy-MM-dd");
      entriesByDay[dayKey] = [];
    });

    // Group entries by day
    filteredEntries.forEach((entry) => {
      const day = format(new Date(entry.timestamp), "yyyy-MM-dd");
      if (!entriesByDay[day]) {
        // For "All" view, we might encounter days not in our initial range
        entriesByDay[day] = [];
      }
      entriesByDay[day].push(entry);
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
  }, [getFilteredEntries, timeScale]);

  // Get displayed entries (filtered by time scale)
  const displayedEntries = useMemo(
    () => getAggregatedData(),
    [getAggregatedData]
  );

  // Get feeling information for a specific entry
  const getFeelingInfo = useCallback((entry: any) => {
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
  }, []);

  // Map valence/arousal values (-1 to 1) to y-axis positions (0-100)
  const getYPosition = useCallback((value: number | null) => {
    if (value === null) return 50; // Center for placeholder entries
    // Convert from [-1, 1] to [0, 100]
    return 50 - value * 40;
  }, []);

  // Get X position based on time scale and index
  const getXPosition = useCallback(
    (entry: any, index: number, entries: any[]) => {
      if (timeScale === "1D") {
        // For 1D, position based on time of day
        const entryDate = new Date(entry.timestamp);
        const now = new Date();
        const dayStart = setMinutes(setHours(startOfDay(now), 5), 0); // 5 AM
        const dayEnd = endOfDay(now); // Midnight
        const totalMinutes =
          (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60);
        const entryMinutes =
          (entryDate.getTime() - dayStart.getTime()) / (1000 * 60);

        // Add padding to left and right (5% on each side)
        return 5 + (entryMinutes / totalMinutes) * 90;
      }

      if (timeScale === "All" && entries.length > 1) {
        // For "All", position based on date relative to first and last entry
        const firstEntryDate = new Date(entries[0].timestamp).getTime();
        const lastEntryDate = new Date(
          entries[entries.length - 1].timestamp
        ).getTime();
        const entryDate = new Date(entry.timestamp).getTime();

        // Calculate position as percentage of total time range
        const totalTimeRange = lastEntryDate - firstEntryDate;
        const entryTimePosition = entryDate - firstEntryDate;

        // Add padding to left and right (5% on each side)
        return 5 + (entryTimePosition / totalTimeRange) * 90;
      }

      // For 1W and 1M, evenly space entries with padding
      if (entries.length <= 1) return 50; // Center if only one entry
      return 5 + (index / (entries.length - 1)) * 90;
    },
    [timeScale]
  );

  // Handle mouse movement for finding closest point on the line
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!graphRef.current || displayedEntries.length === 0) return;

      const rect = graphRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const relativeX = mouseX / rect.width; // Position as percentage of graph width

      // Find the closest entry to the current mouse position
      let closestIdx = 0;
      let closestDistance = Infinity;

      displayedEntries.forEach((entry, idx) => {
        if (entry.isPlaceholder) return;

        const xPos = getXPosition(entry, idx, displayedEntries) / 100; // Convert to 0-1 scale
        const distance = Math.abs(relativeX - xPos);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIdx = idx;
        }
      });

      setHoveredEntryIndex(closestIdx);
      setHoverPosition({
        x: mouseX,
        y: e.clientY - rect.top,
      });
    },
    [displayedEntries, getXPosition]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredEntryIndex(null);
    setHoverPosition(null);
  }, []);

  // Get color based on quadrant
  const getQuadrantColor = useCallback((quadrant: string) => {
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
  }, []);

  // Find significant events that match entry dates
  const findSignificantEvent = useCallback((timestamp: string) => {
    const entryDate = format(new Date(timestamp), "yyyy-MM-dd");
    return SIGNIFICANT_EVENTS.find((event) => event.date === entryDate);
  }, []);

  // Generate mood line paths with memoization
  const moodLines = useMemo(() => {
    if (!displayedEntries || displayedEntries.length <= 1)
      return { valenceLines: [], arousalLines: [] };

    const valenceLines = [];
    const arousalLines = [];

    for (let i = 1; i < displayedEntries.length; i++) {
      const entry = displayedEntries[i];
      const prevEntry = displayedEntries[i - 1];

      if (entry.isPlaceholder || prevEntry.isPlaceholder) continue;

      const x1 = getXPosition(prevEntry, i - 1, displayedEntries);
      const prevFeelingInfo = getFeelingInfo(prevEntry);

      const x2 = getXPosition(entry, i, displayedEntries);
      const currentFeelingInfo = getFeelingInfo(entry);

      if (
        prevFeelingInfo.valence !== null &&
        currentFeelingInfo.valence !== null
      ) {
        const y1 = getYPosition(prevFeelingInfo.valence);
        const y2 = getYPosition(currentFeelingInfo.valence);

        valenceLines.push({
          key: `valence-${i}`,
          x1,
          y1,
          x2,
          y2,
        });
      }

      if (
        prevFeelingInfo.arousal !== null &&
        currentFeelingInfo.arousal !== null
      ) {
        const y1 = getYPosition(prevFeelingInfo.arousal);
        const y2 = getYPosition(currentFeelingInfo.arousal);

        arousalLines.push({
          key: `arousal-${i}`,
          x1,
          y1,
          x2,
          y2,
        });
      }
    }

    return { valenceLines, arousalLines };
  }, [displayedEntries, getXPosition, getFeelingInfo, getYPosition]);

  // Get the hovered entry
  const hoveredEntry = useMemo(
    () =>
      hoveredEntryIndex !== null ? displayedEntries[hoveredEntryIndex] : null,
    [hoveredEntryIndex, displayedEntries]
  );

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
          {(["1D", "1W", "1M", "All"] as TimeScale[]).map((scale) => (
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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Y-axis indicators */}
        <div className="absolute -left-2 top-0 h-full flex flex-col justify-between">
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        </div>

        {/* Combined SVG for both valence and arousal lines */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          {/* Valence lines (blue) */}
          {moodLines.valenceLines?.map((line) => (
            <line
              key={line.key}
              x1={`${line.x1}%`}
              y1={`${line.y1}%`}
              x2={`${line.x2}%`}
              y2={`${line.y2}%`}
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth="1.5"
            />
          ))}

          {/* Arousal lines (red) */}
          {moodLines.arousalLines?.map((line) => (
            <line
              key={line.key}
              x1={`${line.x1}%`}
              y1={`${line.y1}%`}
              x2={`${line.x2}%`}
              y2={`${line.y2}%`}
              stroke="rgba(239, 68, 68, 0.8)"
              strokeWidth="1.5"
            />
          ))}
        </svg>

        {/* Significant event indicators */}
        <div className="relative h-full w-full" style={{ zIndex: 10 }}>
          {displayedEntries.map((entry, index) => {
            if (entry.isPlaceholder) return null;
            const hasEvent = findSignificantEvent(entry.timestamp);
            if (!hasEvent) return null;

            const xPos = getXPosition(entry, index, displayedEntries);

            return (
              <div
                key={`event-${entry.$id || index}`}
                className="absolute transform -translate-x-1/2 pointer-events-none"
                style={{
                  left: `${xPos}%`,
                  top: "100%",
                }}
              >
                <div className="w-0.5 h-2 bg-white/50"></div>
              </div>
            );
          })}

          {/* Hover indicator */}
          {hoveredEntry && hoverPosition && (
            <>
              {/* Vertical line */}
              <div
                className="absolute h-full w-px bg-white/70 pointer-events-none"
                style={{ left: `${hoverPosition.x}px`, zIndex: 15 }}
              />

              {/* Enhanced tooltip */}
              <div
                className="absolute z-50 p-1.5 bg-gray-900 text-white text-xs rounded shadow-lg border border-gray-700 pointer-events-none"
                style={{
                  left: `${hoverPosition.x + 5}px`,
                  top: `${Math.min(hoverPosition.y - 5, 60)}px`,
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
                    <div className="w-2 h-0.5 bg-blue-500 mr-1"></div>
                    <span className="text-blue-400">
                      {getFeelingInfo(hoveredEntry).valence?.toFixed(2) ||
                        "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-0.5 bg-red-500 mr-1"></div>
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
            <div className="w-2 h-0.5 bg-blue-500 mr-1"></div>
            <span>Valence</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-0.5 bg-red-500 mr-1"></div>
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
