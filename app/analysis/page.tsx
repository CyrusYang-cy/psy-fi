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
  const moodEntries = await getMoodEntries({
    userId: user.$id,
  });

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
            Your mood graph visualizes your emotional journey over time with two
            key trend lines:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>
              <span className="text-blue-400 font-medium">
                Blue line (Valence)
              </span>
              : Represents the pleasantness of your mood, ranging from negative
              (-1) to positive (+1)
            </li>
            <li>
              <span className="text-red-400 font-medium">
                Red line (Arousal)
              </span>
              : Represents your energy level, ranging from low energy (-1) to
              high energy (+1)
            </li>
          </ul>

          <p className="text-gray-300 mt-4">
            Hover anywhere on the graph to see details for that specific date. A
            vertical line will appear showing the mood data for that moment,
            along with any significant events. Look for patterns in how the two
            lines move together or diverge to better understand your emotional
            health over time.
          </p>
        </div>
      </section>
    </main>
  );
}
