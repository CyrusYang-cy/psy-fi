"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { MOOD_QUADRANTS } from "@/lib/constants/mood";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  addDays,
  setHours,
  setMinutes,
  isSameDay,
  differenceInDays,
} from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

type MoodGraphProps = {
  entries: any[];
};

// Define significant events for annotations - could be moved to a config file
const SIGNIFICANT_EVENTS = [
  { date: "2023-06-15", label: "Started new job" },
  { date: "2023-08-01", label: "Vacation" },
  { date: "2023-09-20", label: "Birthday" },
  { date: "2023-11-25", label: "Holiday season" },
  { date: "2024-01-01", label: "New Year" },
  { date: "2024-02-14", label: "Valentine's Day" },
];

// Time scale options
type TimeScale = "1D" | "1W" | "1M" | "All";

// Format helpers to avoid repeated formatting code
const formatters = {
  dayMonthYear: (date: Date) => format(date, "MMM d, yyyy"),
  dayMonth: (date: Date) => format(date, "MMM d"),
  hourMinute: (date: Date) => format(date, "h:mm a"),
  dayMonthHourMinute: (date: Date) => format(date, "MMM d, h:mm a"),
  fullMonthDay: (date: Date) => format(date, "MMMM d, yyyy"),
  dayKey: (date: Date) => format(date, "yyyy-MM-dd"),
};

