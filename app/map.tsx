import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import CustomMapView from "../components/CustomMapView";
import { getHistory, AnalysisResult } from "../lib/history";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Map as MapIcon, List, MapPin, FlaskConical, Calendar, FileText, ArrowRight, AlertTriangle, WifiOff, Crosshair } from "lucide-react-native";
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
  const [selectedIonFilter, setSelectedIonFilter] = useState<"All" | "Cu" | "Ca">("All");

  const filteredMarkers = markers.filter((m) => {
    if (selectedIonFilter === "All") return true;
    const mType = m.ionType || "Cu";
    return mType === selectedIonFilter;
  });

  const [locatingSelf, setLocatingSelf] = useState(false);

  const handleCenterToMyLocation = async () => {
    if (locatingSelf) return;
    setLocatingSelf(true);
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const permissionResponse = await Location.requestForegroundPermissionsAsync();
        status = permissionResponse.status;
      }
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
      console.error("Failed to re-center map to current location via header button", e);
    } finally {
      setLocatingSelf(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadDataAndLocation = async () => {
      setLoading(true);

      // 1. Fetch history markers concurrently
      const historyPromise = getHistory().then((history) => {
        if (!active) return;
        const userGeoData = history.filter((h) => h.location);
        setMarkers(userGeoData);
        
        const isSynced = (history as any).synced;
        setSyncStatus(isSynced ? "success" : "fallback");
      }).catch(err => {
        console.error("Failed to load history", err);
      });

      // 2. Fetch current GPS location with a timeout of 3 seconds
      const locationPromise = new Promise<void>(async (resolve) => {
        try {
          let { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') {
            const permissionResponse = await Location.requestForegroundPermissionsAsync();
            status = permissionResponse.status;
          }
          if (status === 'granted') {
            const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 3000));
            const posPromise = Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced
            });

            const loc = await Promise.race([posPromise, timeoutPromise]);
            if (loc && active) {
              setMapRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              });
            }
          }
        } catch (e) {
          console.error("Failed to fetch current location for map centering", e);
        } finally {
          resolve();
        }
      });

      // Wait for both promises to resolve (timeout ensures locationPromise finishes in <= 3s)
      await Promise.all([historyPromise, locationPromise]);
      if (active) {
        setLoading(false);
      }
    };

    loadDataAndLocation();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={tokens.color.accentBlue} />
      </SafeAreaView>
    );
  }

  if (syncStatus === "fallback") {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.color.bgScreen }]} edges={["top", "bottom"]}>
        {/* Header for Back Navigation in Restriction Screen */}
        <View style={[styles.header, { width: "100%", position: "absolute", top: 0 }]}>
          <TouchableOpacity onPress={() => safeGoBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={tokens.color.iconDefault} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contaminant Tracker</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.offlineBlockContainer}>
          <View style={styles.offlineIconRing}>
            <WifiOff size={40} color={tokens.color.accentRed} strokeWidth={2.5} />
          </View>
          
          <Text style={styles.offlineTitle}>Live Data Map Restricted</Text>
          <Text style={styles.offlineDescription}>
            The dynamic contaminant tracking map requires an active network connection to sync with the Supabase Cloud Database.{"\n\n"}
            You are currently offline or remote cloud sync is unavailable. Access has been restricted to prevent data synchronization discrepancies.
          </Text>

          <TouchableOpacity 
            style={styles.offlineBackButton}
            onPress={() => safeGoBack()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={16} color="white" />
            <Text style={styles.offlineBackButtonText}>Go Back to Home</Text>
          </TouchableOpacity>
        </View>
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
        
        {/* Right Header Badges Row */}
        <View style={styles.headerRightRow}>
          {/* Re-center GPS Button */}
          <TouchableOpacity 
            onPress={handleCenterToMyLocation} 
            style={styles.gpsCenterButton}
            disabled={locatingSelf}
            activeOpacity={0.7}
          >
            {locatingSelf ? (
              <ActivityIndicator size="small" color={tokens.color.accentBlue} />
            ) : (
              <Crosshair size={20} color={tokens.color.iconDefault} />
            )}
          </TouchableOpacity>

          {/* Connection Status Badge */}
          <View style={[styles.statusBadge, syncStatus === "success" ? styles.statusBadgeSuccess : styles.statusBadgeFallback]}>
            <View style={[styles.statusDot, syncStatus === "success" ? styles.statusDotSuccess : styles.statusDotFallback]} />
            <Text style={styles.statusBadgeText}>
              {syncStatus === "success" ? "Live" : "Offline"}
            </Text>
          </View>
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

        {/* Dynamic Ion Filtering Buttons */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            onPress={() => setSelectedIonFilter("All")}
            style={[styles.filterChip, selectedIonFilter === "All" && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, selectedIonFilter === "All" && styles.filterChipTextActive]}>
              All Ions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedIonFilter("Cu")}
            style={[styles.filterChip, selectedIonFilter === "Cu" && styles.filterChipActiveCu]}
          >
            <Text style={[styles.filterChipText, selectedIonFilter === "Cu" && styles.filterChipTextActive]}>
              Copper (CuSO₄)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedIonFilter("Ca")}
            style={[styles.filterChip, selectedIonFilter === "Ca" && styles.filterChipActiveCa]}
          >
            <Text style={[styles.filterChipText, selectedIonFilter === "Ca" && styles.filterChipTextActive]}>
              Calcium (CaCl₂)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dual Presentation Views Rendering */}
      {activeTab === "map" ? (
        <CustomMapView
          markers={filteredMarkers}
          initialRegion={mapRegion}
          region={mapRegion}
        />
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filteredMarkers.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertTriangle size={24} color={tokens.color.textPlaceholder} />
              <Text style={styles.emptyText}>No geo-tagged contaminant items detected.</Text>
            </View>
          ) : (
            filteredMarkers.map((marker) => {
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
                        ionType: marker.ionType || "Cu",
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

                      {/* Ion Type Identification Badge */}
                      <View style={[styles.ionBadge, marker.ionType === "Ca" ? styles.ionBadgeCa : styles.ionBadgeCu]}>
                        <Text style={[styles.ionBadgeText, marker.ionType === "Ca" ? styles.ionBadgeTextCa : styles.ionBadgeTextCu]}>
                          {marker.ionType === "Ca" ? "CaCl₂" : "CuSO₄"}
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
  offlineBlockContainer: {
    width: "100%",
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 64,
  },
  offlineIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: tokens.color.accentRedBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  offlineTitle: {
    ...tokens.font.title,
    fontSize: 20,
    color: tokens.color.textPrimary,
    textAlign: "center",
  },
  offlineDescription: {
    ...tokens.font.subtitle,
    fontSize: 14,
    color: tokens.color.textMuted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  offlineBackButton: {
    flexDirection: "row",
    backgroundColor: tokens.color.accentBlue,
    height: tokens.button.ctaHeight,
    paddingHorizontal: 28,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...tokens.shadow.cta,
  },
  offlineBackButtonText: {
    ...tokens.font.ctaText,
    color: "white",
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
  filterBar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: tokens.radius.toggleInner,
    backgroundColor: tokens.color.bgMuted,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: tokens.color.bgPrimary,
    borderColor: tokens.color.borderDefault,
    ...tokens.shadow.toggleActive,
  },
  filterChipActiveCu: {
    backgroundColor: tokens.color.accentBlueBg,
    borderColor: tokens.color.accentBlue,
    ...tokens.shadow.toggleActive,
  },
  filterChipActiveCa: {
    backgroundColor: "#ffedd5",
    borderColor: "#ea580c",
    ...tokens.shadow.toggleActive,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: tokens.color.textPlaceholder,
  },
  filterChipTextActive: {
    color: tokens.color.textPrimary,
    fontWeight: "700",
  },
  ionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
    alignSelf: "center",
  },
  ionBadgeCu: {
    backgroundColor: tokens.color.accentBlueBg,
  },
  ionBadgeCa: {
    backgroundColor: "#ffedd5",
  },
  ionBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  ionBadgeTextCu: {
    color: tokens.color.accentBlue,
  },
  ionBadgeTextCa: {
    color: "#ea580c",
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
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  gpsCenterButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
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
