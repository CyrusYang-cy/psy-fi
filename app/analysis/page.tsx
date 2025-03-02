import { Metadata } from "next";
import MoodGraph from "@/components/MoodGraph";
import SpendingMoodGraph from "@/components/SpendingMoodGraph";
import MoodSpendingAnalysis from "@/components/MoodSpendingAnalysis";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getMoodEntries } from "@/lib/actions/mood.actions";
import { redirect } from "next/navigation";
import {
  getAccounts,
  getAccount,
  getTransactions,
} from "@/lib/actions/bank.actions";

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

  // Get user's financial accounts
  const accountsData = await getAccounts({
    userId: user.$id,
  });

  // Initialize transactions as empty array
  let transactions: any[] = [];

  // If user has linked accounts, get transactions from the first one
  if (accountsData?.data && accountsData.data.length > 0) {
    const firstAccount = accountsData.data[0];
    const accountDetails = await getAccount({
      appwriteItemId: firstAccount.appwriteItemId,
    });

    if (accountDetails?.transactions) {
      transactions = accountDetails.transactions;
    }
  }

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

        <div className="mt-12">
          <SpendingMoodGraph
            moodEntries={moodEntries}
            transactions={transactions}
          />
        </div>

        <MoodSpendingAnalysis
          moodEntries={moodEntries}
          transactions={transactions}
        />

        <div className="mt-12 bg-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-6 text-white">
            Mood-Spending Connection
          </h2>
          <p className="text-gray-300 mb-4">
            The graph above combines your mood data with your spending patterns,
            revealing potential relationships between your emotional state and
            financial behavior.
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>
              <span className="text-blue-400 font-medium">
                Blue line (Valence)
              </span>
              : Your mood pleasantness, as in the mood graph above
            </li>
            <li>
              <span className="text-red-400 font-medium">
                Red line (Arousal)
              </span>
              : Your energy level, as in the mood graph above
            </li>
            <li>
              <span className="text-green-400 font-medium">
                Green line (Spending)
              </span>
              : Your daily spending amounts
            </li>
          </ul>

          <p className="text-gray-300 mt-4">
            Watch for patterns where your spending increases or decreases in
            relation to mood changes. For example, you might notice higher
            spending when you're in a more positive mood (high valence) or when
            you have more energy (high arousal). Understanding these patterns
            can help you make more mindful financial decisions.
          </p>
        </div>
      </section>
    </main>
  );
}
