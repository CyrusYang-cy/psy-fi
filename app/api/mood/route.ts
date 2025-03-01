import { NextRequest, NextResponse } from "next/server";
import { getMoodEntries } from "@/lib/actions/mood.actions";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const moodEntries = await getMoodEntries({ userId });
    return NextResponse.json(moodEntries);
  } catch (error) {
    console.error("Error fetching mood entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch mood entries" },
      { status: 500 }
    );
  }
} 