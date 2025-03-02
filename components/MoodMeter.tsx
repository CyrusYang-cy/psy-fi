"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { logMood } from "@/lib/actions/mood.actions";
import { MOOD_QUADRANTS } from "@/lib/constants/mood";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartType,
  registerables,
} from "chart.js";
import { Scatter } from "react-chartjs-2";
import { Chart } from "chart.js";

// Register required Chart.js components
ChartJS.register(LinearScale, PointElement, Tooltip, Legend, ...registerables);

// Register a custom plugin type to TypeScript
declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    quadrantLabels?: {
      fontSize?: number;
      fontColor?: string;
    };
  }
}

type MoodMeterProps = {
  user: User;
};

type QuadrantType = "red" | "blue" | "green" | "yellow";

type Feeling = {
  name: string;
  definition: string;
  valence: number;
  arousal: number;
  quadrant?: QuadrantType;
};

// SVG paths for different blob shapes
const blobPaths = [
  "M50,-50 C69.5,-35 80,-17.5 80,0 C80,17.5 69.5,35 50,50 C30.5,65 15,72.5 0,72.5 C-15,72.5 -30.5,65 -50,50 C-69.5,35 -80,17.5 -80,0 C-80,-17.5 -69.5,-35 -50,-50 C-30.5,-65 -15,-72.5 0,-72.5 C15,-72.5 30.5,-65 50,-50",
  "M45,-45 C62.5,-31.5 72,-15.75 72,0 C72,15.75 62.5,31.5 45,45 C27.5,58.5 13.5,65.25 0,65.25 C-13.5,65.25 -27.5,58.5 -45,45 C-62.5,31.5 -72,15.75 -72,0 C-72,-15.75 -62.5,-31.5 -45,-45 C-27.5,-58.5 -13.5,-65.25 0,-65.25 C13.5,-65.25 27.5,-58.5 45,-45",
  "M55,-55 C76.5,-38.5 88,-19.25 88,0 C88,19.25 76.5,38.5 55,55 C33.5,71.5 16.5,79.75 0,79.75 C-16.5,79.75 -33.5,71.5 -55,55 C-76.5,38.5 -88,19.25 -88,0 C-88,-19.25 -76.5,-38.5 -55,-55 C-33.5,-71.5 -16.5,-79.75 0,-79.75 C16.5,-79.75 33.5,-71.5 55,-55",
  "M60,-60 C83.5,-42 96,-21 96,0 C96,21 83.5,42 60,60 C36.5,78 18,87 0,87 C-18,87 -36.5,78 -60,60 C-83.5,42 -96,21 -96,0 C-96,-21 -83.5,-42 -60,-60 C-36.5,-78 -18,-87 0,-87 C18,-87 36.5,-78 60,-60",
];

// Get all feelings from all quadrants - memoized for performance
const getAllFeelings = () => {
  const allFeelings: Feeling[] = [];

  Object.entries(MOOD_QUADRANTS).forEach(([quadrant, data]) => {
    data.feelings.forEach((feeling) => {
      allFeelings.push({
        ...feeling,
        quadrant: quadrant as QuadrantType,
      });
    });
  });

  return allFeelings;
};

