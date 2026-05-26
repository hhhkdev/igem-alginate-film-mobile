import { useLocalSearchParams, router } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { safeGoBack } from "../../lib/navigation";
import { tokens } from "../../lib/design-tokens";
import {
  CheckCircle,
  AlertTriangle,
  Home,
  ArrowLeft,
  MapPin,
  FlaskConical,
  FileText,
  Map as MapIcon,
} from "lucide-react-native";
import MiniMapView from "../../components/MiniMapView";

export default function ResultScreen() {
  const { area, concentration, locationName, sampleName, notes, latitude, longitude, synced } = useLocalSearchParams();

  const resultArea = parseFloat(area as string) || 0;
  const resultConcentration = parseFloat(concentration as string) || 0;

  const isDetected = resultConcentration > 0;
  const hasCoords = !!latitude && !!longitude;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => safeGoBack()}
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

            {/* Sync Status Badge */}
            {synced ? (
              <View style={[styles.statRow, styles.statRowBorder]}>
                <Text style={styles.statLabel}>Sync Status</Text>
                <View style={[styles.syncStatusBadge, synced === "true" ? styles.syncSuccess : styles.syncFallback]}>
                  <Text style={[styles.syncStatusText, synced === "true" ? styles.syncSuccessText : styles.syncFallbackText]}>
                    {synced === "true" ? "🟢 Synced to Supabase" : "🔴 Offline Local Backup"}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Custom Metadata Details */}
            {sampleName ? (
              <View style={[styles.statRow, styles.statRowBorder]}>
                <Text style={styles.statLabel}>Sample Name</Text>
                <View style={styles.badgeWrapper}>
                  <FlaskConical size={14} color={tokens.color.accentBlue} />
                  <Text style={styles.statValue}>{sampleName}</Text>
                </View>
              </View>
            ) : null}

            {locationName ? (
              <View style={[styles.statRow, styles.statRowBorder]}>
                <Text style={styles.statLabel}>Location</Text>
                <View style={styles.badgeWrapper}>
                  <MapPin size={14} color={tokens.color.accentRed} />
                  <Text style={styles.statValue} numberOfLines={1}>{locationName}</Text>
                </View>
              </View>
            ) : null}

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
                  {resultConcentration > 1
                    ? resultConcentration.toFixed(1)
                    : "0"}
                </Text>
                <Text style={styles.statUnit}>ppm</Text>
              </View>
            </View>

            {/* Platform-Isolated Mini Map Component (지도를 통해서 볼 수 있어야해) */}
            {hasCoords ? (
              <MiniMapView
                latitude={parseFloat(latitude as string)}
                longitude={parseFloat(longitude as string)}
                isDetected={isDetected}
              />
            ) : null}

            {/* Notes Section */}
            {notes ? (
              <View style={styles.notesBlock}>
                <View style={styles.notesHeader}>
                  <FileText size={14} color={tokens.color.textMuted} />
                  <Text style={styles.notesTitle}>Notes</Text>
                </View>
                <Text style={styles.notesText}>{notes}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Multi-tiered CTAs linking directly to the DataMap */}
      <View style={styles.bottomAction}>
        {hasCoords && (
          <TouchableOpacity
            style={styles.mapLinkButton}
            onPress={() => {
              router.push("/map");
            }}
          >
            <MapIcon size={20} color="white" />
            <Text style={styles.mapLinkButtonText}>View on Data Map</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.homeButton, hasCoords && styles.homeButtonSubordinated]}
          onPress={() => {
            router.dismissAll();
            router.replace("/");
          }}
        >
          <Home size={20} color={hasCoords ? tokens.color.textPrimary : "white"} />
          <Text style={[styles.homeButtonText, hasCoords && styles.homeButtonTextSubordinated]}>
            Return to Home
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.bgScreen,
  },
  scrollView: {
    flex: 1,
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

  // Notes Block
  notesBlock: {
    marginTop: 16,
    padding: 12,
    backgroundColor: tokens.color.bgMuted,
    borderRadius: tokens.radius.toggleInner,
    borderLeftWidth: 3,
    borderLeftColor: tokens.color.accentBlue,
    width: "100%",
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: tokens.color.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 13,
    color: tokens.color.textSecondary,
    lineHeight: 18,
    fontStyle: "italic",
  },

  // Bottom action layouts
  bottomAction: {
    width: "100%",
    paddingHorizontal: tokens.spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  mapLinkButton: {
    width: "100%",
    backgroundColor: tokens.color.accentBlue,
    height: tokens.button.ctaHeight,
    borderRadius: tokens.radius.button,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    ...tokens.shadow.cta,
  },
  mapLinkButtonText: {
    ...tokens.font.ctaText,
    color: "white",
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
  homeButtonSubordinated: {
    backgroundColor: tokens.color.bgPrimary,
    borderWidth: 1.5,
    borderColor: tokens.color.borderDefault,
    shadowOpacity: 0,
    elevation: 0,
  },
  homeButtonText: {
    ...tokens.font.ctaText,
    marginLeft: 4,
  },
  homeButtonTextSubordinated: {
    color: tokens.color.textPrimary,
  },
  badgeWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: tokens.color.bgMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.toggleInner,
    maxWidth: "60%",
  },
  syncStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.toggleInner,
  },
  syncSuccess: {
    backgroundColor: tokens.color.accentBlueBg,
  },
  syncFallback: {
    backgroundColor: "#fee2e2",
  },
  syncStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  syncSuccessText: {
    color: tokens.color.accentBlue,
  },
  syncFallbackText: {
    color: tokens.color.accentRed,
  },
});
