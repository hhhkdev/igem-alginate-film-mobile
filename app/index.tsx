import { View, Text, Pressable, TouchableOpacity } from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Scan, ArrowRight } from "lucide-react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900 justify-center items-center p-6">
      <View className="w-full max-w-sm space-y-10">
        {/* Header Section */}
        <View className="items-center space-y-4">
          <View className="bg-blue-500/10 p-7 rounded-full mb-2 ring-1 ring-blue-500/20">
            <Scan
              size={52}
              className="text-blue-600 dark:text-blue-400"
              strokeWidth={1.8}
            />
          </View>
          <Text className="text-4xl font-extrabold text-slate-900 dark:text-white text-center tracking-tight">
            알지네이트 모델
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center text-lg leading-7 px-4 font-medium">
            <Text className="text-blue-600 dark:text-blue-400 font-semibold">
              비색법(Colorimetry)
            </Text>
            을 기반으로 한{"\n"}
            정밀 중금속 검출
          </Text>
        </View>

        {/* Action Section */}
        <View className="space-y-4 pt-4">
          <Pressable
            className="w-full bg-blue-600 hover:bg-blue-700 h-16 rounded-3xl flex-row justify-center items-center space-x-3 active:scale-[0.98] transition-transform shadow shadow-blue-500/30"
            onPress={() => router.push("/input-details")}
          >
            <Text className="text-white font-bold text-xl">분석 시작하기</Text>
            <ArrowRight size={22} color="white" strokeWidth={2.5} />
          </Pressable>

          <Text className="text-center text-slate-400 text-sm">
            v1.0.0 • 오프라인 사용 가능
          </Text>
        </View>

        {/* History Section */}
        <HistoryList />
      </View>
    </SafeAreaView>
  );
}

import { getHistory, clearHistory, AnalysisResult } from "../lib/history";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Image as RNImage, Alert, Platform } from "react-native";
import { Trash2 } from "lucide-react-native";

function HistoryList() {
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setHistory);
    }, []),
  );

  if (history.length === 0) return null;

  const handleClearHistory = async () => {
    if (Platform.OS === "web") {
      // Alert.alert doesn't work on web
      const confirmed = window.confirm(
        "모든 분석 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.",
      );
      if (confirmed) {
        await clearHistory();
        setHistory([]);
      }
    } else {
      Alert.alert(
        "기록 삭제",
        "모든 분석 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "삭제",
            style: "destructive",
            onPress: async () => {
              await clearHistory();
              setHistory([]);
            },
          },
        ],
      );
    }
  };

  return (
    <View className="flex-1 w-full mt-6">
      <View className="flex-row justify-between items-center mb-4 px-2">
        <Text className="text-slate-900 dark:text-white font-bold text-lg">
          최근 분석 기록
        </Text>
        <TouchableOpacity
          onPress={handleClearHistory}
          className="flex-row items-center gap-x-1 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 active:opacity-70"
        >
          <Trash2 size={14} color="#ef4444" />
          <Text className="text-red-500 text-xs font-medium">전체 삭제</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {history.map((item) => (
          <View
            key={item.id}
            className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-row items-center space-x-4 shadow-sm"
          >
            {item.imageUri && (
              <RNImage
                source={{ uri: item.imageUri }}
                className="w-12 h-12 rounded-lg bg-slate-200"
              />
            )}
            <View className="flex-1">
              <Text className="text-slate-900 dark:text-white font-semibold text-base">
                {item.concentration.toFixed(4)} %
              </Text>
              <Text className="text-slate-500 text-sm">
                {new Date(item.date).toLocaleDateString()} •{" "}
                {item.area.toFixed(1)} mm²
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
