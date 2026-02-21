import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Scan, ArrowRight, Clock } from "lucide-react-native";
import { tokens } from "../lib/design-tokens";
import { getHistory } from "../lib/history";
import { useCallback, useState } from "react";

export default function HomeScreen() {
  const [historyCount, setHistoryCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getHistory().then((h) => setHistoryCount(h.length));
    }, []),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Scan size={52} color={tokens.color.accentBlue} strokeWidth={1.8} />
          </View>
          <Text style={styles.title}>Alginate Model</Text>
          <Text style={styles.subtitle}>Precise Heavy Metal Detection</Text>
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <Pressable
            style={styles.startButton}
            onPress={() => router.push("/input-details")}
          >
            <Text style={styles.startButtonText}>Start Analysis</Text>
            <ArrowRight size={20} color="white" strokeWidth={2.5} />
          </Pressable>

          {/* History Button */}
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => router.push("/history")}
            activeOpacity={0.7}
          >
            <View style={styles.historyButtonLeft}>
              <View style={styles.historyIconCircle}>
                <Clock size={18} color={tokens.color.textSecondary} />
              </View>
              <View>
                <Text style={styles.historyButtonTitle}>Analysis History</Text>
                <Text style={styles.historyButtonSub}>
                  {historyCount > 0 ? `${historyCount} records` : "No records"}
                </Text>
              </View>
            </View>
            <ArrowRight size={18} color={tokens.color.textPlaceholder} />
          </TouchableOpacity>

          <Text style={styles.versionText}>
            v1.0.0 • Offline usage available
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.bgScreen,
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing.screenPadding,
  },
  inner: {
    width: "100%",
    alignItems: "center",
    gap: 40,
  },
  headerSection: {
    alignItems: "center",
    gap: 16,
  },
  iconCircle: {
    backgroundColor: tokens.color.accentBlueLight,
    padding: 28,
    borderRadius: tokens.radius.pill,
    marginBottom: 8,
  },
  title: {
    ...tokens.font.title,
    fontSize: 32,
    textAlign: "center",
  },
  subtitle: {
    ...tokens.font.subtitle,
    fontSize: 18,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  actionSection: {
    gap: 16,
    paddingTop: 16,
    width: "100%",
  },
  startButton: {
    width: "100%",
    backgroundColor: tokens.color.accentBlue,
    height: tokens.button.ctaHeight,
    borderRadius: tokens.radius.button,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    ...tokens.shadow.cta,
  },
  startButtonText: {
    ...tokens.font.ctaText,
  },
  historyButton: {
    width: "100%",
    backgroundColor: tokens.color.bgPrimary,
    borderRadius: tokens.radius.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...tokens.shadow.card,
    ...tokens.border.card,
  },
  historyButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.thumbnail,
    backgroundColor: tokens.color.bgLight,
    alignItems: "center",
    justifyContent: "center",
  },
  historyButtonTitle: {
    ...tokens.font.cardValue,
    fontSize: 15,
    marginBottom: 2,
  },
  historyButtonSub: {
    ...tokens.font.small,
    fontSize: 13,
  },
  versionText: {
    textAlign: "center",
    ...tokens.font.small,
    fontSize: 14,
  },
});