const MoodGraph = ({ entries }: MoodGraphProps) => {
  const [hoveredEntryIndex, setHoveredEntryIndex] = useState<number | null>(
    null
  );
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>("1W");
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const graphRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sort entries by date - memoized to avoid unnecessary re-sorting
  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    [entries]
  );

  // Calculate date ranges for different time scales
  const getDateRange = useCallback(() => {
    let startDate: Date;
    let endDate: Date = endOfDay(selectedDate);

    switch (timeScale) {
      case "1D":
        // For 1D, show from 5 AM to midnight of the selected day
        startDate = setMinutes(setHours(startOfDay(selectedDate), 5), 0);
        break;
      case "1W":
        // For 1W, show 7 days ending on the selected date
        if (isSameDay(selectedDate, new Date())) {
          // If today is selected, show last 7 days
          startDate = startOfDay(subDays(selectedDate, 6));
        } else {
          // Use the selected date as the center of a week window (±3 days)
          startDate = startOfDay(subDays(selectedDate, 3));
          endDate = endOfDay(addDays(selectedDate, 3));
        }
        break;
      case "1M":
        // For 1M, show 30 days ending on the selected date
        startDate = startOfDay(subDays(selectedDate, 29));
        break;
      case "All":
        // For All, we'll use first/last entry times later
        return null;
      default:
        startDate = startOfDay(subDays(selectedDate, 6));
    }

    return { startDate, endDate };
  }, [timeScale, selectedDate]);

  // Filter entries based on selected time scale and date
  const getFilteredEntries = useCallback(() => {
    if (timeScale === "All") {
      return sortedEntries;
    }

    const dateRange = getDateRange();
    if (!dateRange) return sortedEntries;

    const { startDate, endDate } = dateRange;

    // Convert timestamps to ISO strings for consistent comparison
    const startTimestamp = startDate.toISOString();
    const endTimestamp = endDate.toISOString();

    return sortedEntries.filter((entry) => {
      const entryTimestamp = new Date(entry.timestamp).toISOString();
      return entryTimestamp >= startTimestamp && entryTimestamp <= endTimestamp;
    });
  }, [timeScale, getDateRange, sortedEntries]);

  // Get feeling information for a specific entry
  const getFeelingInfo = useCallback((entry: any) => {
    if (!entry || entry.isPlaceholder) {
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

  // Create date ranges for aggregation based on time scale
  const createDateRangeArray = useCallback(
    (filteredEntries: any[]) => {
      if (timeScale === "1D") return [];

      let dateRange: Date[] = [];

      if (timeScale === "1W") {
        // Create array of days in the week
        for (let i = 6; i >= 0; i--) {
          dateRange.push(subDays(selectedDate, i));
        }
      } else if (timeScale === "1M") {
        // Create array of last 30 days
        for (let i = 29; i >= 0; i--) {
          dateRange.push(subDays(selectedDate, i));
        }
      } else if (timeScale === "All" && filteredEntries.length > 0) {
        const firstEntryDate = new Date(filteredEntries[0].timestamp);
        const lastEntryDate = new Date(
          filteredEntries[filteredEntries.length - 1].timestamp
        );
        const dayDiff = differenceInDays(lastEntryDate, firstEntryDate);

        // If there are too many days, just use the days with entries
        if (dayDiff > 60) {
          const uniqueDays = new Set<string>();
          filteredEntries.forEach((entry) => {
            uniqueDays.add(formatters.dayKey(new Date(entry.timestamp)));
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

      return dateRange;
    },
    [timeScale, selectedDate]
  );

  // Aggregate entries by day and calculate average mood values
  const aggregateEntriesByDay = useCallback(
    (filteredEntries: any[], dateRange: Date[]) => {
      const entriesByDay: Record<string, any[]> = {};

      // Initialize empty arrays for each day
      dateRange.forEach((date) => {
        entriesByDay[formatters.dayKey(date)] = [];
      });

      // Group entries by day
      filteredEntries.forEach((entry) => {
        const day = formatters.dayKey(new Date(entry.timestamp));
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

        // Calculate total valence and arousal
        let totalValence = 0;
        let totalArousal = 0;
        let validEntries = 0;

        dayEntries.forEach((entry) => {
          const feelingInfo = getFeelingInfo(entry);
          if (feelingInfo.valence !== null && feelingInfo.arousal !== null) {
            totalValence += feelingInfo.valence;
            totalArousal += feelingInfo.arousal;
            validEntries++;
          }
        });

        // Use the first entry of the day as a template and update with averages
        const avgValence = validEntries > 0 ? totalValence / validEntries : 0;
        const avgArousal = validEntries > 0 ? totalArousal / validEntries : 0;

        const aggregatedEntry = {
          ...dayEntries[0],
          timestamp: `${day}T12:00:00.000Z`, // Set to noon for consistent display
          avgValence,
          avgArousal,
          entriesCount: dayEntries.length,
          originalEntries: dayEntries,
        };

        aggregatedData.push(aggregatedEntry);
      });

      return aggregatedData.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    },
    [getFeelingInfo]
  );

  // Aggregate data for time scales
  const getAggregatedData = useCallback(() => {
    const filteredEntries = getFilteredEntries();
    if (filteredEntries.length === 0) return [];

    // For 1D, no aggregation needed
    if (timeScale === "1D") return filteredEntries;

    // For other time scales, aggregate by day
    const dateRange = createDateRangeArray(filteredEntries);
    if (dateRange.length === 0) return filteredEntries;

    return aggregateEntriesByDay(filteredEntries, dateRange);
  }, [
    getFilteredEntries,
    timeScale,
    createDateRangeArray,
    aggregateEntriesByDay,
  ]);

  // Memoize the displayed entries to avoid recalculations
  const displayedEntries = useMemo(
    () => getAggregatedData(),
    [getAggregatedData]
  );

  // Map valence/arousal values (-1 to 1) to y-axis positions (10-90)
  const getYPosition = useCallback((value: number | null) => {
    if (value === null) return 50; // Center for placeholder entries
    // Convert from [-1, 1] to [10, 90] with padding to prevent touching edges
    return 50 - value * 35;
  }, []);

  // Get X position based on time scale
  const getXPosition = useCallback(
    (entry: any, index: number, entries: any[]) => {
      if (timeScale === "1D") {
        // For 1D, position based on time of day
        const entryDate = new Date(entry.timestamp);
        const dayStart = setMinutes(setHours(startOfDay(selectedDate), 5), 0); // 5 AM
        const dayEnd = endOfDay(selectedDate); // Midnight
        const totalMinutes =
          (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60);
        const entryMinutes =
          (entryDate.getTime() - dayStart.getTime()) / (1000 * 60);

        // Add padding to left and right (5% on each side)
        const paddedPosition = 5 + (entryMinutes / totalMinutes) * 90;

        // If entry is outside the time range, position at edges
        if (entryMinutes < 0) return 5;
        if (entryMinutes > totalMinutes) return 95;

        return paddedPosition;
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
    [timeScale, selectedDate]
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
    const entryDate = formatters.dayKey(new Date(timestamp));
    return SIGNIFICANT_EVENTS.find((event) => event.date === entryDate);
  }, []);

  // Format X-axis labels based on time scale
  const formatXAxisLabels = useCallback(() => {
    if (!displayedEntries || displayedEntries.length === 0) return [];

    if (timeScale === "1D") {
      // For 1D, show hours with padding
      const today = selectedDate;
      return [
        format(setHours(today, 5), "h a"), // 5 AM
        format(setHours(today, 9), "h a"), // 9 AM
        format(setHours(today, 13), "h a"), // 1 PM
        format(setHours(today, 17), "h a"), // 5 PM
        format(setHours(today, 21), "h a"), // 9 PM
        format(setHours(addDays(today, 1), 0), "h a"), // 12 AM
      ];
    }

    if (timeScale === "All" && displayedEntries.length > 0) {
      // For All, show more distributed dates
      const firstDate = new Date(displayedEntries[0].timestamp);
      const lastDate = new Date(
        displayedEntries[displayedEntries.length - 1].timestamp
      );
      const totalDays = differenceInDays(lastDate, firstDate);

      // Create 5 evenly spaced labels
      const labels = [];
      for (let i = 0; i < 5; i++) {
        const daysToAdd = Math.floor((totalDays * i) / 4);
        labels.push(formatters.dayMonth(addDays(firstDate, daysToAdd)));
      }
      return labels;
    }

    // For 1W and 1M, show first and last date
    return [
      formatters.dayMonth(new Date(displayedEntries[0].timestamp)),
      formatters.dayMonth(
        new Date(displayedEntries[displayedEntries.length - 1].timestamp)
      ),
    ];
  }, [displayedEntries, timeScale, selectedDate]);

  // Handle day selection from calendar
  const handleDaySelect = useCallback((day: Date | undefined) => {
    if (day) {
      setSelectedDate(day);
      setShowCalendar(false);
    }
  }, []);

  // Get date range display for the header
  const getDateRangeDisplay = useCallback(() => {
    if (timeScale === "All" && sortedEntries.length > 0) {
      const firstEntry = sortedEntries[0];
      const lastEntry = sortedEntries[sortedEntries.length - 1];
      return `${formatters.dayMonthYear(
        new Date(firstEntry.timestamp)
      )} - ${formatters.dayMonthYear(new Date(lastEntry.timestamp))}`;
    }

    if (timeScale === "1D") {
      return formatters.fullMonthDay(selectedDate);
    }

    if (timeScale === "1W") {
      const startDate = subDays(selectedDate, 6);
      return `${formatters.dayMonth(startDate)} - ${formatters.dayMonthYear(
        selectedDate
      )}`;
    }

    // 1M
    const startDate = subDays(selectedDate, 29);
    return `${formatters.dayMonth(startDate)} - ${formatters.dayMonthYear(
      selectedDate
    )}`;
  }, [timeScale, sortedEntries, selectedDate]);

  // Reset to today
  const handleResetToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // Get the hovered entry
  const hoveredEntry = useMemo(
    () =>
      hoveredEntryIndex !== null ? displayedEntries[hoveredEntryIndex] : null,
    [hoveredEntryIndex, displayedEntries]
  );

  // Generate the mood line paths with memoization
  const moodLines = useMemo(() => {
    if (!displayedEntries || displayedEntries.length <= 1)
      return { valence: [], arousal: [] };

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
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-white">Mood Trends</h3>
          <span className="ml-2 text-xs text-gray-400">
            {getDateRangeDisplay()}
          </span>
        </div>

        {/* Time scale and calendar selector */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-700 rounded-lg p-0.5">
            {(["1D", "1W", "1M", "All"] as TimeScale[]).map((scale) => (
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

          <div className="relative" ref={calendarRef}>
            <button
              className="p-1.5 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600 transition"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </button>

            {showCalendar && (
              <div className="absolute right-0 z-50 mt-1 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-2">
                <div className="text-white text-right mb-1">
                  <button
                    onClick={handleResetToToday}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Today
                  </button>
                </div>
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDaySelect}
                  modifiersClassNames={{
                    selected: "bg-blue-500 text-white rounded",
                  }}
                  styles={{
                    caption: { color: "white" },
                    table: { fontSize: "0.875rem" },
                    day: { color: "#e5e7eb" },
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={graphRef}
        className="relative h-56 w-full border-b border-l border-gray-600 mt-2 ml-8"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
            {[5, 21.5, 38, 54.5, 71, 87.5].map((position) => (
              <div
                key={`x-grid-${position}`}
                className="absolute h-full w-px bg-gray-700/50"
                style={{ left: `${position}%` }}
              />
            ))}
          </div>
        )}

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
              strokeWidth="2"
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
              strokeWidth="2"
            />
          ))}
        </svg>

        {/* Hover indicator */}
        {hoveredEntry && hoverPosition && (
          <>
            {/* Vertical line */}
            <div
              className="absolute h-full w-px bg-white/70 pointer-events-none"
              style={{ left: `${hoverPosition.x}px`, zIndex: 15 }}
            />

            {/* Enhanced tooltip with more data */}
            <div
              className="absolute z-50 p-3 bg-gray-900 text-white text-xs rounded shadow-lg border border-gray-700 pointer-events-none"
              style={{
                left: `${hoverPosition.x + 10}px`,
                top: `${Math.min(hoverPosition.y - 10, 180)}px`,
                maxWidth: "220px",
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <p className="font-semibold">
                  {timeScale === "1D"
                    ? formatters.dayMonthHourMinute(
                        new Date(hoveredEntry.timestamp)
                      )
                    : formatters.dayMonthYear(new Date(hoveredEntry.timestamp))}
                </p>
                {timeScale !== "1D" && hoveredEntry.entriesCount > 0 && (
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
                    <span className="font-medium">{hoveredEntry.feeling}</span>
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
                    {getFeelingInfo(hoveredEntry).valence?.toFixed(2) || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Arousal</p>
                  <p className="font-medium text-red-400">
                    {getFeelingInfo(hoveredEntry).arousal?.toFixed(2) || "N/A"}
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
                            <span className="text-[10px]">{entry.feeling}</span>
                            <span className="text-[9px] text-gray-400 ml-auto">
                              {formatters.hourMinute(new Date(entry.timestamp))}
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

      {/* X-axis labels */}
      <div className="flex justify-between mt-1 text-xs text-gray-400 ml-8">
        {timeScale === "1D" ? (
          // For 1D, show hour markers
          <div className="w-full flex justify-between">
            {formatXAxisLabels().map((label, index) => (
              <span key={`x-label-${index}`}>{label}</span>
            ))}
          </div>
        ) : timeScale === "All" && displayedEntries.length > 0 ? (
          // For All, show distributed date markers
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
                {formatters.dayMonth(new Date(displayedEntries[0].timestamp))}
              </span>
              {displayedEntries.length > 1 && (
                <span>
                  {formatters.dayMonth(
                    new Date(
                      displayedEntries[displayedEntries.length - 1].timestamp
                    )
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
          <div className="w-3 h-1 rounded-full bg-blue-500 mr-2"></div>
          <span className="text-xs text-gray-300">Valence (pleasantness)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-1 rounded-full bg-red-500 mr-2"></div>
          <span className="text-xs text-gray-300">Arousal (energy)</span>
        </div>
      </div>
    </div>
  );
};

export default MoodGraph;
