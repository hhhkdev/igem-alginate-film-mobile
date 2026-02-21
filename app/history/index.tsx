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
import { safeGoBack } from "../../lib/navigation";
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
        "Are you sure you want to delete all analysis history?\nThis action cannot be undone.",
      );
      if (confirmed) {
        await clearHistory();
        setHistory([]);
      }
    } else {
      Alert.alert(
        "Delete History",
        "Are you sure you want to delete all analysis history?\nThis action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
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
          onPress={() => safeGoBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={tokens.color.iconDefault} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis History</Text>
        {history.length > 0 ? (
          <TouchableOpacity
            onPress={handleClearHistory}
            style={styles.clearButton}
          >
            <Trash2 size={14} color={tokens.color.accentRed} />
            <Text style={styles.clearButtonText}>Delete All</Text>
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
          <Text style={styles.emptyTitle}>No records</Text>
          <Text style={styles.emptySubtitle}>
            Records will be saved here after completing an analysis
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
            Total {history.length} analysis records
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
                    concentration: item.concentration.toFixed(1),
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
                  {item.concentration > 1
                    ? item.concentration.toFixed(1)
                    : (item.concentration * 10000).toFixed(1)}{" "}
                  ppm
                </Text>
                <Text style={styles.historyMeta}>
                  Reaction Area: {item.area.toFixed(1)} mm²
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(item.date).toLocaleDateString("en-US", {
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
    ...tokens.font.small,
    color: tokens.color.accentRed,
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
