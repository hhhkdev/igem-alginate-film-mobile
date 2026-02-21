import { useLocalSearchParams, router } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokens } from "../../lib/design-tokens";
import {
  CheckCircle,
  AlertTriangle,
  Home,
  ArrowLeft,
} from "lucide-react-native";

export default function ResultScreen() {
  const { area, concentration } = useLocalSearchParams();

  const resultArea = parseFloat(area as string) || 0;
  const resultConcentration = parseFloat(concentration as string) || 0;

  const isDetected = resultConcentration > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={tokens.color.iconDefault} />
        </TouchableOpacity>

        <View style={styles.centerContent}>
          {/* Header Status Icon */}
          <View
            style={[
              styles.iconCircle,
              isDetected ? styles.iconCircleRed : styles.iconCircleBlue,
            ]}
          >
            {isDetected ? (
              <AlertTriangle
                size={48}
                color={tokens.color.accentRed}
                strokeWidth={2.5}
              />
            ) : (
              <CheckCircle
                size={48}
                color={tokens.color.accentBlue}
                strokeWidth={2.5}
              />
            )}
          </View>

          {/* Main Result Text */}
          <View style={styles.resultTextGroup}>
            <Text style={styles.resultTitle}>
              {isDetected ? "Heavy Metal Detected" : "Analysis Complete"}
            </Text>
            <Text style={styles.resultDescription}>
              {isDetected
                ? "Reaction area detected.\nPlease check the detailed metrics."
                : "No unusual reaction area detected.\nJudged to be in a safe state."}
            </Text>
          </View>

          {/* Detailed Stats Card */}
          <View style={styles.statsCard}>
            <Text style={styles.statsHeader}>Detailed Analysis Results</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Measurement Date</Text>
              <Text style={styles.statValue}>
                {new Date().toLocaleDateString()}
              </Text>
            </View>

            <View style={[styles.statRow, styles.statRowBorder]}>
              <Text style={styles.statLabel}>Reaction Area</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValueBold}>{resultArea}</Text>
                <Text style={styles.statUnit}>mm²</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>
                Estimated CuSO₄ Concentration
              </Text>
              <View style={styles.statValueRow}>
                <Text
                  style={[
                    styles.statValueBold,
                    isDetected && styles.statValueRed,
                  ]}
                >
                  {resultConcentration > 0.0001
                    ? resultConcentration.toFixed(4)
                    : "0"}
                </Text>
                <Text style={styles.statUnit}>%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Home Button */}
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => {
              router.dismissAll();
              router.replace("/");
            }}
          >
            <Home size={20} color="white" />
            <Text style={styles.homeButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.bgScreen,
  },
  scrollContent: {
    flexGrow: 1,
    padding: tokens.spacing.screenPadding,
  },
  backButton: {
    ...tokens.component.backButton,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconCircleRed: {
    backgroundColor: tokens.color.accentRedBg,
  },
  iconCircleBlue: {
    backgroundColor: tokens.color.accentBlueBg,
  },
  resultTextGroup: {
    alignItems: "center",
    gap: 8,
  },
  resultTitle: {
    ...tokens.font.title,
    textAlign: "center",
  },
  resultDescription: {
    ...tokens.font.subtitle,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  statsCard: {
    width: "100%",
    backgroundColor: tokens.color.bgPrimary,
    borderRadius: tokens.radius.card,
    padding: 24,
    gap: 16,
    ...tokens.shadow.card,
    ...tokens.border.card,
  },
  statsHeader: {
    ...tokens.font.sectionLabel,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  statRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.borderDefault,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderDefault,
    paddingVertical: 12,
  },
  statLabel: {
    color: tokens.color.textSecondary,
    fontWeight: "500",
    fontSize: 15,
  },
  statValue: {
    color: tokens.color.textPrimary,
    fontWeight: "500",
    fontSize: 15,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statValueBold: {
    fontSize: 20,
    fontWeight: "700",
    color: tokens.color.textPrimary,
  },
  statValueRed: {
    color: tokens.color.accentRed,
  },
  statUnit: {
    fontSize: 14,
    color: tokens.color.textMuted,
  },
  bottomAction: {
    width: "100%",
    paddingTop: 32,
    paddingBottom: 16,
  },
  homeButton: {
    width: "100%",
    backgroundColor: tokens.color.textPrimary,
    height: tokens.button.ctaHeight,
    borderRadius: tokens.radius.button,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    ...tokens.shadow.ctaDark,
  },
  homeButtonText: {
    ...tokens.font.ctaText,
    marginLeft: 4,
  },
});
