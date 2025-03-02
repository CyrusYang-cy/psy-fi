"use client";

import { useState } from "react";
import { deleteMoodEntry } from "@/lib/actions/mood.actions";
import { MOOD_QUADRANTS } from "@/lib/constants/mood";
import { formatDistanceToNow, format } from "date-fns";

type MoodHistoryProps = {
  entries: any[];
};

const MoodHistory = ({ entries }: MoodHistoryProps) => {
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-xl">
        <p className="text-gray-600">You haven't logged any moods yet.</p>
        <p className="text-gray-500 text-sm mt-2">
          Select a quadrant above to log your first mood!
        </p>
      </div>
    );
  }

  const handleToggleExpand = (entryId: string) => {
    if (expandedEntryId === entryId) {
      setExpandedEntryId(null);
    } else {
      setExpandedEntryId(entryId);
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      setIsDeleting(entryId);
      await deleteMoodEntry({ moodId: entryId });
    } catch (error) {
      console.error("Error deleting mood entry:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  const getQuadrantStyle = (quadrant: string) => {
    const styles = {
      red: "bg-red-100 border-red-500 text-red-700",
      blue: "bg-blue-100 border-blue-500 text-blue-700",
      green: "bg-green-100 border-green-500 text-green-700",
      yellow: "bg-yellow-100 border-yellow-500 text-yellow-700",
    };

    return styles[quadrant as keyof typeof styles] || "";
  };

  const groupEntriesByDate = () => {
    const grouped: Record<string, any[]> = {};

    entries.forEach((entry) => {
      const formattedDate = format(new Date(entry.timestamp), "MM/dd/yyyy");

      if (!grouped[formattedDate]) {
        grouped[formattedDate] = [];
      }

      grouped[formattedDate].push(entry);
    });

    return grouped;
  };

  const groupedEntries = groupEntriesByDate();

  return (
    <div className="space-y-8">
      {Object.entries(groupedEntries).map(([date, dayEntries]) => (
        <div key={date} className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-medium">{date}</h3>
          </div>

          <div className="divide-y">
            {dayEntries.map((entry) => {
              const isExpanded = expandedEntryId === entry.$id;
              const quadrantStyle = getQuadrantStyle(entry.quadrant);
              const quadrantInfo =
                MOOD_QUADRANTS[entry.quadrant as keyof typeof MOOD_QUADRANTS];
              const feelingInfo = quadrantInfo?.feelings.find(
                (f) => f.name === entry.feeling
              );

              return (
                <div key={entry.$id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          quadrantStyle.split(" ")[0]
                        }`}
                      />
                      <span className="font-medium capitalize">
                        {entry.feeling}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(entry.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleExpand(entry.$id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {isExpanded ? "Hide details" : "Show details"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pl-6">
                      <div
                        className={`${quadrantStyle} px-3 py-2 rounded-lg inline-block mb-3`}
                      >
                        <span className="capitalize">{entry.quadrant}</span> -{" "}
                        {quadrantInfo?.description}
                      </div>

                      {feelingInfo && (
                        <p className="text-gray-700 mb-3">
                          <span className="font-medium">Definition:</span>{" "}
                          {feelingInfo.definition}
                        </p>
                      )}

                      {entry.note && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-3">
                          <p className="text-gray-700">{entry.note}</p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDelete(entry.$id)}
                          disabled={isDeleting === entry.$id}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          {isDeleting === entry.$id
                            ? "Deleting..."
                            : "Delete entry"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MoodHistory;
