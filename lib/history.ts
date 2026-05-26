import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface AnalysisResult {
  id: string;
  date: string;
  concentration: number;
  area: number;
  imageUri?: string; // Optional: save a thumbnail or reference to image if possible
  mode?: "experiment" | "normal";
  location?: { latitude: number; longitude: number };
  locationName?: string;
  sampleName?: string;
  experimentRound?: number;
  notes?: string;
}

const STORAGE_KEY = "@analysis_history";

export const saveResult = async (result: Omit<AnalysisResult, "id">) => {
  try {
    // 1. Always save to local AsyncStorage for offline redundancy & backups
    const historyString = await AsyncStorage.getItem(STORAGE_KEY);
    const history: AnalysisResult[] = historyString
      ? JSON.parse(historyString)
      : [];

    const generatedId = Date.now().toString();
    const newResult: AnalysisResult = {
      ...result,
      id: generatedId,
    };

    const newHistory = [newResult, ...history].slice(0, 50);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));

    // 2. If Supabase is configured, sync/save to cloud database
    if (isSupabaseConfigured && supabase) {
      console.log("[Supabase] Syncing record to remote database...");
      const { data, error } = await supabase
        .from("contaminants")
        .insert({
          date: result.date,
          concentration: result.concentration,
          area: result.area,
          mode: result.mode || "normal",
          latitude: result.location?.latitude || null,
          longitude: result.location?.longitude || null,
          location_name: result.locationName || null,
          sample_name: result.sampleName || "Sample A",
          notes: result.notes || null,
        })
        .select();

      if (error) {
        console.error("[Supabase] Failed to sync remote record, using local backup:", error);
      } else if (data && data.length > 0) {
        console.log("[Supabase] Successfully synced record. Remote ID:", data[0].id);
        // Returns the remote synced record representation
        const savedObj = {
          ...newResult,
          id: data[0].id.toString(),
        };
        (savedObj as any).synced = true;
        return savedObj;
      }
    }

    (newResult as any).synced = false;
    return newResult;
  } catch (e) {
    console.error("Failed to save result", e);
    throw e;
  }
};

export const getHistory = async (): Promise<AnalysisResult[]> => {
  try {
    // 1. If Supabase is configured, fetch global collaborative records from cloud DB
    if (isSupabaseConfigured && supabase) {
      console.log("[Supabase] Fetching remote records for collaborative DataMap...");
      const { data, error } = await supabase
        .from("contaminants")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        console.error("[Supabase] Failed to fetch remote history, falling back to local history:", error);
      } else if (data) {
        const results = data.map((row: any) => ({
          id: row.id.toString(),
          date: row.date || new Date().toISOString(),
          concentration: Number(row.concentration),
          area: Number(row.area),
          imageUri: undefined,
          mode: row.mode as "experiment" | "normal",
          location: row.latitude && row.longitude
            ? { latitude: Number(row.latitude), longitude: Number(row.longitude) }
            : undefined,
          locationName: row.location_name || undefined,
          sampleName: row.sample_name || undefined,
          notes: row.notes || undefined,
        }));
        (results as any).synced = true;
        return results;
      }
    }

    // 2. Fallback / Default: fetch local history from AsyncStorage
    console.log("[Supabase] Fetching local device history from AsyncStorage...");
    const historyString = await AsyncStorage.getItem(STORAGE_KEY);
    const results: AnalysisResult[] = historyString ? JSON.parse(historyString) : [];
    (results as any).synced = false;
    return results;
  } catch (e) {
    console.error("Failed to get history", e);
    return [];
  }
};

export const clearHistory = async () => {
  try {
    // 1. Clear local history
    await AsyncStorage.removeItem(STORAGE_KEY);

    // 2. If Supabase is configured, optionally clear remote database records (if user desires)
    if (isSupabaseConfigured && supabase) {
      console.warn("[Supabase] clearHistory only deletes local device history. Remote database is retained for public collaboration.");
    }
  } catch (e) {
    console.error("Failed to clear history", e);
  }
};
