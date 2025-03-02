"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { MOOD_QUADRANTS } from "@/lib/constants/mood";

type MoodSpendingAnalysisProps = {
  moodEntries: any[];
  transactions: any[];
};

const MoodSpendingAnalysis = ({
  moodEntries,
  transactions,
}: MoodSpendingAnalysisProps) => {
  // Helper function to get mood values from entries
  const getMoodValue = (entry: any) => {
    if (!entry || !entry.quadrant || !entry.feeling) return null;

    const quadrant =
      MOOD_QUADRANTS[entry.quadrant as keyof typeof MOOD_QUADRANTS];
    if (!quadrant) return null;

    const feeling = quadrant.feelings.find((f) => f.name === entry.feeling);
    if (!feeling) return null;

    return {
      valence: feeling.valence,
      arousal: feeling.arousal,
      quadrantName: quadrant.name,
    };
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  // Helper function to calculate Pearson correlation coefficient
  const calculateCorrelation = (data: [number, number][]) => {
    const n = data.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0,
      sumY2 = 0;

    data.forEach(([x, y]) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    });

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  };

  // Process and correlate mood and spending data
  const analysis = useMemo(() => {
    if (
      !moodEntries ||
      moodEntries.length === 0 ||
      !transactions ||
      transactions.length === 0
    ) {
      return null;
    }

    const validMoodEntries = moodEntries.filter(
      (entry) => !!getMoodValue(entry)
    );
    const validTransactions = transactions.filter(
      (tx) => (tx.amount > 0 && !tx.pending && tx.date) || tx.timestamp
    );

    if (validMoodEntries.length === 0 || validTransactions.length === 0) {
      return null;
    }

    // Group transactions by day
    const txByDay: Record<string, any[]> = {};
    let totalSpending = 0;
    let highestSpendingDay = { date: "", amount: 0 };
    const spendingCategories: Record<string, { count: number; total: number }> =
      {};

    validTransactions.forEach((tx) => {
      const day = format(new Date(tx.date || tx.timestamp), "yyyy-MM-dd");

      if (!txByDay[day]) {
        txByDay[day] = [];
      }

      txByDay[day].push(tx);
      totalSpending += tx.amount;

      // Track highest spending day
      const dayTotal = txByDay[day].reduce((sum, t) => sum + t.amount, 0);
      if (dayTotal > highestSpendingDay.amount) {
        highestSpendingDay = { date: day, amount: dayTotal };
      }

      // Track spending by category
      if (tx.category) {
        if (!spendingCategories[tx.category]) {
          spendingCategories[tx.category] = { count: 0, total: 0 };
        }
        spendingCategories[tx.category].count++;
        spendingCategories[tx.category].total += tx.amount;
      }
    });

    // Group mood entries by day
    const moodByDay: Record<string, any[]> = {};
    validMoodEntries.forEach((entry) => {
      const day = format(new Date(entry.timestamp), "yyyy-MM-dd");

      if (!moodByDay[day]) {
        moodByDay[day] = [];
      }

      moodByDay[day].push({
        ...entry,
        moodValue: getMoodValue(entry),
      });
    });

    // Days with both mood and transactions
    const daysWithBoth = Object.keys(txByDay).filter((day) => moodByDay[day]);

    // Calculate correlation between spending and mood
    let valenceCorrelationData: [number, number][] = [];
    let arousalCorrelationData: [number, number][] = [];

    daysWithBoth.forEach((day) => {
      const dayTxs = txByDay[day];
      const daySpending = dayTxs.reduce((sum, tx) => sum + tx.amount, 0);

      const dayMoods = moodByDay[day];
      // Calculate average mood values for the day
      let totalValence = 0;
      let totalArousal = 0;

      dayMoods.forEach((mood) => {
        if (mood.moodValue) {
          totalValence += mood.moodValue.valence;
          totalArousal += mood.moodValue.arousal;
        }
      });

      const avgValence = totalValence / dayMoods.length;
      const avgArousal = totalArousal / dayMoods.length;

      valenceCorrelationData.push([daySpending, avgValence]);
      arousalCorrelationData.push([daySpending, avgArousal]);
    });

    // Calculate Pearson correlation coefficient for valence
    let valenceCorrelation = 0;
    let arousalCorrelation = 0;

    if (valenceCorrelationData.length > 1) {
      valenceCorrelation = calculateCorrelation(valenceCorrelationData);
    }

    if (arousalCorrelationData.length > 1) {
      arousalCorrelation = calculateCorrelation(arousalCorrelationData);
    }

    // Find mood quadrants with highest/lowest spending
    const spendingByQuadrant: Record<string, { count: number; total: number }> =
      {};

    daysWithBoth.forEach((day) => {
      const daySpending = txByDay[day].reduce((sum, tx) => sum + tx.amount, 0);
      const dayMoods = moodByDay[day];

      dayMoods.forEach((mood) => {
        if (mood.moodValue && mood.moodValue.quadrantName) {
          const quadrant = mood.moodValue.quadrantName;

          if (!spendingByQuadrant[quadrant]) {
            spendingByQuadrant[quadrant] = { count: 0, total: 0 };
          }

          spendingByQuadrant[quadrant].count++;
          spendingByQuadrant[quadrant].total += daySpending / dayMoods.length; // Divide by number of moods that day
        }
      });
    });

    // Calculate average spending by quadrant
    const avgSpendingByQuadrant = Object.entries(spendingByQuadrant)
      .map(([quadrant, data]) => ({
        quadrant,
        avgSpending: data.total / data.count,
        count: data.count,
      }))
      .sort((a, b) => b.avgSpending - a.avgSpending);

    // Get top spending category
    const topCategory = Object.entries(spendingCategories)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
      }))[0];

    return {
      totalDaysAnalyzed: daysWithBoth.length,
      totalSpending,
      highestSpendingDay: {
        date: highestSpendingDay.date,
        amount: highestSpendingDay.amount,
      },
      valenceCorrelation,
      arousalCorrelation,
      avgSpendingByQuadrant,
      topCategory,
    };
  }, [moodEntries, transactions]);

  // Helper to interpret correlation strength
  const interpretCorrelation = (correlation: number) => {
    const absCorr = Math.abs(correlation);

    if (absCorr < 0.1) return "No";
    if (absCorr < 0.3) return "Weak";
    if (absCorr < 0.5) return "Moderate";
    if (absCorr < 0.7) return "Strong";
    return "Very strong";
  };

  // Helper to explain correlation direction
  const explainCorrelation = (
    correlation: number,
    type: "valence" | "arousal"
  ) => {
    if (Math.abs(correlation) < 0.1) return "no clear relationship";

    const direction = correlation > 0 ? "positive" : "negative";
    const strength = interpretCorrelation(correlation);

    if (type === "valence") {
      return correlation > 0
        ? `${strength.toLowerCase()} tendency to spend more when in a better mood`
        : `${strength.toLowerCase()} tendency to spend more when in a worse mood`;
    } else {
      return correlation > 0
        ? `${strength.toLowerCase()} tendency to spend more when more energetic/activated`
        : `${strength.toLowerCase()} tendency to spend more when calmer/less aroused`;
    }
  };

  if (!analysis) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 mt-6">
        <h2 className="text-xl font-semibold text-white mb-2">
          Spending and Mood Analysis
        </h2>
        <p className="text-gray-300">
          Insufficient data to analyze the relationship between your mood and
          spending patterns. Continue logging your moods and transactions to see
          insights here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 mt-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        Your Spending and Mood Patterns
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-2">
            Spending Overview
          </h3>
          <p className="text-sm text-gray-300 mb-1">
            Total analyzed:{" "}
            <span className="font-medium text-white">
              {formatCurrency(analysis.totalSpending)}
            </span>
          </p>
          <p className="text-sm text-gray-300 mb-1">
            Data period:{" "}
            <span className="font-medium text-white">
              {analysis.totalDaysAnalyzed} days
            </span>
          </p>
          {analysis.highestSpendingDay.date && (
            <p className="text-sm text-gray-300">
              Highest spending:{" "}
              <span className="font-medium text-white">
                {formatCurrency(analysis.highestSpendingDay.amount)}
              </span>{" "}
              on{" "}
              <span className="font-medium text-white">
                {format(
                  parseISO(analysis.highestSpendingDay.date),
                  "MMM d, yyyy"
                )}
              </span>
            </p>
          )}
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-2">
            Mood Correlation
          </h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-sm text-gray-300">
                Pleasantness:{" "}
                <span className="font-medium text-white">
                  {interpretCorrelation(analysis.valenceCorrelation)}{" "}
                  {analysis.valenceCorrelation > 0 ? "positive" : "negative"}{" "}
                  correlation
                </span>
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <span className="text-sm text-gray-300">
                Energy level:{" "}
                <span className="font-medium text-white">
                  {interpretCorrelation(analysis.arousalCorrelation)}{" "}
                  {analysis.arousalCorrelation > 0 ? "positive" : "negative"}{" "}
                  correlation
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-3">
          Spending by Emotional State
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {analysis.avgSpendingByQuadrant.map((item) => (
            <div
              key={item.quadrant}
              className={`p-3 rounded-lg ${
                item.quadrant === "Red"
                  ? "bg-red-900/30"
                  : item.quadrant === "Yellow"
                  ? "bg-yellow-900/30"
                  : item.quadrant === "Green"
                  ? "bg-green-900/30"
                  : "bg-blue-900/30"
              }`}
            >
              <p className="text-sm font-medium text-white mb-1">
                {item.quadrant}
              </p>
              <p className="text-lg font-bold text-white">
                {formatCurrency(item.avgSpending)}
              </p>
              <p className="text-xs text-gray-400">
                avg. per day ({item.count} instances)
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-white mb-3">Key Insights</h3>
        <ul className="space-y-2 text-gray-300">
          <li className="flex">
            <span className="text-yellow-400 mr-2">•</span>
            <span>
              You show a{" "}
              {explainCorrelation(analysis.valenceCorrelation, "valence")}.
            </span>
          </li>
          <li className="flex">
            <span className="text-yellow-400 mr-2">•</span>
            <span>
              Your data reveals a{" "}
              {explainCorrelation(analysis.arousalCorrelation, "arousal")}.
            </span>
          </li>
          <li className="flex">
            <span className="text-yellow-400 mr-2">•</span>
            <span>
              You spend the most money when feeling{" "}
              <span className="font-medium text-white">
                {analysis.avgSpendingByQuadrant[0]?.quadrant}
              </span>{" "}
              emotions.
            </span>
          </li>
          {analysis.topCategory && (
            <li className="flex">
              <span className="text-yellow-400 mr-2">•</span>
              <span>
                Your top spending category is{" "}
                <span className="font-medium text-white">
                  {analysis.topCategory.category}
                </span>{" "}
                ({formatCurrency(analysis.topCategory.total)}).
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default MoodSpendingAnalysis;
