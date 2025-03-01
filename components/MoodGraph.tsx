"use client";

import { useState, useRef, useEffect } from "react";
import { MOOD_QUADRANTS } from "@/lib/constants/mood";
import {
  format,
  parseISO,
  subDays,
  subMonths,
  subWeeks,
  startOfDay,
  endOfDay,
  addDays,
  setHours,
  setMinutes,
  isSameDay,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWithinInterval,
} from "date-fns";

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

// Time scale options
type TimeScale = "1D" | "1W" | "1M";

const MoodGraph = ({ entries }: MoodGraphProps) => {
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

    // For 1D, organize entries by hour
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

  // Get X position based on time scale
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

  // Format X-axis labels based on time scale
  const formatXAxisLabels = () => {
    if (!displayedEntries || displayedEntries.length === 0) {
      return [];
    }

    if (timeScale === "1D") {
      // For 1D, show hours
      const today = new Date();
      return [
        format(setHours(today, 5), "h a"), // 5 AM
        format(setHours(today, 9), "h a"), // 9 AM
        format(setHours(today, 13), "h a"), // 1 PM
        format(setHours(today, 17), "h a"), // 5 PM
        format(setHours(today, 21), "h a"), // 9 PM
        format(setHours(addDays(today, 1), 0), "h a"), // 12 AM
      ];
    } else {
      // For 1W and 1M, show first and last date
      return [
        format(new Date(displayedEntries[0].timestamp), "MMM d"),
        format(
          new Date(displayedEntries[displayedEntries.length - 1].timestamp),
          "MMM d"
        ),
      ];
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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Mood Trends</h3>

        {/* Time scale selector */}
        <div className="flex bg-gray-700 rounded-lg p-0.5">
          {(["1D", "1W", "1M"] as TimeScale[]).map((scale) => (
            <button
              key={scale}
              className={`px-3 py-1 text-xs rounded-md transition ${
                timeScale === scale
                  ? "bg-blue-500 text-white"
                  : "text-gray-300 hover:bg-gray-600"
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
        className="relative h-56 w-full border-b border-l border-gray-600 mt-2 ml-8"
      >
        {/* Y-axis labels and grid lines */}
        <div className="absolute -left-7 top-0 h-full flex flex-col justify-between">
          <div className="text-xs text-gray-400">+1</div>
          <div className="text-xs text-gray-400 -ml-2">+0.5</div>
          <div className="text-xs text-gray-400 -ml-1">0</div>
          <div className="text-xs text-gray-400 -ml-2">-0.5</div>
          <div className="text-xs text-gray-400">-1</div>
        </div>

        {/* Horizontal grid lines */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-0 w-full h-px bg-gray-700" />
          <div className="absolute top-1/4 w-full h-px bg-gray-700" />
          <div className="absolute top-1/2 w-full h-px bg-gray-700" />
          <div className="absolute top-3/4 w-full h-px bg-gray-700" />
          <div className="absolute bottom-0 w-full h-px bg-gray-700" />
        </div>

        {/* X-axis grid lines for 1D view */}
        {timeScale === "1D" && (
          <div className="absolute top-0 left-0 w-full h-full">
            {[0, 20, 40, 60, 80, 100].map((position) => (
              <div
                key={`x-grid-${position}`}
                className="absolute h-full w-px bg-gray-700/50"
                style={{ left: `${position}%` }}
              />
            ))}
          </div>
        )}

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
                strokeWidth="2"
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
                strokeWidth="2"
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
                    className={`w-3 h-3 rounded-full bg-blue-500 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                      entry.entriesCount > 1
                        ? "ring-1 ring-white ring-opacity-70"
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
                    className={`w-3 h-3 rounded-full bg-red-500 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                      entry.entriesCount > 1
                        ? "ring-1 ring-white ring-opacity-70"
                        : ""
                    }`}
                    style={{ zIndex: 30 }}
                    onMouseMove={(e) => handleMouseMove(e, entry)}
                    onMouseLeave={handleMouseLeave}
                  />
                </div>

                {/* Annotation marker for significant events */}
                {hasEvent && (
                  <div
                    className="absolute transform -translate-x-1/2 pointer-events-none"
                    style={{
                      left: `${xPos}%`,
                      top: "100%",
                    }}
                  >
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
                    {timeScale === "1D"
                      ? format(
                          new Date(hoveredEntry.timestamp),
                          "MMM d, h:mm a"
                        )
                      : format(new Date(hoveredEntry.timestamp), "MMM d, yyyy")}
                  </p>
                  {timeScale !== "1D" && (
                    <span className="text-[10px] text-gray-400">
                      {hoveredEntry.entriesCount} entries
                    </span>
                  )}
                </div>

                {timeScale === "1D" && (
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-2 h-2 rounded-full ${getQuadrantColor(
                        hoveredEntry.quadrant
                      )}`}
                    ></div>
                    <p>
                      <span className="font-medium">
                        {hoveredEntry.feeling}
                      </span>
                      <span className="text-gray-400 ml-1">
                        (
                        {
                          MOOD_QUADRANTS[
                            hoveredEntry.quadrant as keyof typeof MOOD_QUADRANTS
                          ]?.name
                        }
                        )
                      </span>
                    </p>
                  </div>
                )}

                {/* Show valence and arousal values */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-[10px] text-gray-400">Valence</p>
                    <p className="font-medium text-blue-400">
                      {getFeelingInfo(hoveredEntry).valence?.toFixed(2) ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Arousal</p>
                    <p className="font-medium text-red-400">
                      {getFeelingInfo(hoveredEntry).arousal?.toFixed(2) ||
                        "N/A"}
                    </p>
                  </div>
                </div>

                {/* Show entry count if aggregated */}
                {hoveredEntry.entriesCount > 1 &&
                  timeScale !== "1D" &&
                  hoveredEntry.originalEntries && (
                    <div className="mt-2 pt-1 border-t border-gray-700">
                      <p className="text-[10px] text-gray-400 mb-1">
                        Entries this day:
                      </p>
                      <div className="max-h-20 overflow-y-auto">
                        {hoveredEntry.originalEntries
                          .slice(0, 3)
                          .map((entry: any, i: number) => (
                            <div
                              key={`entry-${i}`}
                              className="flex items-center gap-1 mb-1"
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${getQuadrantColor(
                                  entry.quadrant
                                )}`}
                              ></div>
                              <span className="text-[10px]">
                                {entry.feeling}
                              </span>
                              <span className="text-[9px] text-gray-400 ml-auto">
                                {format(new Date(entry.timestamp), "h:mm a")}
                              </span>
                            </div>
                          ))}
                        {hoveredEntry.originalEntries.length > 3 && (
                          <p className="text-[9px] text-gray-400 italic">
                            +{hoveredEntry.originalEntries.length - 3} more
                            entries
                          </p>
                        )}
                      </div>
                    </div>
                  )}

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

      {/* X-axis labels */}
      <div className="flex justify-between mt-1 text-xs text-gray-400 ml-8">
        {timeScale === "1D" ? (
          // For 1D, show hour markers
          <div className="w-full flex justify-between">
            {formatXAxisLabels().map((label, index) => (
              <span key={`x-label-${index}`}>{label}</span>
            ))}
          </div>
        ) : (
          // For 1W and 1M, show start and end dates
          displayedEntries.length > 0 && (
            <>
              <span>
                {format(new Date(displayedEntries[0].timestamp), "MMM d")}
              </span>
              {displayedEntries.length > 1 && (
                <span>
                  {format(
                    new Date(
                      displayedEntries[displayedEntries.length - 1].timestamp
                    ),
                    "MMM d"
                  )}
                </span>
              )}
            </>
          )
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
          <span className="text-xs text-gray-300">Valence (pleasantness)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
          <span className="text-xs text-gray-300">Arousal (energy)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-gray-500 ring-1 ring-white ring-opacity-70 mr-2"></div>
          <span className="text-xs text-gray-300">Multiple entries (avg)</span>
        </div>
      </div>
    </div>
  );
};

export default MoodGraph;
