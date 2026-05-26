import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import CustomMapView from "../components/CustomMapView";
import { getHistory, AnalysisResult } from "../lib/history";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Map as MapIcon, List, MapPin, FlaskConical, Calendar, FileText, ArrowRight, AlertTriangle } from "lucide-react-native";
import { safeGoBack } from "../lib/navigation";
import { tokens } from "../lib/design-tokens";
import { useRouter } from "expo-router";
import * as Location from "expo-location";



export default function MapScreen() {
  const router = useRouter();
  const [markers, setMarkers] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [syncStatus, setSyncStatus] = useState<"success" | "fallback">("fallback");
  const [mapRegion, setMapRegion] = useState({
    latitude: 35.8885,
    longitude: 128.6105,
    latitudeDelta: 0.018,
    longitudeDelta: 0.018,
  });

  useEffect(() => {
    // 1. Fetch history markers
    getHistory().then((history) => {
      // Filter custom user history for entries with valid geo location
      const userGeoData = history.filter((h) => h.location);
      setMarkers(userGeoData);
      
      const isSynced = (history as any).synced;
      setSyncStatus(isSynced ? "success" : "fallback");
      setLoading(false);
    });

    // 2. Fetch current GPS location to center the map
    const fetchCurrentLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          setMapRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
        }
      } catch (e) {
        console.error("Failed to fetch current location for map centering", e);
      }
    };
    fetchCurrentLocation();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={tokens.color.accentBlue} />
      </SafeAreaView>
    );
  }

  // Focus initially on KNU Campus Stream center as fallback
  const defaultRegion = {
    latitude: 35.8885,
    longitude: 128.6105,
    latitudeDelta: 0.018,
    longitudeDelta: 0.018,
  };

  // Helper to determine warning levels for display styling
  const getSeverityStyles = (ppm: number) => {
    if (ppm === 0) {
      return {
        badgeBg: tokens.color.accentBlueBg,
        badgeText: tokens.color.accentBlue,
        border: tokens.color.borderDefault,
        title: "SAFE",
      };
    }
    if (ppm < 15) {
      return {
        badgeBg: "#ffedd5",
        badgeText: "#ea580c",
        border: "#fed7aa",
        title: "WARNING",
      };
    }
    return {
      badgeBg: tokens.color.accentRedBg,
      badgeText: tokens.color.accentRed,
      border: "#fecaca",
      title: "DANGER",
    };
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Primary Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={tokens.color.iconDefault} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contaminant Tracker</Text>
        
        {/* Connection Status Badge */}
        <View style={[styles.statusBadge, syncStatus === "success" ? styles.statusBadgeSuccess : styles.statusBadgeFallback]}>
          <View style={[styles.statusDot, syncStatus === "success" ? styles.statusDotSuccess : styles.statusDotFallback]} />
          <Text style={styles.statusBadgeText}>
            {syncStatus === "success" ? "Live" : "Offline"}
          </Text>
        </View>
      </View>

      {/* Segmented Controller (Map vs List Toggle) */}
      <View style={styles.tabContainer}>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "map" && styles.tabButtonActive]}
            onPress={() => setActiveTab("map")}
          >
            <MapIcon size={16} color={activeTab === "map" ? tokens.color.accentBlue : tokens.color.textPlaceholder} />
            <Text style={[styles.tabButtonText, activeTab === "map" && styles.tabButtonTextActive]}>
              Map View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "list" && styles.tabButtonActive]}
            onPress={() => setActiveTab("list")}
          >
            <List size={16} color={activeTab === "list" ? tokens.color.accentBlue : tokens.color.textPlaceholder} />
            <Text style={[styles.tabButtonText, activeTab === "list" && styles.tabButtonTextActive]}>
              List View
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dual Presentation Views Rendering */}
      {activeTab === "map" ? (
        <CustomMapView
          key={`${mapRegion.latitude}_${mapRegion.longitude}`}
          markers={markers}
          initialRegion={mapRegion}
        />
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {markers.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertTriangle size={24} color={tokens.color.textPlaceholder} />
              <Text style={styles.emptyText}>No geo-tagged contaminant items detected.</Text>
            </View>
          ) : (
            markers.map((marker) => {
              const severity = getSeverityStyles(marker.concentration);
              return (
                <TouchableOpacity
                  key={marker.id}
                  style={[styles.markerCard, { borderLeftColor: severity.badgeText }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    router.push({
                      pathname: "/result",
                      params: {
                        area: marker.area.toFixed(2),
                        concentration: marker.concentration.toFixed(1),
                        locationName: marker.locationName || "",
                        sampleName: marker.sampleName || "Sample A",
                        notes: marker.notes || "",
                        latitude: marker.location?.latitude?.toString() || "",
                        longitude: marker.location?.longitude?.toString() || "",
                      },
                    });
                  }}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.concentrationBadge, { backgroundColor: severity.badgeBg }]}>
                        <Text style={[styles.concentrationText, { color: severity.badgeText }]}>
                          {marker.concentration.toFixed(1)} ppm ({severity.title})
                        </Text>
                      </View>
                    </View>
                    <View style={styles.dateRow}>
                      <Calendar size={12} color={tokens.color.textMuted} />
                      <Text style={styles.dateText}>
                        {new Date(marker.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {/* Core details */}
                  <View style={styles.locationTitleRow}>
                    <MapPin size={14} color={severity.badgeText} />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {marker.locationName || "Unknown Location"}
                    </Text>
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.detailItem}>
                      <View style={styles.detailLabelRow}>
                        <FlaskConical size={10} color={tokens.color.textPlaceholder} />
                        <Text style={styles.detailLabel}>Sample Identity</Text>
                      </View>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {marker.sampleName || "Sample A"}
                      </Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <View style={styles.detailLabelRow}>
                        <Text style={styles.detailLabel}>Area</Text>
                      </View>
                      <Text style={styles.detailValue}>{marker.area.toFixed(2)} mm²</Text>
                    </View>
                  </View>

                  {/* Notes snippet */}
                  {marker.notes ? (
                    <View style={styles.noteSnippet}>
                      <FileText size={10} color={tokens.color.textPlaceholder} />
                      <Text style={styles.noteSnippetText} numberOfLines={1}>
                        {marker.notes}
                      </Text>
                    </View>
                  ) : null}

                  {/* Bottom Navigation Prompt */}
                  <View style={styles.actionPromptRow}>
                    <Text style={styles.actionPromptText}>Inspect detailed telemetry</Text>
                    <ArrowRight size={12} color={tokens.color.accentBlue} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.bgScreen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.borderDefault,
    backgroundColor: tokens.color.bgPrimary,
    zIndex: 10,
  },
  backButton: {
    ...tokens.component.backButton,
  },
  headerTitle: {
    ...tokens.font.title,
    fontSize: 18,
  },
  
  // Segmented Tab switcher styles
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: tokens.color.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.borderDefault,
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: tokens.color.bgMuted,
    borderRadius: tokens.radius.toggleContainer,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderRadius: tokens.radius.toggleInner,
  },
  tabButtonActive: {
    backgroundColor: tokens.color.bgPrimary,
    ...tokens.shadow.toggleActive,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: tokens.color.textPlaceholder,
  },
  tabButtonTextActive: {
    color: tokens.color.accentBlue,
  },

  // Scroll listings styles
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    gap: 8,
  },
  emptyText: {
    color: tokens.color.textPlaceholder,
    fontSize: 13,
  },
  markerCard: {
    backgroundColor: tokens.color.bgPrimary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: tokens.color.borderDefault,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.borderDefault,
    paddingBottom: 8,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
  },
  concentrationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  concentrationText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: tokens.color.textMuted,
  },
  locationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "700",
    color: tokens.color.textPrimary,
  },
  cardDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: tokens.color.bgMuted,
    padding: 10,
    borderRadius: tokens.radius.toggleInner,
  },
  detailItem: {
    flex: 1,
  },
  detailLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: tokens.color.textPlaceholder,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "700",
    color: tokens.color.textSecondary,
  },
  noteSnippet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  noteSnippetText: {
    flex: 1,
    fontSize: 11,
    color: tokens.color.textMuted,
    fontStyle: "italic",
  },
  actionPromptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderDefault,
    paddingTop: 8,
  },
  actionPromptText: {
    fontSize: 11,
    fontWeight: "700",
    color: tokens.color.accentBlue,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeSuccess: {
    backgroundColor: tokens.color.accentBlueBg,
    borderColor: tokens.color.accentBlue,
  },
  statusBadgeFallback: {
    backgroundColor: "#fee2e2",
    borderColor: tokens.color.accentRed,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotSuccess: {
    backgroundColor: tokens.color.accentBlue,
  },
  statusDotFallback: {
    backgroundColor: tokens.color.accentRed,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: tokens.color.textPrimary,
  },
});
