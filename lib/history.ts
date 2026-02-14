import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AnalysisResult {
  id: string;
  date: string;
  concentration: number;
  area: number;
  imageUri?: string; // Optional: save a thumbnail or reference to image if possible
}

const STORAGE_KEY = "@analysis_history";

export const saveResult = async (result: Omit<AnalysisResult, "id">) => {
  try {
    const historyString = await AsyncStorage.getItem(STORAGE_KEY);
    const history: AnalysisResult[] = historyString
      ? JSON.parse(historyString)
      : [];

    const newResult: AnalysisResult = {
      ...result,
      id: Date.now().toString(), // Simple ID generation
    };

    const newHistory = [newResult, ...history].slice(0, 50); // Keep last 50 results

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    return newResult;
  } catch (e) {
    console.error("Failed to save result", e);
    throw e;
  }
};

export const getHistory = async (): Promise<AnalysisResult[]> => {
  try {
    const historyString = await AsyncStorage.getItem(STORAGE_KEY);
    return historyString ? JSON.parse(historyString) : [];
  } catch (e) {
    console.error("Failed to get history", e);
    return [];
  }
};

export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear history", e);
  }
};
