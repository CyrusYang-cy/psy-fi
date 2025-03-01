"use client";

import { useState, useEffect } from "react";
import { logMood } from "@/lib/actions/mood.actions";
import { MOOD_QUADRANTS } from "@/lib/constants/mood";
import { motion } from "framer-motion";
import Image from "next/image";

type MoodMeterProps = {
  user: User;
};

type QuadrantType = "red" | "blue" | "green" | "yellow";

// SVG paths for different blob shapes
const blobPaths = [
  "M50,-50 C69.5,-35 80,-17.5 80,0 C80,17.5 69.5,35 50,50 C30.5,65 15,72.5 0,72.5 C-15,72.5 -30.5,65 -50,50 C-69.5,35 -80,17.5 -80,0 C-80,-17.5 -69.5,-35 -50,-50 C-30.5,-65 -15,-72.5 0,-72.5 C15,-72.5 30.5,-65 50,-50",
  "M45,-45 C62.5,-31.5 72,-15.75 72,0 C72,15.75 62.5,31.5 45,45 C27.5,58.5 13.5,65.25 0,65.25 C-13.5,65.25 -27.5,58.5 -45,45 C-62.5,31.5 -72,15.75 -72,0 C-72,-15.75 -62.5,-31.5 -45,-45 C-27.5,-58.5 -13.5,-65.25 0,-65.25 C13.5,-65.25 27.5,-58.5 45,-45",
  "M55,-55 C76.5,-38.5 88,-19.25 88,0 C88,19.25 76.5,38.5 55,55 C33.5,71.5 16.5,79.75 0,79.75 C-16.5,79.75 -33.5,71.5 -55,55 C-76.5,38.5 -88,19.25 -88,0 C-88,-19.25 -76.5,-38.5 -55,-55 C-33.5,-71.5 -16.5,-79.75 0,-79.75 C16.5,-79.75 33.5,-71.5 55,-55",
  "M60,-60 C83.5,-42 96,-21 96,0 C96,21 83.5,42 60,60 C36.5,78 18,87 0,87 C-18,87 -36.5,78 -60,60 C-83.5,42 -96,21 -96,0 C-96,-21 -83.5,-42 -60,-60 C-36.5,-78 -18,-87 0,-87 C18,-87 36.5,-78 60,-60",
];

const MoodMeter = ({ user }: MoodMeterProps) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantType | null>(
    null
  );
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [blobIndex, setBlobIndex] = useState(0);
  const [hoveredQuadrant, setHoveredQuadrant] = useState<QuadrantType | null>(
    null
  );
  const [hoveredFeeling, setHoveredFeeling] = useState<string | null>(null);

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
  };

  const handleFeelingSelect = (feeling: string) => {
    setSelectedFeeling(feeling);
  };

  const handleQuadrantHover = (quadrant: QuadrantType | null) => {
    setHoveredQuadrant(quadrant);
  };

  const handleFeelingHover = (feeling: string | null) => {
    setHoveredFeeling(feeling);
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
        setSelectedQuadrant(null);
        setSelectedFeeling(null);
        setNote("");
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error logging mood:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentFeelingDefinition = () => {
    if (!selectedQuadrant || !selectedFeeling) return null;

    const feeling = MOOD_QUADRANTS[selectedQuadrant].feelings.find(
      (f) => f.name === selectedFeeling
    );

    return feeling?.definition;
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
            <p className="text-gray-400 mb-8 text-center max-w-lg">
              Select a quadrant that best matches your current energy and
              pleasantness level
            </p>

            {!selectedQuadrant ? (
              <div className="grid grid-cols-2 gap-8 max-w-3xl mx-auto mb-8">
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
            ) : (
              <div className="w-full max-w-3xl">
                <div className="flex items-center mb-6">
                  <button
                    onClick={() => setSelectedQuadrant(null)}
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
                    Back to quadrants
                  </button>
                </div>

                <h3
                  className={`text-xl font-bold mb-4 ${
                    getQuadrantColors(selectedQuadrant).text
                  }`}
                >
                  {MOOD_QUADRANTS[selectedQuadrant].name} Feelings
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
                  {MOOD_QUADRANTS[selectedQuadrant].feelings.map((feeling) => {
                    const colors = getQuadrantColors(selectedQuadrant);
                    const isSelected = feeling.name === selectedFeeling;
                    const isHovered = hoveredFeeling === feeling.name;
                    const path = blobPaths[blobIndex];

                    return (
                      <motion.div
                        key={feeling.name}
                        className="relative flex items-center justify-center"
                        animate={floatingAnimation}
                        onHoverStart={() => handleFeelingHover(feeling.name)}
                        onHoverEnd={() => handleFeelingHover(null)}
                        onClick={() => handleFeelingSelect(feeling.name)}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-br opacity-70 rounded-full filter blur-md"
                          style={{
                            background: `radial-gradient(circle, ${colors.fill}40 0%, ${colors.fill}00 70%)`,
                          }}
                          initial={{ scale: 0.9 }}
                          animate={{
                            scale: isSelected || isHovered ? 1.1 : 1,
                            opacity: isSelected || isHovered ? 0.9 : 0.7,
                          }}
                          transition={{ duration: 0.3 }}
                        />

                        <motion.div
                          className="relative cursor-pointer w-24 h-24 flex items-center justify-center p-2 backdrop-blur-sm"
                          variants={bubbleVariants}
                          initial="initial"
                          whileHover="hover"
                          whileTap="tap"
                          animate={
                            isSelected
                              ? "selected"
                              : isHovered
                              ? "hover"
                              : "initial"
                          }
                        >
                          <svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 200 200"
                            className="absolute inset-0"
                            style={{
                              filter:
                                isSelected || isHovered
                                  ? `drop-shadow(0 0 8px ${colors.fill})`
                                  : "none",
                            }}
                          >
                            <motion.path
                              d={path}
                              fill={colors.fill}
                              initial={{ opacity: 0.7 }}
                              animate={{
                                opacity: isSelected ? 1 : isHovered ? 0.9 : 0.7,
                                scale: isSelected ? 1.05 : isHovered ? 1.02 : 1,
                              }}
                              transition={{ duration: 0.3 }}
                            />
                          </svg>

                          <span className="text-white font-medium text-center z-10 capitalize">
                            {feeling.name}
                          </span>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>

                {selectedFeeling && (
                  <motion.div
                    className="w-full mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className={`p-6 rounded-xl ${
                        getQuadrantColors(selectedQuadrant).bg
                      } backdrop-blur-sm border border-gray-700 shadow-lg ${
                        getQuadrantColors(selectedQuadrant).shadow
                      }`}
                    >
                      <h3
                        className={`text-xl font-semibold capitalize mb-2 ${
                          getQuadrantColors(selectedQuadrant).text
                        }`}
                      >
                        {selectedFeeling}
                      </h3>
                      <p className="text-gray-300 mb-4">
                        {getCurrentFeelingDefinition()}
                      </p>

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
                          getQuadrantColors(selectedQuadrant).gradient
                        } text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:opacity-90 transition-all duration-300`}
                      >
                        {isSubmitting ? "Logging..." : "Log Mood"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodMeter;
