import { Metadata } from "next";
import MoodMeter from "@/components/MoodMeter";
import MoodHistory from "@/components/MoodHistory";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getMoodEntries } from "@/lib/actions/mood.actions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mood Meter | Psy-Fi",
  description:
    "Track your mood fluctuations over time with PsyFi's Mood Meter",
};

export default async function MoodMeterPage() {
  // Check for authenticated user
  const user = await getLoggedInUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's mood entries
  const moodEntries = await getMoodEntries({
    userId: user.$id,
  });

  return (
    <main className="flex-center flex-col paddings">
      <section className="w-full max-w-5xl">
        <div className="mt-8">
          <MoodMeter user={user} />
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Your Mood History</h2>
          <MoodHistory entries={moodEntries} />
        </div>
      </section>
    </main>
  );
}
