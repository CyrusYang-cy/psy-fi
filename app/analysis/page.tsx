import { Metadata } from "next";
import MoodGraph from "@/components/MoodGraph";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getMoodEntries } from "@/lib/actions/mood.actions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mood Analysis | Psy-Fi",
  description:
    "Analyze your mood patterns over time with Horizon's Mood Analysis",
};

export default async function AnalysisPage() {
  // Check for authenticated user
  const user = await getLoggedInUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get user's mood entries
  const moodEntries = await getMoodEntries({ userId: user.$id });

  return (
    <main className="flex-center flex-col paddings">
      <section className="w-full max-w-5xl">
        <div className="mt-8">
          <MoodGraph entries={moodEntries} />
        </div>

        <div className="mt-12 bg-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-6 text-white">
            Understanding Your Mood Patterns
          </h2>
          <p className="text-gray-300 mb-4">
            Your mood graph shows your emotional journey over time. Each point
            represents a mood entry, with the vertical position indicating the
            type of mood:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>
              <span className="text-yellow-400 font-medium">
                Yellow zone (top)
              </span>
              : High energy, high pleasantness (excited, happy, curious)
            </li>
            <li>
              <span className="text-red-400 font-medium">Red zone</span>: High
              energy, low pleasantness (angry, anxious, stressed)
            </li>
            <li>
              <span className="text-green-400 font-medium">Green zone</span>:
              Low energy, high pleasantness (calm, content, relaxed)
            </li>
            <li>
              <span className="text-blue-400 font-medium">
                Blue zone (bottom)
              </span>
              : Low energy, low pleasantness (sad, tired, disappointed)
            </li>
          </ul>
          <p className="text-gray-300 mt-4">
            Hover over any point to see details about that mood entry. Look for
            patterns in your mood over time to better understand your emotional
            health.
          </p>
        </div>
      </section>
    </main>
  );
}
