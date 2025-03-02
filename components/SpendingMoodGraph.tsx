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
  parseISO,
} from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

type SpendingMoodGraphProps = {
  moodEntries: any[];
  transactions: any[];
};

// Time scale options
type TimeScale = "1W" | "1M" | "3M" | "All";

// Format helpers
const formatters = {
  dayMonthYear: (date: Date) => format(date, "MMM d, yyyy"),
  dayMonth: (date: Date) => format(date, "MMM d"),
  hourMinute: (date: Date) => format(date, "h:mm a"),
  dayMonthHourMinute: (date: Date) => format(date, "MMM d, h:mm a"),
  fullMonthDay: (date: Date) => format(date, "MMMM d, yyyy"),
  dayKey: (date: Date) => format(date, "yyyy-MM-dd"),
  currency: (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
  },
};

const SpendingMoodGraph = ({
  moodEntries,
  transactions,
}: SpendingMoodGraphProps) => {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(
    null
  );
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>("1M");
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

  // Sort mood entries by date
  const sortedMoodEntries = useMemo(
    () =>
      [...moodEntries].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    [moodEntries]
  );

  // Sort transactions by date
  const sortedTransactions = useMemo(
    () =>
      [...transactions]
        .filter((t) => !t.pending)
        .sort(
          (a, b) =>
            new Date(a.date || a.timestamp).getTime() -
            new Date(b.date || b.timestamp).getTime()
        ),
    [transactions]
  );

  // Calculate date ranges for different time scales
  const getDateRange = useCallback(() => {
    let startDate: Date;
    let endDate: Date = endOfDay(selectedDate);

    switch (timeScale) {
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
      case "3M":
        // For 3M, show 90 days ending on the selected date
        startDate = startOfDay(subDays(selectedDate, 89));
        break;
      case "All":
        // For All, we'll use first/last entry times later
        return null;
      default:
        startDate = startOfDay(subDays(selectedDate, 29));
    }

    return { startDate, endDate };
  }, [timeScale, selectedDate]);

  // Filter entries based on selected time scale and date
  const getFilteredData = useCallback(() => {
    let filteredMood;
    let filteredTransactions;

    if (timeScale === "All") {
      filteredMood = sortedMoodEntries;
      filteredTransactions = sortedTransactions;
    } else {
      const dateRange = getDateRange();
      if (!dateRange) {
        filteredMood = sortedMoodEntries;
        filteredTransactions = sortedTransactions;
      } else {
        const { startDate, endDate } = dateRange;
        const startTimestamp = startDate.toISOString();
        const endTimestamp = endDate.toISOString();

        filteredMood = sortedMoodEntries.filter((entry) => {
          const entryTimestamp = new Date(entry.timestamp).toISOString();
          return (
            entryTimestamp >= startTimestamp && entryTimestamp <= endTimestamp
          );
        });

        filteredTransactions = sortedTransactions.filter((transaction) => {
          const transactionTimestamp = new Date(
            transaction.date || transaction.timestamp
          ).toISOString();
          return (
            transactionTimestamp >= startTimestamp &&
            transactionTimestamp <= endTimestamp
          );
        });
      }
    }

    return { moodData: filteredMood, transactionData: filteredTransactions };
  }, [timeScale, getDateRange, sortedMoodEntries, sortedTransactions]);

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

  // Aggregate data by day for display
  const aggregateDataByDay = useCallback(() => {
    const { moodData, transactionData } = getFilteredData();
    if (moodData.length === 0 && transactionData.length === 0) return [];

    // Create a map of days
    const dataByDay: Record<
      string,
      {
        date: string;
        moodEntries: any[];
        transactions: any[];
        avgValence: number | null;
        avgArousal: number | null;
        totalSpending: number;
      }
    > = {};

    // For longer time periods, we need to ensure we have entries for all days
    // to maintain consistent spacing on the graph
    if (timeScale !== "1W") {
      const dateRange = getDateRange();
      if (dateRange) {
        let { startDate, endDate } = dateRange;
        let currentDate = startDate;
        
        while (currentDate <= endDate) {
          const dayKey = formatters.dayKey(currentDate);
          dataByDay[dayKey] = {
            date: dayKey,
            moodEntries: [],
            transactions: [],
            avgValence: null,
            avgArousal: null,
            totalSpending: 0,
          };
          currentDate = addDays(currentDate, 1);
        }
      }
    }

    // Group mood entries by day
    moodData.forEach((entry) => {
      const day = formatters.dayKey(new Date(entry.timestamp));
      if (!dataByDay[day]) {
        dataByDay[day] = {
          date: day,
          moodEntries: [],
          transactions: [],
          avgValence: null,
          avgArousal: null,
          totalSpending: 0,
        };
      }
      dataByDay[day].moodEntries.push(entry);
    });

    // Group transactions by day
    transactionData.forEach((transaction) => {
      const day = formatters.dayKey(
        new Date(transaction.date || transaction.timestamp)
      );
      if (!dataByDay[day]) {
        dataByDay[day] = {
          date: day,
          moodEntries: [],
          transactions: [],
          avgValence: null,
          avgArousal: null,
          totalSpending: 0,
        };
      }
      // Only add spending (positive amounts are typically debits in financial systems)
      if (transaction.amount > 0) {
        dataByDay[day].transactions.push(transaction);
        dataByDay[day].totalSpending += transaction.amount;
      }
    });

    // Calculate averages for mood
    Object.values(dataByDay).forEach((dayData) => {
      if (dayData.moodEntries.length > 0) {
        let totalValence = 0;
        let totalArousal = 0;
        let validEntries = 0;

        dayData.moodEntries.forEach((entry) => {
          const { valence, arousal } = getFeelingInfo(entry);
          if (valence !== null && arousal !== null) {
            totalValence += valence;
            totalArousal += arousal;
            validEntries++;
          }
        });

        dayData.avgValence =
          validEntries > 0 ? totalValence / validEntries : null;
        dayData.avgArousal =
          validEntries > 0 ? totalArousal / validEntries : null;
      }
    });

    // Sort by date
    return Object.values(dataByDay).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [getFilteredData, getFeelingInfo, timeScale, getDateRange]);

  // Memoize the aggregated data
  const aggregatedData = useMemo(
    () => aggregateDataByDay(),
    [aggregateDataByDay]
  );

  // Get maximum spending for scaling the graph
  const maxSpending = useMemo(() => {
    if (aggregatedData.length === 0) return 100;
    return (
      Math.max(...aggregatedData.map((day) => day.totalSpending || 0)) || 100
    );
  }, [aggregatedData]);

  // Map valence/arousal values (-1 to 1) to y-axis positions (80-20)
  const getMoodYPosition = useCallback((value: number | null) => {
    if (value === null) return 50; // Center for placeholder entries
    // Convert from [-1, 1] to [10, 90] with proper scaling
    // This ensures -1 is at the bottom (90%) and +1 is at the top (10%)
    return 90 - ((value + 1) / 2) * 80;
  }, []);

  // Map spending values to y-axis positions (90-10)
  const getSpendingYPosition = useCallback(
    (value: number) => {
      if (value <= 0 || maxSpending <= 0) return 90; // Bottom for no spending
      // Convert from [0, maxSpending] to [90, 10] with padding
      const position = 90 - (value / maxSpending) * 80;
      return Math.max(10, Math.min(90, position)); // Ensure within bounds
    },
    [maxSpending]
  );

  // Get X position based on index
  const getXPosition = useCallback((index: number, totalPoints: number) => {
    if (totalPoints <= 1) return 50; // Center if only one point
    // Distribute points with padding on left and right (10% on each side)
    return 10 + (index / (totalPoints - 1)) * 80;
  }, []);

  // Handle mouse movement for finding closest point
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!graphRef.current || aggregatedData.length === 0) return;

      const rect = graphRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const relativeX = mouseX / rect.width; // Position as percentage of graph width

      // Find the closest data point to the current mouse position
      let closestIdx = 0;
      let closestDistance = Infinity;

      aggregatedData.forEach((_, idx) => {
        const xPos = getXPosition(idx, aggregatedData.length) / 100; // Convert to 0-1 scale
        const distance = Math.abs(relativeX - xPos);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIdx = idx;
        }
      });

      // Only update if we're reasonably close to a point (within 7% of graph width)
      if (closestDistance < 0.07) {
        setHoveredPointIndex(closestIdx);
        
        // Calculate the exact position for the tooltip based on the data point
        const pointXPos = getXPosition(closestIdx, aggregatedData.length) / 100 * rect.width;
        
        setHoverPosition({
          x: pointXPos,
          y: e.clientY - rect.top,
        });
      } else {
        setHoveredPointIndex(null);
        setHoverPosition(null);
      }
    },
    [aggregatedData, getXPosition]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPointIndex(null);
    setHoverPosition(null);
  }, []);

  // Handle day selection from calendar
  const handleDaySelect = useCallback((day: Date | undefined) => {
    if (day) {
      setSelectedDate(day);
      setShowCalendar(false);
    }
  }, []);

  // Get date range display for the header
  const getDateRangeDisplay = useCallback(() => {
    switch (timeScale) {
      case "1W":
        const startDate = subDays(selectedDate, 6);
        return `${formatters.dayMonth(startDate)} - ${formatters.dayMonthYear(
          selectedDate
        )}`;
      case "1M":
        const startDateMonth = subDays(selectedDate, 29);
        return `${formatters.dayMonth(
          startDateMonth
        )} - ${formatters.dayMonthYear(selectedDate)}`;
      case "3M":
        const startDate3Month = subDays(selectedDate, 89);
        return `${formatters.dayMonth(
          startDate3Month
        )} - ${formatters.dayMonthYear(selectedDate)}`;
      case "All":
        if (sortedMoodEntries.length > 0 && sortedTransactions.length > 0) {
          const allStartDate = new Date(
            Math.min(
              new Date(sortedMoodEntries[0].timestamp).getTime(),
              new Date(
                sortedTransactions[0].date || sortedTransactions[0].timestamp
              ).getTime()
            )
          );
          const allEndDate = selectedDate;
          return `${formatters.dayMonthYear(
            allStartDate
          )} - ${formatters.dayMonthYear(allEndDate)}`;
        }
        return "All Time";
      default:
        return formatters.dayMonthYear(selectedDate);
    }
  }, [timeScale, selectedDate, sortedMoodEntries, sortedTransactions]);

  // Reset to today
  const handleResetToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // Get the hovered data point
  const hoveredDataPoint = useMemo(
    () =>
      hoveredPointIndex !== null ? aggregatedData[hoveredPointIndex] : null,
    [hoveredPointIndex, aggregatedData]
  );

  // Generate SVG paths for mood and spending lines
  const lines = useMemo(() => {
    if (aggregatedData.length <= 1)
      return { valencePath: "", arousalPath: "", spendingPath: "" };

    let valencePath = "";
    let arousalPath = "";
    let spendingPath = "";

    // Track if we've started a path
    let valencePathStarted = false;
    let arousalPathStarted = false;
    let spendingPathStarted = false;

    aggregatedData.forEach((point, index) => {
      const x = getXPosition(index, aggregatedData.length);

      // Valence line
      if (point.avgValence !== null) {
        const yValence = getMoodYPosition(point.avgValence);
        if (!valencePathStarted) {
          valencePath += `M${x},${yValence} `;
          valencePathStarted = true;
        } else {
          valencePath += `L${x},${yValence} `;
        }
      }

      // Arousal line
      if (point.avgArousal !== null) {
        const yArousal = getMoodYPosition(point.avgArousal);
        if (!arousalPathStarted) {
          arousalPath += `M${x},${yArousal} `;
          arousalPathStarted = true;
        } else {
          arousalPath += `L${x},${yArousal} `;
        }
      }

      // Spending line
      if (point.totalSpending > 0) {
        const ySpending = getSpendingYPosition(point.totalSpending);
        if (!spendingPathStarted) {
          spendingPath += `M${x},${ySpending} `;
          spendingPathStarted = true;
        } else {
          spendingPath += `L${x},${ySpending} `;
        }
      }
    });

    return { valencePath, arousalPath, spendingPath };
  }, [aggregatedData, getXPosition, getMoodYPosition, getSpendingYPosition]);

  // Format X-axis labels
  const xAxisLabels = useMemo(() => {
    if (aggregatedData.length <= 1) return [];

    // Show more labels for better readability
    const totalPoints = aggregatedData.length;
    let labelIndices = [];
    
    if (totalPoints <= 7) {
      // For few points, show all dates
      labelIndices = Array.from({ length: totalPoints }, (_, i) => i);
    } else if (totalPoints <= 31) {
      // For medium datasets (like a month), show every 5th day
      labelIndices = Array.from({ length: totalPoints }, (_, i) => i)
        .filter(i => i % 5 === 0 || i === totalPoints - 1);
    } else {
      // For larger datasets, show start, 25%, 50%, 75%, and end
      labelIndices = [
        0,
        Math.floor(totalPoints * 0.25),
        Math.floor(totalPoints * 0.5),
        Math.floor(totalPoints * 0.75),
        totalPoints - 1
      ];
    }

    return labelIndices.map((index) => ({
      position: getXPosition(index, totalPoints),
      label: format(parseISO(aggregatedData[index].date), "MMM d"),
    }));
  }, [aggregatedData, getXPosition]);

  if (
    !moodEntries ||
    moodEntries.length === 0 ||
    !transactions ||
    transactions.length === 0
  ) {
    return (
      <div className="text-center p-4 bg-gray-800 rounded-xl">
        <p className="text-gray-300">
          Insufficient data to display mood and spending correlation.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-white">
            Mood & Spending Correlation
          </h3>
          <span className="ml-2 text-xs text-gray-400">
            {getDateRangeDisplay()}
          </span>
        </div>

        {/* Time scale and calendar selector */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-700 rounded-lg p-0.5">
            {(["1W", "1M", "3M", "All"] as TimeScale[]).map((scale) => (
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

      {/* Graph explanation */}
      <div className="text-xs text-gray-400 mb-3 italic">
        This graph shows how your mood (valence and arousal) correlates with your daily spending patterns over time.
      </div>

      <div
        ref={graphRef}
        className="relative h-64 w-full border-b border-l border-gray-600 mt-2 ml-8 mr-8 bg-gray-800/30 rounded-tl-md"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left Y-axis for mood */}
        <div className="absolute -left-7 -top-4 h-full flex flex-col justify-between">
          <div className="text-xs text-gray-400 font-semibold">Mood</div>
          <div className="text-xs text-blue-400">+1</div>
          <div className="text-xs text-gray-400">0</div>
          <div className="text-xs text-red-400">-1</div>
        </div>

        {/* Right Y-axis for spending */}
        <div className="absolute -right-0 -top-4 h-full flex flex-col justify-between">
          <div className="text-xs text-gray-400 font-semibold">Spending</div>
          <div className="text-xs text-green-400">
            {formatters.currency(maxSpending)}
          </div>
          <div className="text-xs text-gray-400">
            {formatters.currency(maxSpending * 0.5)}
          </div>
          <div className="text-xs text-gray-400">{formatters.currency(0)}</div>
        </div>

        {/* Horizontal grid lines */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-0 w-full h-px bg-gray-700" />
          <div className="absolute top-1/4 w-full h-px bg-gray-700" />
          <div className="absolute top-1/2 w-full h-px bg-gray-700" />
          <div className="absolute top-3/4 w-full h-px bg-gray-700" />
          <div className="absolute bottom-0 w-full h-px bg-gray-700" />
        </div>

        {/* Vertical grid lines */}
        <div className="absolute top-0 left-0 w-full h-full">
          {xAxisLabels.map((label, index) => (
            <div 
              key={`grid-line-${index}`}
              className="absolute h-full w-px bg-gray-700/50"
              style={{ left: `${label.position}%` }}
            />
          ))}
        </div>

        {/* Mood quadrant indicators */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-1/2 h-1/2 border-r border-b border-gray-700/30 flex items-center justify-center">
            <span className="text-[10px] text-gray-500 opacity-30">Positive / High Energy</span>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-1/2 border-b border-gray-700/30 flex items-center justify-center">
            <span className="text-[10px] text-gray-500 opacity-30">Positive / Low Energy</span>
          </div>
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 border-r border-gray-700/30 flex items-center justify-center">
            <span className="text-[10px] text-gray-500 opacity-30">Negative / High Energy</span>
          </div>
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 flex items-center justify-center">
            <span className="text-[10px] text-gray-500 opacity-30">Negative / Low Energy</span>
          </div>
        </div>

        {/* SVG for all lines */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          style={{ zIndex: 1 }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Area under spending line */}
          {lines.spendingPath && (
            <path
              d={`${lines.spendingPath} L100,90 L0,90 Z`}
              fill="rgba(16, 185, 129, 0.1)"
              stroke="none"
            />
          )}

          {/* Valence line (blue) */}
          {lines.valencePath && (
            <path
              d={lines.valencePath}
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Arousal line (red) */}
          {lines.arousalPath && (
            <path
              d={lines.arousalPath}
              stroke="rgba(239, 68, 68, 0.8)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Spending line (green) */}
          {lines.spendingPath && (
            <path
              d={lines.spendingPath}
              stroke="rgba(16, 185, 129, 0.8)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Data points - only show on hover */}
          {aggregatedData.map((dataPoint, index) => (
            <g key={`data-point-${index}`}>
              {index === hoveredPointIndex && (
                <>
                  {dataPoint.avgValence !== null && (
                    <circle
                      cx={getXPosition(index, aggregatedData.length)}
                      cy={getMoodYPosition(dataPoint.avgValence)}
                      r="2.5"
                      fill="rgba(59, 130, 246, 1)"
                      stroke="white"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {dataPoint.avgArousal !== null && (
                    <circle
                      cx={getXPosition(index, aggregatedData.length)}
                      cy={getMoodYPosition(dataPoint.avgArousal)}
                      r="2.5"
                      fill="rgba(239, 68, 68, 1)"
                      stroke="white"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {dataPoint.totalSpending > 0 && (
                    <circle
                      cx={getXPosition(index, aggregatedData.length)}
                      cy={getSpendingYPosition(dataPoint.totalSpending)}
                      r="2.5"
                      fill="rgba(16, 185, 129, 1)"
                      stroke="white"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </>
              )}
            </g>
          ))}
        </svg>

        {/* Hover indicator */}
        {hoveredDataPoint && hoverPosition && (
          <>
            {/* Vertical line */}
            <div
              className="absolute h-full w-px bg-white/70 pointer-events-none"
              style={{ left: `${hoverPosition.x}px`, zIndex: 15 }}
            />

            {/* Date indicator at the bottom of the vertical line */}
            <div
              className="absolute bottom-0 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-0.5 rounded pointer-events-none"
              style={{ 
                left: `${hoverPosition.x}px`, 
                zIndex: 16,
                marginBottom: "-22px"
              }}
            >
              {format(parseISO(hoveredDataPoint.date), "MMM d")}
            </div>

            {/* Horizontal lines for each data point */}
            {hoveredDataPoint.avgValence !== null && (
              <div
                className="absolute w-full h-px bg-blue-500/50 pointer-events-none"
                style={{ 
                  top: `${getMoodYPosition(hoveredDataPoint.avgValence)}%`, 
                  zIndex: 14 
                }}
              />
            )}
            {hoveredDataPoint.avgArousal !== null && (
              <div
                className="absolute w-full h-px bg-red-500/50 pointer-events-none"
                style={{ 
                  top: `${getMoodYPosition(hoveredDataPoint.avgArousal)}%`, 
                  zIndex: 14 
                }}
              />
            )}
            {hoveredDataPoint.totalSpending > 0 && (
              <div
                className="absolute w-full h-px bg-green-500/50 pointer-events-none"
                style={{ 
                  top: `${getSpendingYPosition(hoveredDataPoint.totalSpending)}%`, 
                  zIndex: 14 
                }}
              />
            )}

            {/* Tooltip */}
            <div
              className="absolute z-50 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg border border-gray-700 pointer-events-none"
              style={{
                left: `${hoverPosition.x}px`,
                top: `10px`,
                transform: `translateX(${hoverPosition.x > (graphRef.current?.getBoundingClientRect().width || 0) / 2 ? '-100%' : '0'})`,
                maxWidth: "280px",
              }}
            >
              <div className="font-semibold mb-2 text-sm border-b border-gray-700 pb-1">
                {format(parseISO(hoveredDataPoint.date), "MMMM d, yyyy")}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-gray-800/50 p-2 rounded">
                  <p className="text-[10px] text-blue-400 font-medium">Valence</p>
                  <p className="font-medium text-white">
                    {hoveredDataPoint.avgValence !== null 
                      ? hoveredDataPoint.avgValence.toFixed(2) 
                      : "No data"}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-1">
                    {hoveredDataPoint.avgValence !== null 
                      ? hoveredDataPoint.avgValence > 0 
                        ? "Positive feeling" 
                        : "Negative feeling"
                      : ""}
                  </p>
                </div>
                <div className="bg-gray-800/50 p-2 rounded">
                  <p className="text-[10px] text-red-400 font-medium">Arousal</p>
                  <p className="font-medium text-white">
                    {hoveredDataPoint.avgArousal !== null 
                      ? hoveredDataPoint.avgArousal.toFixed(2) 
                      : "No data"}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-1">
                    {hoveredDataPoint.avgArousal !== null 
                      ? hoveredDataPoint.avgArousal > 0 
                        ? "High energy" 
                        : "Low energy"
                      : ""}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-700">
                <div className="bg-gray-800/50 p-2 rounded">
                  <p className="text-[10px] text-green-400 font-medium">Daily Spending</p>
                  <p className="font-medium text-white">
                    {formatters.currency(hoveredDataPoint.totalSpending)}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-1">
                    {hoveredDataPoint.transactions.length} transaction{hoveredDataPoint.transactions.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {hoveredDataPoint.transactions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-gray-400 mb-1 font-medium">
                      Top Transactions:
                    </p>
                    <div className="max-h-24 overflow-y-auto">
                      {hoveredDataPoint.transactions
                        .sort((a: any, b: any) => b.amount - a.amount)
                        .slice(0, 3)
                        .map((t: any, i: number) => (
                          <div
                            key={`tx-${i}`}
                            className="flex justify-between text-[10px] py-1 border-b border-gray-700/50"
                          >
                            <span className="truncate max-w-[150px]">
                              {t.name}
                            </span>
                            <span className="text-green-400 ml-2 font-medium">
                              {formatters.currency(t.amount)}
                            </span>
                          </div>
                        ))}
                      {hoveredDataPoint.transactions.length > 3 && (
                        <p className="text-[9px] text-gray-400 italic mt-1">
                          +{hoveredDataPoint.transactions.length - 3} more
                          transactions
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* X-axis labels */}
      <div className="relative h-6 mt-1 text-xs text-gray-400 ml-8 mr-8">
        {xAxisLabels.map((label, index) => (
          <span
            key={`x-label-${index}`}
            className="absolute transform -translate-x-1/2"
            style={{
              left: `${label.position}%`,
              top: 0
            }}
          >
            {label.label}
          </span>
        ))}
      </div>

      {/* Legend with improved styling */}
      <div className="mt-6 flex flex-wrap items-center gap-4 justify-center">
        <div className="flex items-center bg-gray-700/30 px-3 py-1 rounded-full">
          <div className="w-4 h-2 rounded-full bg-blue-500 mr-2"></div>
          <span className="text-xs text-gray-300">Valence (pleasantness)</span>
        </div>
        <div className="flex items-center bg-gray-700/30 px-3 py-1 rounded-full">
          <div className="w-4 h-2 rounded-full bg-red-500 mr-2"></div>
          <span className="text-xs text-gray-300">Arousal (energy)</span>
        </div>
        <div className="flex items-center bg-gray-700/30 px-3 py-1 rounded-full">
          <div className="w-4 h-2 rounded-full bg-green-500 mr-2"></div>
          <span className="text-xs text-gray-300">Daily Spending</span>
        </div>
      </div>

      {/* Insights section */}
      {aggregatedData.length > 0 && (
        <div className="mt-4 p-3 bg-gray-700/30 rounded-lg text-xs text-gray-300">
          <h4 className="font-semibold mb-1">Insights</h4>
          <p>
            {aggregatedData.some(d => d.avgValence !== null && d.totalSpending > 0) 
              ? "This graph shows how your mood correlates with your spending patterns. Hover over data points to see details."
              : "Add more mood entries and transactions to see correlations between your mood and spending habits."}
          </p>
        </div>
      )}
    </div>
  );
};

export default SpendingMoodGraph;
