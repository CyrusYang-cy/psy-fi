"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [blobIndex, setBlobIndex] = useState(0);
  const [hoveredQuadrant, setHoveredQuadrant] = useState<QuadrantType | null>(
    null
  );
  const chartRef = useRef<ChartJS<"scatter">>(null);
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
  useEffect(() => {
    const interval = setInterval(() => {
      setBlobIndex((prevIndex) => (prevIndex + 1) % blobPaths.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
    setVisibleQuadrants((prev) => {
      if (prev.includes(quadrant)) {
        if (prev.length > 1) {
          // Only allow removing if at least one quadrant will remain visible
          return prev.filter((q) => q !== quadrant);
        }
        return prev;
      } else {
        // When adding a new quadrant, maintain zoom level
        return [...prev, quadrant];
      }
    });
  };

  const getQuadrantColors = (quadrant: QuadrantType) => {
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

  // Prepare data for Chart.js - memoized for performance
  const prepareChartData = useMemo(() => {
    // Group feelings by quadrant
    const redFeelings = allFeelings.filter((f) => f.quadrant === "red");
    const blueFeelings = allFeelings.filter((f) => f.quadrant === "blue");
    const greenFeelings = allFeelings.filter((f) => f.quadrant === "green");
    const yellowFeelings = allFeelings.filter((f) => f.quadrant === "yellow");

    return {
      datasets: [
        {
          label: "Red Quadrant",
          data: redFeelings.map((f) => ({
            x: f.valence,
            y: f.arousal,
            feeling: f,
          })),
          backgroundColor: "rgba(239, 68, 68, 0.7)",
          borderColor: "rgba(239, 68, 68, 1)",
          borderWidth: 1,
          pointRadius: selectedFeeling
            ? (point: any) =>
                point.raw.feeling.name === selectedFeeling ? 12 : 8
            : 8,
          pointHoverRadius: 12,
          hidden: !visibleQuadrants.includes("red"),
        },
        {
          label: "Blue Quadrant",
          data: blueFeelings.map((f) => ({
            x: f.valence,
            y: f.arousal,
            feeling: f,
          })),
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
          pointRadius: selectedFeeling
            ? (point: any) =>
                point.raw.feeling.name === selectedFeeling ? 12 : 8
            : 8,
          pointHoverRadius: 12,
          hidden: !visibleQuadrants.includes("blue"),
        },
        {
          label: "Green Quadrant",
          data: greenFeelings.map((f) => ({
            x: f.valence,
            y: f.arousal,
            feeling: f,
          })),
          backgroundColor: "rgba(34, 197, 94, 0.7)",
          borderColor: "rgba(34, 197, 94, 1)",
          borderWidth: 1,
          pointRadius: selectedFeeling
            ? (point: any) =>
                point.raw.feeling.name === selectedFeeling ? 12 : 8
            : 8,
          pointHoverRadius: 12,
          hidden: !visibleQuadrants.includes("green"),
        },
        {
          label: "Yellow Quadrant",
          data: yellowFeelings.map((f) => ({
            x: f.valence,
            y: f.arousal,
            feeling: f,
          })),
          backgroundColor: "rgba(234, 179, 8, 0.7)",
          borderColor: "rgba(234, 179, 8, 1)",
          borderWidth: 1,
          pointRadius: selectedFeeling
            ? (point: any) =>
                point.raw.feeling.name === selectedFeeling ? 12 : 8
            : 8,
          pointHoverRadius: 12,
          hidden: !visibleQuadrants.includes("yellow"),
        },
      ],
    };
  }, [allFeelings, selectedFeeling, visibleQuadrants]);

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
          callbacks: {
            label: (context) => {
              const feeling = context.raw as any;
              return [
                `${feeling.feeling.name}`,
                `Definition: ${feeling.feeling.definition}`,
                `Valence: ${feeling.x.toFixed(2)}`,
                `Arousal: ${feeling.y.toFixed(2)}`,
              ];
            },
          },
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          titleFont: {
            size: 14,
          },
          bodyFont: {
            size: 13,
          },
        },
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "rgba(255, 255, 255, 0.7)",
            font: {
              size: 12,
            },
            boxWidth: 12,
          },
          onClick: (evt, item, legend) => {
            // Prevent default legend click behavior
            // We'll handle visibility with our own checkboxes
          },
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
            }
          }
        }
      },
      onHover: (event, elements) => {
        const chartCanvas = document.getElementById(
          "mood-chart"
        ) as HTMLCanvasElement;
        if (chartCanvas) {
          chartCanvas.style.cursor =
            elements && elements.length > 0 ? "pointer" : "default";
        }
      },
      // Disable all animations to prevent zoom issues
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
    []
  );

  // Function to determine zoom level based on visible quadrants
  const getZoomBounds = () => {
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
      xMin = -1;
      xMax = 1;
      yMin = -1;
      yMax = 1;
    }

    return { xMin, xMax, yMin, yMax };
  };

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
  }, [visibleQuadrants, isZoomed]);

  // Quadrant labels for the chart
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
            {!selectedQuadrant ? (
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
                          className="relative cursor-pointer w-48 h-48 flex flex-col items-center justify-center p-6 backdrop-blur-sm"
                          variants={bubbleVariants}
                          initial="initial"
                          whileHover="hover"
                          whileTap="tap"
                          animate={isHovered ? "hover" : "initial"}
                        >
                          <svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 200 200"
                            className="absolute inset-0"
                            style={{
                              filter: isHovered
                                ? `drop-shadow(0 0 10px ${colors.fill})`
                                : "none",
                            }}
                          >
                            <motion.path
                              d={path}
                              fill={colors.fill}
                              initial={{ opacity: 0.7 }}
                              animate={{
                                opacity: isHovered ? 0.9 : 0.7,
                                scale: isHovered ? 1.05 : 1,
                              }}
                              transition={{ duration: 0.3 }}
                            />
                          </svg>

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
            ) : (
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
                    Show quadrants:
                  </div>
                  {(["red", "blue", "green", "yellow"] as QuadrantType[]).map(
                    (quadrant) => {
                      const colors = getQuadrantColors(quadrant);
                      const isVisible = visibleQuadrants.includes(quadrant);

                      return (
                        <label
                          key={quadrant}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full cursor-pointer transition-colors
                          ${isVisible ? colors.bg : "bg-gray-800/30"} 
                          hover:bg-opacity-80`}
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => toggleQuadrantVisibility(quadrant)}
                            className="hidden"
                          />
                          <div
                            className={`w-3 h-3 rounded-full ${
                              isVisible ? `bg-${quadrant}-500` : "bg-gray-600"
                            }`}
                            style={{
                              backgroundColor: isVisible
                                ? colors.fill
                                : "#4B5563",
                            }}
                          />
                          <span
                            className={`text-sm ${
                              isVisible ? colors.text : "text-gray-500"
                            }`}
                          >
                            {MOOD_QUADRANTS[quadrant].name}
                          </span>
                        </label>
                      );
                    }
                  )}
                </div>

                {/* Chart.js Feeling Plot - Only show when a quadrant is selected */}
                <div className="w-full h-[500px] bg-gray-800/50 rounded-xl mb-8 overflow-hidden border border-gray-700 backdrop-blur-sm p-4">
                  <Scatter
                    id="mood-chart"
                    ref={chartRef}
                    data={prepareChartData}
                    options={chartOptions}
                  />
                </div>

                {selectedFeeling && selectedFeelingData && (
                  <motion.div
                    className="w-full mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className={`p-6 rounded-xl ${
                        getQuadrantColors(
                          selectedFeelingData.quadrant as QuadrantType
                        ).bg
                      } backdrop-blur-sm border border-gray-700 shadow-lg ${
                        getQuadrantColors(
                          selectedFeelingData.quadrant as QuadrantType
                        ).shadow
                      }`}
                    >
                      <h3
                        className={`text-xl font-semibold capitalize mb-2 ${
                          getQuadrantColors(
                            selectedFeelingData.quadrant as QuadrantType
                          ).text
                        }`}
                      >
                        {selectedFeeling}
                      </h3>
                      <p className="text-gray-300 mb-4">
                        {selectedFeelingData.definition}
                      </p>
                      <div className="flex justify-between text-sm text-gray-400 mb-4">
                        <span>
                          Valence: {selectedFeelingData.valence.toFixed(2)}
                        </span>
                        <span>
                          Arousal: {selectedFeelingData.arousal.toFixed(2)}
                        </span>
                      </div>

                      <div className="mb-4">
                        <label
                          htmlFor="note"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Add a note (optional)
                        </label>
                        <textarea
                          id="note"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200"
                          rows={3}
                          placeholder="What made you feel this way? Any additional thoughts?"
                        />
                      </div>

                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`w-full bg-gradient-to-r ${
                          getQuadrantColors(
                            selectedFeelingData.quadrant as QuadrantType
                          ).gradient
                        } text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:opacity-90 transition-all duration-300`}
                      >
                        {isSubmitting ? "Logging..." : "Log Mood"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodMeter;
