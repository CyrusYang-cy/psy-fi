'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_MOOD_COLLECTION_ID: MOOD_COLLECTION_ID,
} = process.env;

export async function logMood({
  userId,
  quadrant,
  feeling,
  note = ""
}: {
  userId: string;
  quadrant: 'red' | 'blue' | 'green' | 'yellow';
  feeling: string;
  note?: string;
}) {
  try {
    const { database } = await createAdminClient();
    
    // Ensure the mood collection ID is set
    if (!MOOD_COLLECTION_ID) {
      throw new Error("Mood collection ID is not set in environment variables");
    }
    
    const timestamp = new Date().toISOString();
    
    // Create a unique document ID
    const documentId = ID.unique();
    
    const moodEntry = await database.createDocument(
      DATABASE_ID!,
      MOOD_COLLECTION_ID,
      documentId,
      {
        userId,
        quadrant,
        feeling,
        note,
        timestamp
      }
    );
    
    revalidatePath("/mood-meter");
    
    return parseStringify(moodEntry);
  } catch (error) {
    console.error("Error logging mood:", error);
    throw error;
  }
}

export async function getMoodEntries({ 
  userId, 
  limit = 500 
}: { 
  userId: string; 
  limit?: number; 
}) {
  try {
    const { database } = await createAdminClient();
    
    // Ensure the mood collection ID is set
    if (!MOOD_COLLECTION_ID) {
      throw new Error("Mood collection ID is not set in environment variables");
    }
    
    // Simple query to get all entries for the user, ordered by timestamp
    const queries = [
      Query.equal('userId', [userId]),
      Query.orderAsc('timestamp'), // Keep ascending order to get oldest first
      Query.limit(5000) // Set a very high limit to ensure we get everything
    ];
    
    const moods = await database.listDocuments(
      DATABASE_ID!,
      MOOD_COLLECTION_ID,
      queries
    );
    
    console.log(`Fetched ${moods.documents.length} mood entries for user ${userId}`);
    
    return parseStringify(moods.documents);
  } catch (error) {
    console.error("Error getting mood entries:", error);
    return [];
  }
}

export async function deleteMoodEntry({ 
  moodId 
}: { 
  moodId: string; 
}) {
  try {
    const { database } = await createAdminClient();
    
    // Ensure the mood collection ID is set
    if (!MOOD_COLLECTION_ID) {
      throw new Error("Mood collection ID is not set in environment variables");
    }
    
    await database.deleteDocument(
      DATABASE_ID!,
      MOOD_COLLECTION_ID,
      moodId
    );
    
    revalidatePath("/mood-meter");
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting mood entry:", error);
    return { success: false, error };
  }
}
