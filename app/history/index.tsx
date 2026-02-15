import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image as RNImage,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Trash2, Clock, FileX } from "lucide-react-native";
import { tokens } from "../../lib/design-tokens";
import { getHistory, clearHistory, AnalysisResult } from "../../lib/history";
import { useCallback, useState } from "react";

export default function HistoryScreen() {
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setHistory);
    }, []),
  );

  const handleClearHistory = async () => {
    if (Platform.OS === "web") {
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={tokens.color.iconDefault} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>분석 기록</Text>
        {history.length > 0 ? (
          <TouchableOpacity
            onPress={handleClearHistory}
            style={styles.clearButton}
          >
            <Trash2 size={14} color={tokens.color.accentRed} />
            <Text style={styles.clearButtonText}>전체 삭제</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Content */}
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <FileX size={40} color="#cbd5e1" />
          </View>
          <Text style={styles.emptyTitle}>기록이 없습니다</Text>
          <Text style={styles.emptySubtitle}>
            분석을 완료하면 여기에 기록이 저장됩니다
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={{
            paddingHorizontal: tokens.spacing.screenPadding,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.countLabel}>
            총 {history.length}건의 분석 기록
          </Text>

          {history.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.historyItem}
              onPress={() => {
                router.push({
                  pathname: "/result",
                  params: {
                    area: item.area.toFixed(2),
                    concentration: item.concentration.toFixed(4),
                  },
                });
              }}
              activeOpacity={0.7}
            >
              {item.imageUri ? (
                <RNImage
                  source={{ uri: item.imageUri }}
                  style={styles.historyImage}
                />
              ) : (
                <View
                  style={[styles.historyImage, styles.historyImagePlaceholder]}
                >
                  <Clock size={20} color={tokens.color.textPlaceholder} />
                </View>
              )}
              <View style={styles.flex1}>
                <Text style={styles.historyConcentration}>
                  {item.concentration.toFixed(4)} %
                </Text>
                <Text style={styles.historyMeta}>
                  반응 면적: {item.area.toFixed(1)} mm²
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(item.date).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: tokens.color.bgScreen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.screenPadding,
    paddingVertical: 16,
  },
  backButton: {
    width: tokens.button.backSize,
    height: tokens.button.backSize,
    backgroundColor: tokens.color.bgMuted,
    borderRadius: tokens.button.backSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: tokens.color.textPrimary,
  },
  headerSpacer: {
    width: tokens.button.backSize,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.accentRedBg,
  },
  clearButtonText: {
    color: tokens.color.accentRed,
    ...tokens.font.small,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.color.bgLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: tokens.color.iconDefault,
  },
  emptySubtitle: {
    ...tokens.font.subtitle,
    fontSize: 14,
    textAlign: "center",
  },
  // List
  countLabel: {
    ...tokens.font.small,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 16,
    marginTop: 8,
  },
  historyItem: {
    backgroundColor: tokens.color.bgPrimary,
    padding: tokens.spacing.cardPadding,
    borderRadius: tokens.radius.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
    ...tokens.shadow.card,
    ...tokens.border.card,
  },
  historyImage: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.thumbnail,
    backgroundColor: tokens.color.bgLight,
  },
  historyImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  historyConcentration: {
    ...tokens.font.cardValue,
    marginBottom: 2,
  },
  historyMeta: {
    ...tokens.font.cardCaption,
    marginBottom: 2,
  },
  historyDate: {
    ...tokens.font.small,
  },
});