const MoodMeter = ({ user }: MoodMeterProps) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantType | null>(
    null
  );
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [selectedFeelingData, setSelectedFeelingData] =
    useState<Feeling | null>(null);
  const [hoveredFeeling, setHoveredFeeling] = useState<Feeling | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [blobIndex, setBlobIndex] = useState(0);
  const [hoveredQuadrant, setHoveredQuadrant] = useState<QuadrantType | null>(
    null
  );
  const chartRef = useRef<ChartJS<"scatter">>(null);
  // Add ref to track current hovered feeling to prevent unnecessary updates
  const currentHoveredFeelingRef = useRef<string | null>(null);
  // Add state for search term
  const [searchTerm, setSearchTerm] = useState("");
  // Add state to track feeling selected from search
  const [searchSelectedFeeling, setSearchSelectedFeeling] = useState<
    string | null
  >(null);
  // Add state for visible quadrants
  const [visibleQuadrants, setVisibleQuadrants] = useState<QuadrantType[]>([
    "red",
    "blue",
    "green",
    "yellow",
  ]);
  // Add state to track if zoomed
  const [isZoomed, setIsZoomed] = useState(false);

  // Memoize feelings to avoid recalculation on each render
  const allFeelings = useMemo(() => getAllFeelings(), []);

  // Change blob shape every 3 seconds
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setBlobIndex((prevIndex) => (prevIndex + 1) % blobPaths.length);
  //   }, 3000);

  //   return () => clearInterval(interval);
  // }, []);

  const handleQuadrantSelect = (quadrant: QuadrantType) => {
    setSelectedQuadrant(quadrant);
    setSelectedFeeling(null);
    setSelectedFeelingData(null);
    // Initialize with only the selected quadrant visible
    setVisibleQuadrants([quadrant]);
    // Set zoomed state to true
    setIsZoomed(true);

    // Force a chart update after state changes are applied
    setTimeout(() => {
      if (chartRef.current) {
        // Apply zoom directly here as well
        const chart = chartRef.current;
        let xMin = -1,
          xMax = 1,
          yMin = -1,
          yMax = 1;

        // Set zoom level based on selected quadrant
        switch (quadrant) {
          case "blue": // Left-bottom (negative valence, negative arousal)
            xMin = -1;
            xMax = 0;
            yMin = -1;
            yMax = 0;
            break;
          case "green": // Right-bottom (positive valence, negative arousal)
            xMin = 0;
            xMax = 1;
            yMin = -1;
            yMax = 0;
            break;
          case "red": // Left-top (negative valence, positive arousal)
            xMin = -1;
            xMax = 0;
            yMin = 0;
            yMax = 1;
            break;
          case "yellow": // Right-top (positive valence, positive arousal)
            xMin = 0;
            xMax = 1;
            yMin = 0;
            yMax = 1;
            break;
        }

        // Apply the zoom settings directly
        chart.options.scales = {
          x: {
            ...chart.options.scales?.x,
            min: xMin,
            max: xMax,
          },
          y: {
            ...chart.options.scales?.y,
            min: yMin,
            max: yMax,
          },
        };

        // Force a resize update
        chart.update("resize");

        // Apply a second update after a small delay
        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current.update("resize");
          }
        }, 50);
      }
    }, 0);
  };

  const handleFeelingSelect = (feeling: Feeling) => {
    setSelectedFeeling(feeling.name);
    setSelectedFeelingData(feeling);

    // Ensure zoom is maintained when selecting a feeling
    setIsZoomed(true);

    // Force a chart update to maintain zoom
    setTimeout(() => {
      if (chartRef.current) {
        chartRef.current.update("resize");
      }
    }, 0);
  };

  const handleFeelingHover = useCallback((feeling: Feeling | null) => {
    // Update the ref first
    currentHoveredFeelingRef.current = feeling?.name || null;
    // Don't reset zoom when hovering
    setHoveredFeeling(feeling);
  }, []);

  const handleQuadrantHover = (quadrant: QuadrantType | null) => {
    setHoveredQuadrant(quadrant);
  };

  const resetSelection = () => {
    // Show all quadrants and reset zoom when going back
    setVisibleQuadrants(["red", "blue", "green", "yellow"]);
    setSelectedQuadrant(null);
    setSelectedFeeling(null);
    setSelectedFeelingData(null);
    setIsZoomed(false);
  };

  // Toggle quadrant visibility
  const toggleQuadrantVisibility = (quadrant: QuadrantType) => {
    // Instead of toggling, just set the visible quadrant to the one clicked
    setVisibleQuadrants([quadrant]);
  };

  // Memoize the quadrant colors to avoid recalculation
  const getQuadrantColors = useCallback((quadrant: QuadrantType) => {
    const colors = {
      red: {
        bg: "bg-red-900/30",
        border: "border-red-500",
        text: "text-red-400",
        hover: "hover:bg-red-800/50",
        gradient: "from-red-500 to-red-600",
        fill: "#ef4444",
        glow: "0 0 15px rgba(239, 68, 68, 0.7)",
        shadow: "shadow-red-500/30",
        rgb: "rgba(239, 68, 68, 0.7)",
      },
      blue: {
        bg: "bg-blue-900/30",
        border: "border-blue-500",
        text: "text-blue-400",
        hover: "hover:bg-blue-800/50",
        gradient: "from-blue-500 to-blue-600",
        fill: "#3b82f6",
        glow: "0 0 15px rgba(59, 130, 246, 0.7)",
        shadow: "shadow-blue-500/30",
        rgb: "rgba(59, 130, 246, 0.7)",
      },
      green: {
        bg: "bg-green-900/30",
        border: "border-green-500",
        text: "text-green-400",
        hover: "hover:bg-green-800/50",
        gradient: "from-green-500 to-green-600",
        fill: "#22c55e",
        glow: "0 0 15px rgba(34, 197, 94, 0.7)",
        shadow: "shadow-green-500/30",
        rgb: "rgba(34, 197, 94, 0.7)",
      },
      yellow: {
        bg: "bg-yellow-900/30",
        border: "border-yellow-500",
        text: "text-yellow-400",
        hover: "hover:bg-yellow-800/50",
        gradient: "from-yellow-400 to-yellow-500",
        fill: "#eab308",
        glow: "0 0 15px rgba(234, 179, 8, 0.7)",
        shadow: "shadow-yellow-500/30",
        rgb: "rgba(234, 179, 8, 0.7)",
      },
    };

    return colors[quadrant];
  }, []);

  // Prepare data for Chart.js - memoized for performance
  const prepareChartData = useMemo(() => {
    // Group feelings by quadrant - only do this once
    const feelingsByQuadrant = {
      red: allFeelings.filter((f) => f.quadrant === "red"),
      blue: allFeelings.filter((f) => f.quadrant === "blue"),
      green: allFeelings.filter((f) => f.quadrant === "green"),
      yellow: allFeelings.filter((f) => f.quadrant === "yellow"),
    };

    // Create dataset configuration
    const createDataset = (quadrant: QuadrantType, feelings: Feeling[]) => ({
      label: `${quadrant.charAt(0).toUpperCase() + quadrant.slice(1)} Quadrant`,
      data: feelings.map((f) => ({
        x: f.valence,
        y: f.arousal,
        feeling: f,
      })),
      backgroundColor: (context: any) => {
        // Check if this point is the one selected from search
        if (
          context.raw &&
          context.raw.feeling &&
          searchSelectedFeeling === context.raw.feeling.name
        ) {
          // Create a pulsing effect for the search-selected feeling
          return getQuadrantColors(quadrant)
            .rgb.replace(")", ", 0.9)")
            .replace("rgba", "rgba");
        }
        return getQuadrantColors(quadrant).rgb;
      },
      borderColor: (context: any) => {
        // Add a highlighted border for the search-selected feeling
        if (
          context.raw &&
          context.raw.feeling &&
          searchSelectedFeeling === context.raw.feeling.name
        ) {
          return "#ffffff";
        }
        return getQuadrantColors(quadrant).fill;
      },
      borderWidth: (context: any) => {
        // Make the border thicker for the search-selected feeling
        if (
          context.raw &&
          context.raw.feeling &&
          searchSelectedFeeling === context.raw.feeling.name
        ) {
          return 2;
        }
        return 1;
      },
      pointRadius: (point: any) => {
        const feelingName = point.raw.feeling.name;
        // Highlight the point if it's selected, search-selected, or if it matches the hovered feeling
        if (selectedFeeling === feelingName) return 12;
        if (searchSelectedFeeling === feelingName) return 14; // Make search-selected feelings even larger
        if (hoveredFeeling && hoveredFeeling.name === feelingName) return 12;
        return 8;
      },
      pointHoverRadius: 12,
      hidden: !visibleQuadrants.includes(quadrant),
    });

    // Create datasets for each quadrant
    return {
      datasets: [
        createDataset("red", feelingsByQuadrant.red),
        createDataset("blue", feelingsByQuadrant.blue),
        createDataset("green", feelingsByQuadrant.green),
        createDataset("yellow", feelingsByQuadrant.yellow),
      ],
    };
  }, [
    allFeelings,
    selectedFeeling,
    visibleQuadrants,
    getQuadrantColors,
    hoveredFeeling,
    searchSelectedFeeling,
  ]);

  // Feeling information display - prioritize selected feeling over hovered feeling
  const displayFeeling = useMemo(() => {
    return selectedFeelingData || hoveredFeeling;
  }, [selectedFeelingData, hoveredFeeling]);

  // Create a separate hover handler to avoid infinite loops
  const handleChartHover = useCallback(
    (event: any, elements: any[]) => {
      const chartCanvas = document.getElementById(
        "mood-chart"
      ) as HTMLCanvasElement;
      if (chartCanvas) {
        chartCanvas.style.cursor =
          elements && elements.length > 0 ? "pointer" : "default";
      }

      // Handle hover to show feeling info
      if (elements && elements.length > 0) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const index = element.index;

        const datasets = chartRef.current?.data.datasets;
        if (datasets && datasets[datasetIndex]) {
          const dataPoint = datasets[datasetIndex].data[index] as any;
          if (dataPoint && dataPoint.feeling) {
            // Store the feeling name to check if it's different
            const feelingName = dataPoint.feeling.name;
            // Only update if it's a different feeling from what's in the ref
            if (currentHoveredFeelingRef.current !== feelingName) {
              handleFeelingHover(dataPoint.feeling);
            }
          }
        }
      } else if (currentHoveredFeelingRef.current !== null) {
        // Only clear if there's currently a hovered feeling in the ref
        handleFeelingHover(null);
      }
    },
    [handleFeelingHover]
  );

  // Chart.js options - memoized for performance
  const chartOptions: ChartOptions<"scatter"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: -1,
          max: 1,
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.7)",
          },
          title: {
            display: true,
            text: "Valence (Negative to Positive)",
            color: "rgba(255, 255, 255, 0.7)",
            font: {
              size: 14,
            },
          },
        },
        y: {
          min: -1,
          max: 1,
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.7)",
          },
          title: {
            display: true,
            text: "Arousal (Low to High)",
            color: "rgba(255, 255, 255, 0.7)",
            font: {
              size: 14,
            },
          },
        },
      },
      plugins: {
        tooltip: {
          enabled: false, // Disable tooltips
        },
        legend: {
          display: false,
        },
      },
      onClick: (event, elements) => {
        if (elements && elements.length > 0) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;

          const datasets = chartRef.current?.data.datasets;
          if (datasets && datasets[datasetIndex]) {
            const dataPoint = datasets[datasetIndex].data[index] as any;
            if (dataPoint && dataPoint.feeling) {
              handleFeelingSelect(dataPoint.feeling);
              // Clear hovered feeling when selecting to avoid conflicts
              handleFeelingHover(null);
            }
          }
        }
      },
      onHover: handleChartHover,
      animation: false,
      animations: {
        colors: false,
        x: false,
        y: false,
      },
      transitions: {
        active: {
          animation: {
            duration: 0,
          },
        },
      },
    }),
    [handleChartHover] // Only depend on the memoized hover handler
  );

  // Function to determine zoom level based on visible quadrants
  const getZoomBounds = useCallback(() => {
    // Default to full view
    let xMin = -1,
      xMax = 1,
      yMin = -1,
      yMax = 1;

    // If zoomed and only one quadrant is visible, zoom to that quadrant
    if (isZoomed && visibleQuadrants.length === 1) {
      const quadrant = visibleQuadrants[0];
      switch (quadrant) {
        case "blue": // Left-bottom (negative valence, negative arousal)
          xMin = -1;
          xMax = 0;
          yMin = -1;
          yMax = 0;
          break;
        case "green": // Right-bottom (positive valence, negative arousal)
          xMin = 0;
          xMax = 1;
          yMin = -1;
          yMax = 0;
          break;
        case "red": // Left-top (negative valence, positive arousal)
          xMin = -1;
          xMax = 0;
          yMin = 0;
          yMax = 1;
          break;
        case "yellow": // Right-top (positive valence, positive arousal)
          xMin = 0;
          xMax = 1;
          yMin = 0;
          yMax = 1;
          break;
      }
    } else if (isZoomed && visibleQuadrants.length > 1) {
      // Custom zoom calculations for multiple quadrants
      // For now, just show the full view when multiple quadrants are visible
      xMin = -1;
      xMax = 1;
      yMin = -1;
      yMax = 1;
    }

    return { xMin, xMax, yMin, yMax };
  }, [isZoomed, visibleQuadrants]);

  // Apply zoom when quadrant selection or visibility changes
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const { xMin, xMax, yMin, yMax } = getZoomBounds();

    // Apply the zoom settings
    chart.options.scales = {
      x: {
        ...chart.options.scales?.x,
        min: xMin,
        max: xMax,
      },
      y: {
        ...chart.options.scales?.y,
        min: yMin,
        max: yMax,
      },
    };

    // Immediate update
    chart.update("resize");
  }, [visibleQuadrants, isZoomed, getZoomBounds]);

  // Prevent zoom from being affected by hover events
  useEffect(() => {
    // This effect only runs when hoveredFeeling changes
    // We need to ensure zoom is maintained
    if (!chartRef.current || !isZoomed) return;

    const chart = chartRef.current;
    const { xMin, xMax, yMin, yMax } = getZoomBounds();

    // Re-apply the zoom settings when hover state changes
    chart.options.scales = {
      x: {
        ...chart.options.scales?.x,
        min: xMin,
        max: xMax,
      },
      y: {
        ...chart.options.scales?.y,
        min: yMin,
        max: yMax,
      },
    };

    chart.update("resize");
  }, [hoveredFeeling, getZoomBounds, isZoomed]);

  // Quadrant labels for the chart - memoized for performance
  const quadrantLabels = useMemo(
    () => [
      {
        text: "RED: High Arousal, Negative Valence",
        x: -0.5,
        y: 0.9,
        color: "rgba(239, 68, 68, 0.9)",
      },
      {
        text: "YELLOW: High Arousal, Positive Valence",
        x: 0.5,
        y: 0.9,
        color: "rgba(234, 179, 8, 0.9)",
      },
      {
        text: "BLUE: Low Arousal, Negative Valence",
        x: -0.5,
        y: -0.9,
        color: "rgba(59, 130, 246, 0.9)",
      },
      {
        text: "GREEN: Low Arousal, Positive Valence",
        x: 0.5,
        y: -0.9,
        color: "rgba(34, 197, 94, 0.9)",
      },
    ],
    []
  );

  // Setup quadrant label plugin
  useEffect(() => {
    const quadrantLabelsPlugin = {
      id: "quadrantLabels",
      afterDraw: (chart: any) => {
        // Only draw these when not zoomed in
        if (!isZoomed) {
          const ctx = chart.ctx;
          const xAxis = chart.scales.x;
          const yAxis = chart.scales.y;

          ctx.save();
          ctx.font = "12px Arial";
          ctx.textAlign = "center";

          quadrantLabels.forEach((label: any) => {
            const x = xAxis.getPixelForValue(label.x);
            const y = yAxis.getPixelForValue(label.y);

            ctx.fillStyle = label.color;
            ctx.fillText(label.text, x, y);
          });

          // Draw quadrant lines
          ctx.beginPath();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 1;

          // Vertical line at x=0
          ctx.moveTo(xAxis.getPixelForValue(0), yAxis.getPixelForValue(-1));
          ctx.lineTo(xAxis.getPixelForValue(0), yAxis.getPixelForValue(1));

          // Horizontal line at y=0
          ctx.moveTo(xAxis.getPixelForValue(-1), yAxis.getPixelForValue(0));
          ctx.lineTo(xAxis.getPixelForValue(1), yAxis.getPixelForValue(0));

          ctx.stroke();
          ctx.restore();
        }
      },
    };

    // Register the plugin only once
    const registerPlugin = async () => {
      await import("chart.js").then(({ Chart }) => {
        Chart.register(quadrantLabelsPlugin);
      });
    };

    const unregisterPlugin = async () => {
      await import("chart.js").then(({ Chart }) => {
        Chart.unregister(quadrantLabelsPlugin);
      });
    };

    registerPlugin();
    return () => {
      unregisterPlugin();
    };
  }, [quadrantLabels, isZoomed]);

  // Get filtered feelings based on search term and visible quadrants
  const filteredFeelings = useMemo(() => {
    const visibleFeelings = allFeelings.filter((feeling) =>
      visibleQuadrants.includes(feeling.quadrant as QuadrantType)
    );

    // Sort feelings alphabetically
    const sortedFeelings = [...visibleFeelings].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // If search bar is empty, return all feelings
    if (!searchTerm.trim()) return sortedFeelings;

    // Filter based on search term
    return sortedFeelings.filter((feeling) =>
      feeling.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allFeelings, searchTerm, visibleQuadrants]);

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Handle search input focus
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  // Handle search input blur
  const handleSearchBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay hiding the dropdown to allow for click events on the options
    setTimeout(() => {
      setIsSearchFocused(false);
    }, 200);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle feeling selection from search results
  const handleSearchSelect = (feeling: Feeling) => {
    // Set the search-selected feeling
    setSearchSelectedFeeling(feeling.name);

    // Find the feeling's position in the chart
    const findFeelingInChart = () => {
      if (!chartRef.current) return;

      const chart = chartRef.current;
      const datasets = chart.data.datasets;

      // Loop through datasets to find the feeling
      for (let i = 0; i < datasets.length; i++) {
        const data = datasets[i].data;
        for (let j = 0; j < data.length; j++) {
          const point = data[j] as any;
          if (point.feeling && point.feeling.name === feeling.name) {
            // Found the feeling - update the chart
            chart.update();

            // Scroll the chart to center on this point
            const meta = chart.getDatasetMeta(i);
            if (meta.data[j]) {
              const x = meta.data[j].x;
              const y = meta.data[j].y;

              // Ensure the quadrant containing this feeling is visible
              if (
                !visibleQuadrants.includes(feeling.quadrant as QuadrantType)
              ) {
                setVisibleQuadrants((prev) => [
                  ...prev,
                  feeling.quadrant as QuadrantType,
                ]);
              }

              // Force chart update to ensure the point is visible
              setTimeout(() => {
                chart.update();
              }, 10);
            }
            break;
          }
        }
      }
    };

    // Trigger hover effect on the corresponding bubble
    handleFeelingHover(feeling);

    // Find and highlight the feeling in the chart
    findFeelingInChart();

    // Clear search after selection
    setSearchTerm("");

    // Clear the search-selected feeling highlight after a delay
    setTimeout(() => {
      setSearchSelectedFeeling(null);
    }, 2000);
  };

  const handleSubmit = async () => {
    if (!selectedQuadrant || !selectedFeeling) return;

    try {
      setIsSubmitting(true);

      await logMood({
        userId: user.$id,
        quadrant: selectedQuadrant,
        feeling: selectedFeeling,
        note,
      });

      setSuccess(true);

      // Reset form after 2 seconds
      setTimeout(() => {
        resetSelection();
        setNote("");
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error logging mood:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants for the bubbles
  const bubbleVariants = {
    initial: { scale: 0.8, opacity: 0.7 },
    hover: {
      scale: 1.05,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 10,
      },
    },
    tap: { scale: 0.95 },
    selected: {
      scale: 1.1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15,
      },
    },
  };

  // Animation for the floating effect
  const floatingAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut",
    },
  };

  return (
    <div className="w-full min-h-screen bg-gray-900 text-gray-100 p-6 flex flex-col items-center">
      <div className="relative z-10 w-full max-w-4xl">
        {success ? (
          <div className="flex flex-col items-center justify-center bg-gray-800/80 rounded-xl p-8 mb-8 backdrop-blur-sm border border-gray-700">
            <Image
              src="/icons/check-circle.svg"
              width={48}
              height={48}
              alt="Success"
              className="mb-4"
            />
            <h3 className="text-xl font-semibold text-green-400">
              Mood logged successfully!
            </h3>
            <p className="text-gray-300">
              Thank you for tracking your mood today.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              How are you feeling right now?
            </h2>
            {selectedQuadrant ? (
              <>
                <div className="w-full mb-4 flex justify-between items-center">
                  <button
                    onClick={resetSelection}
                    className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Back to all quadrants
                  </button>
                  <h3
                    className={`text-xl font-bold ${
                      getQuadrantColors(selectedQuadrant).text
                    }`}
                  >
                    {MOOD_QUADRANTS[selectedQuadrant].name} Feelings
                  </h3>
                </div>

                {/* Quadrant Visibility Controls */}
                <div className="w-full mb-4 flex flex-wrap gap-3 items-center justify-center">
                  <div className="text-sm text-gray-400 mr-2">
                    Show quadrant:
                  </div>
                  {Object.entries(MOOD_QUADRANTS).map(([key, quadrant]) => {
                    const quadrantKey = key as QuadrantType;
                    const colors = getQuadrantColors(quadrantKey);
                    const isVisible = visibleQuadrants.includes(quadrantKey) && visibleQuadrants.length === 1;

                    return (
                      <button
                        key={`filter-${key}`}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          isVisible
                            ? `${colors.bg} ${colors.border}`
                            : "bg-gray-800 border border-gray-700"
                        }`}
                        onClick={() => toggleQuadrantVisibility(quadrantKey)}
                      >
                        {quadrant.name}
                      </button>
                    );
                  })}
                  {visibleQuadrants.length === 1 && (
                    <button
                      className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-gray-800 border border-gray-700 hover:bg-gray-700"
                      onClick={() => setVisibleQuadrants(["red", "blue", "green", "yellow"])}
                    >
                      Show All
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative w-full max-w-md mx-auto mb-6">
                  <input
                    type="text"
                    placeholder="Search for a feeling..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {isSearchFocused && filteredFeelings.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredFeelings.map((feeling) => (
                        <div
                          key={`search-${feeling.name}`}
                          className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                          onClick={() => handleSearchSelect(feeling)}
                        >
                          <div
                            className={`w-3 h-3 rounded-full ${
                              getQuadrantColors(feeling.quadrant!).bg
                            }`}
                          ></div>
                          <span>{feeling.name}</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {
                              MOOD_QUADRANTS[
                                feeling.quadrant as keyof typeof MOOD_QUADRANTS
                              ]?.name
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Replace Chart with Emotion Blobs */}
                <div className="w-full flex flex-wrap justify-center gap-6 mb-8">
                  {filteredFeelings.map((feeling) => {
                    const colors = getQuadrantColors(feeling.quadrant!);
                    const isSelected = selectedFeeling === feeling.name;
                    const isHovered = hoveredFeeling?.name === feeling.name;

                    return (
                      <motion.div
                        key={`feeling-${feeling.name}`}
                        className="relative flex items-center justify-center"
                        animate={floatingAnimation}
                        onClick={() => handleFeelingSelect(feeling)}
                        onHoverStart={() => handleFeelingHover(feeling)}
                        onHoverEnd={() => handleFeelingHover(null)}
                      >
                        <motion.div
                          className="shape-blob cursor-pointer flex flex-col items-center justify-center p-6"
                          style={{
                            "--blob-color-1": colors.fill,
                            "--blob-color-2": colors.fill,
                            "--blob-color-3": `${colors.fill}99`,
                            width: "150px",
                            height: "150px",
                            filter: (isSelected || isHovered) ? `drop-shadow(0 0 10px ${colors.fill})` : "none",
                          } as React.CSSProperties}
                          variants={bubbleVariants}
                          initial="initial"
                          whileHover="hover"
                          whileTap="tap"
                          animate={isSelected || isHovered ? "hover" : "initial"}
                        >
                          <h3 className={`${colors.text} text-lg font-bold mb-1 z-10 text-center`}>
                            {feeling.name}
                          </h3>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Feeling Information Display */}
                {displayFeeling && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`w-full max-w-md mx-auto p-6 rounded-xl ${
                      getQuadrantColors(displayFeeling.quadrant!).bg
                    } border ${
                      getQuadrantColors(displayFeeling.quadrant!).border
                    } mb-6`}
                  >
                    <h3
                      className={`text-xl font-bold mb-2 ${
                        getQuadrantColors(displayFeeling.quadrant!).text
                      }`}
                    >
                      {displayFeeling.name}
                    </h3>
                    <p className="text-white mb-4">
                      {displayFeeling.definition}
                    </p>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Valence:</span>{" "}
                        <span className="text-blue-400">
                          {displayFeeling.valence.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Arousal:</span>{" "}
                        <span className="text-red-400">
                          {displayFeeling.arousal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Note Input and Submit Button */}
                {selectedFeeling && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="w-full max-w-md mx-auto"
                  >
                    <div className="mb-4">
                      <label
                        htmlFor="note"
                        className="block text-gray-400 mb-2"
                      >
                        Add a note about how you&apos;re feeling (optional)
                      </label>
                      <textarea
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="What's making you feel this way?"
                      ></textarea>
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className={`w-full py-3 rounded-lg font-medium transition-colors ${
                        getQuadrantColors(selectedQuadrant).bg
                      } hover:${
                        getQuadrantColors(selectedQuadrant).hover
                      } ${getQuadrantColors(selectedQuadrant).text}`}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg
                            className="animate-spin h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Logging...
                        </span>
                      ) : (
                        "Log This Feeling"
                      )}
                    </button>
                  </motion.div>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-8 text-center max-w-lg">
                  Select a quadrant to explore feelings
                </p>

                <div className="grid grid-cols-2 gap-8 max-w-3xl mx-auto mb-6">
                  {Object.entries(MOOD_QUADRANTS).map(([key, quadrant]) => {
                    const quadrantKey = key as QuadrantType;
                    const colors = getQuadrantColors(quadrantKey);
                    const isHovered = hoveredQuadrant === quadrantKey;
                    const path = blobPaths[blobIndex];

                    return (
                      <motion.div
                        key={key}
                        className="relative flex items-center justify-center"
                        animate={floatingAnimation}
                        onHoverStart={() => handleQuadrantHover(quadrantKey)}
                        onHoverEnd={() => handleQuadrantHover(null)}
                        onClick={() => handleQuadrantSelect(quadrantKey)}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-br opacity-70 rounded-full filter blur-md"
                          style={{
                            background: `radial-gradient(circle, ${colors.fill}40 0%, ${colors.fill}00 70%)`,
                          }}
                          initial={{ scale: 0.9 }}
                          animate={{
                            scale: isHovered ? 1.1 : 1,
                            opacity: isHovered ? 0.9 : 0.7,
                          }}
                          transition={{ duration: 0.3 }}
                        />

                        <motion.div
                          className="shape-blob cursor-pointer flex flex-col items-center justify-center p-6 backdrop-blur-sm"
                          style={{
                            "--blob-color-1": colors.fill,
                            "--blob-color-2": colors.fill,
                            "--blob-color-3": `${colors.fill}99`,
                            filter: isHovered ? `drop-shadow(0 0 10px ${colors.fill})` : "none",
                          } as React.CSSProperties}
                          variants={bubbleVariants}
                          initial="initial"
                          whileHover="hover"
                          whileTap="tap"
                          animate={isHovered ? "hover" : "initial"}
                        >
                          <h3
                            className={`${colors.text} text-xl font-bold mb-2 z-10`}
                          >
                            {quadrant.name}
                          </h3>
                          <p className="text-white text-center text-sm z-10">
                            {quadrant.description}
                          </p>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodMeter;
