import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ToastAndroid,
  Image,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Scan, ArrowRight, Clock, Map } from "lucide-react-native";
import { tokens } from "../lib/design-tokens";
import { getHistory } from "../lib/history";
import { useCallback, useState } from "react";
import { useToast } from "../components/ToastProvider";

export default function HomeScreen() {
  const [historyCount, setHistoryCount] = useState(0);
  const { showToast } = useToast();

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
          <Image
            source={require("../assets/logo-vertical.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <Pressable
            style={styles.startButton}
            onPress={() => router.push("/input-details")}
          >
            <Text style={styles.startButtonText}>MEASURE</Text>
            <ArrowRight size={20} color="white" strokeWidth={2.5} />
          </Pressable>

          {/* Map View Button */}
          <Pressable
            style={styles.mapButton}
            onPress={() => {
              showToast(
                "Map View will be available in a future update",
                "info",
              );
            }}
          >
            <Text style={styles.mapButtonText}>Data Map</Text>
            <Map size={20} color={tokens.color.accentBlue} strokeWidth={2.5} />
          </Pressable>

          {/* History Button (Demoted Hierarchy) */}
          <TouchableOpacity
            style={styles.historyTextButton}
            onPress={() => router.push("/history")}
            activeOpacity={0.7}
          >
            <Clock size={16} color={tokens.color.textMuted} />
            <Text style={styles.historyTextButtonLabel}>
              Analysis History {historyCount > 0 ? `(${historyCount})` : ""}
            </Text>
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
  logo: {
    width: 280,
    height: 280,
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
  },
  startButtonText: {
    ...tokens.font.ctaText,
  },
  mapButton: {
    width: "100%",
    backgroundColor: tokens.color.bgPrimary,
    borderWidth: 1.5,
    borderColor: tokens.color.accentBlue,
    height: tokens.button.ctaHeight,
    borderRadius: tokens.radius.button,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  mapButtonText: {
    ...tokens.font.ctaText,
    color: tokens.color.accentBlue,
  },
  historyTextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: tokens.color.bgMuted,
    borderRadius: tokens.radius.pill,
    gap: 8,
    marginTop: 8,
  },
  historyTextButtonLabel: {
    ...tokens.font.subtitle,
    fontSize: 14,
    color: tokens.color.textSecondary,
    fontWeight: "500",
  },
  versionText: {
    textAlign: "center",
    ...tokens.font.small,
    fontSize: 14,
  },
});
