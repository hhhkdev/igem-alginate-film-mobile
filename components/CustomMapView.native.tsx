import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import { tokens } from "../lib/design-tokens";
import { MapPin, FlaskConical, Calendar, ArrowRight, X } from "lucide-react-native";

interface LocationData {
  latitude: number;
  longitude: number;
}

interface MarkerData {
  id: string;
  location?: LocationData;
  concentration: number;
  area: number;
  date: string;
  locationName?: string;
  sampleName?: string;
  notes?: string;
}

interface CustomMapViewProps {
  markers: MarkerData[];
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

interface Cluster {
  id: string;
  isCluster: boolean;
  markers: MarkerData[];
  latitude: number;
  longitude: number;
  highestConcentration: number;
}

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const isTablet = Math.min(windowWidth, windowHeight) >= 600;
const markerSize = isTablet ? 30 : 22;
const markerInnerSize = isTablet ? 12 : 8;
const clusterSize = isTablet ? 44 : 32;

export default function CustomMapView({ markers, initialRegion }: CustomMapViewProps) {
  const router = useRouter();
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [currentRegion, setCurrentRegion] = useState({
    latitude: initialRegion.latitude,
    longitude: initialRegion.longitude,
    latitudeDelta: initialRegion.latitudeDelta,
    longitudeDelta: initialRegion.longitudeDelta,
  });

  // Helper to determine marker color based on CuSO4 toxicity
  const getMarkerColor = (ppm: number) => {
    if (ppm === 0) return "#3b82f6"; // Safe - Blue
    if (ppm < 15) return "#f97316"; // Warning - Orange
    return "#ef4444"; // Danger - Red
  };

  // Helper to determine warning levels for display styling
  const getSeverityStyles = (ppm: number) => {
    if (ppm === 0) {
      return {
        badgeBg: tokens.color.accentBlueBg,
        badgeText: tokens.color.accentBlue,
        title: "SAFE",
      };
    }
    if (ppm < 15) {
      return {
        badgeBg: "#ffedd5",
        badgeText: "#ea580c",
        title: "WARNING",
      };
    }
    return {
      badgeBg: tokens.color.accentRedBg,
      badgeText: tokens.color.accentRed,
      title: "DANGER",
    };
  };

  const handleMarkerPress = (marker: MarkerData) => {
    setSelectedMarker(marker);
  };

  const handleCardPress = () => {
    if (!selectedMarker) return;
    router.push({
      pathname: "/result",
      params: {
        area: selectedMarker.area.toFixed(2),
        concentration: selectedMarker.concentration.toFixed(1),
        locationName: selectedMarker.locationName || "",
        sampleName: selectedMarker.sampleName || "Sample A",
        notes: selectedMarker.notes || "",
        latitude: selectedMarker.location?.latitude?.toString() || "",
        longitude: selectedMarker.location?.longitude?.toString() || "",
      },
    });
  };

  // Proximity clustering algorithm (dynamically scales maxDistance depending on zoom level/latitudeDelta)
  const clusters: Cluster[] = [];
  const baseDelta = 0.015;
  const baseDistance = 0.0012; // Tighter base grouping threshold (around 100 meters at default zoom)
  const zoomFactor = currentRegion.latitudeDelta / baseDelta;
  const maxDistance = Math.max(0.0003, Math.min(0.015, baseDistance * zoomFactor)); // Tighter bounds to prevent premature/massive merging

  markers.forEach((marker) => {
    if (!marker.location) return;

    let added = false;
    for (const cluster of clusters) {
      const latDiff = Math.abs(cluster.latitude - marker.location.latitude);
      const lngDiff = Math.abs(cluster.longitude - marker.location.longitude);
      if (latDiff < maxDistance && lngDiff < maxDistance) {
        cluster.markers.push(marker);
        // Recalculate average center coordinates of the cluster
        cluster.latitude = cluster.markers.reduce((sum, m) => sum + (m.location?.latitude || 0), 0) / cluster.markers.length;
        cluster.longitude = cluster.markers.reduce((sum, m) => sum + (m.location?.longitude || 0), 0) / cluster.markers.length;
        cluster.highestConcentration = Math.max(cluster.highestConcentration, marker.concentration);
        cluster.isCluster = true;
        added = true;
        break;
      }
    }

    if (!added) {
      clusters.push({
        id: `cluster-${marker.id}`,
        isCluster: false,
        markers: [marker],
        latitude: marker.location.latitude,
        longitude: marker.location.longitude,
        highestConcentration: marker.concentration,
      });
    }
  });

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        initialRegion={initialRegion}
        onRegionChangeComplete={(region) => {
          setCurrentRegion(region);
        }}
        onPress={() => {
          setSelectedMarker(null);
          setSelectedCluster(null);
        }} // Dismiss bottom card and cluster list when tapping map background
      >
        {clusters.map((cluster) => {
          if (cluster.markers.length === 1) {
            const marker = cluster.markers[0];
            return (
              <Marker
                key={cluster.id}
                coordinate={{
                  latitude: cluster.latitude,
                  longitude: cluster.longitude,
                }}
                onPress={() => {
                  setSelectedMarker(marker);
                  setSelectedCluster(null);
                }}
              >
                <View style={[styles.customMarker, { backgroundColor: getMarkerColor(marker.concentration) }]}>
                  <View style={styles.customMarkerInner} />
                </View>
              </Marker>
            );
          } else {
            return (
              <Marker
                key={cluster.id}
                coordinate={{
                  latitude: cluster.latitude,
                  longitude: cluster.longitude,
                }}
                onPress={() => {
                  setSelectedCluster(cluster);
                  setSelectedMarker(null);
                }}
              >
                <View style={[styles.clusterMarker, { backgroundColor: getMarkerColor(cluster.highestConcentration) }]}>
                  <Text style={styles.clusterMarkerText}>{cluster.markers.length}</Text>
                </View>
              </Marker>
            );
          }
        })}
      </MapView>

      {/* Floating Bottom sheet details card (for single marker) */}
      {selectedMarker && (
        <View style={styles.cardContainer}>
          <TouchableOpacity 
            style={[styles.markerCard, { borderLeftColor: getMarkerColor(selectedMarker.concentration) }]}
            activeOpacity={0.9}
            onPress={handleCardPress}
          >
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedMarker(null)}
            >
              <X size={16} color={tokens.color.textPlaceholder} />
            </TouchableOpacity>

            <View style={styles.cardHeader}>
              <View style={styles.badgeRow}>
                <View style={[styles.concentrationBadge, { backgroundColor: getSeverityStyles(selectedMarker.concentration).badgeBg }]}>
                  <Text style={[styles.concentrationText, { color: getSeverityStyles(selectedMarker.concentration).badgeText }]}>
                    {selectedMarker.concentration.toFixed(1)} ppm ({getSeverityStyles(selectedMarker.concentration).title})
                  </Text>
                </View>
              </View>
              <View style={styles.dateRow}>
                <Calendar size={10} color={tokens.color.textMuted} />
                <Text style={styles.dateText}>
                  {new Date(selectedMarker.date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Core details */}
            <View style={styles.locationTitleRow}>
              <MapPin size={14} color={getMarkerColor(selectedMarker.concentration)} />
              <Text style={styles.locationText} numberOfLines={1}>
                {selectedMarker.locationName || "Unknown Location"}
              </Text>
            </View>

            <View style={styles.cardDetails}>
              <View style={styles.detailItem}>
                <View style={styles.detailLabelRow}>
                  <FlaskConical size={10} color={tokens.color.textPlaceholder} />
                  <Text style={styles.detailLabel}>Sample Identity</Text>
                </View>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {selectedMarker.sampleName || "Sample A"}
                </Text>
              </View>
              
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Area</Text>
                <Text style={styles.detailValue}>{selectedMarker.area.toFixed(2)} mm²</Text>
              </View>
            </View>

            {/* Bottom Navigation Prompt */}
            <View style={styles.actionPromptRow}>
              <Text style={styles.actionPromptText}>Inspect detailed telemetry</Text>
              <ArrowRight size={12} color={tokens.color.accentBlue} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Bottom sheet cluster list card */}
      {selectedCluster && (
        <View style={styles.cardContainer}>
          <View style={styles.clusterCard}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedCluster(null)}
            >
              <X size={16} color={tokens.color.textPlaceholder} />
            </TouchableOpacity>

            <Text style={styles.clusterCardTitle}>
              {selectedCluster.markers.length} Samples in this Area
            </Text>
            
            <ScrollView 
              style={styles.clusterList} 
              maxHeight={200}
              showsVerticalScrollIndicator={true}
            >
              {selectedCluster.markers.map((marker) => {
                const severity = getSeverityStyles(marker.concentration);
                return (
                  <TouchableOpacity
                    key={marker.id}
                    style={styles.clusterItem}
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
                    <View style={styles.clusterItemLeft}>
                      <View style={[styles.miniStatusDot, { backgroundColor: getMarkerColor(marker.concentration) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.clusterItemName} numberOfLines={1}>
                          {marker.sampleName || "Sample"}
                        </Text>
                        <Text style={styles.clusterItemDate}>
                          {new Date(marker.date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.clusterItemRight}>
                      <View style={[styles.concentrationBadge, { backgroundColor: severity.badgeBg, paddingHorizontal: 6, paddingVertical: 2 }]}>
                        <Text style={[styles.concentrationText, { color: severity.badgeText, fontSize: 10 }]}>
                          {marker.concentration.toFixed(1)} ppm
                        </Text>
                      </View>
                      <ArrowRight size={14} color={tokens.color.textPlaceholder} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  cardContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  markerCard: {
    backgroundColor: tokens.color.bgPrimary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: tokens.color.borderDefault,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1000,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.borderDefault,
    paddingBottom: 8,
    marginBottom: 8,
    paddingRight: 24, // Keep away from close button
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
    marginBottom: 8,
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
  actionPromptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.color.borderDefault,
    paddingTop: 8,
  },
  actionPromptText: {
    fontSize: 11,
    fontWeight: "700",
    color: tokens.color.accentBlue,
  },
  customMarker: {
    width: markerSize,
    height: markerSize,
    borderRadius: markerSize / 2,
    borderWidth: isTablet ? 3 : 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  customMarkerInner: {
    width: markerInnerSize,
    height: markerInnerSize,
    borderRadius: markerInnerSize / 2,
    backgroundColor: "#ffffff",
  },
  clusterMarker: {
    width: clusterSize,
    height: clusterSize,
    borderRadius: clusterSize / 2,
    borderWidth: isTablet ? 3 : 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  clusterMarkerText: {
    color: "#ffffff",
    fontSize: isTablet ? 15 : 12,
    fontWeight: "800",
  },
  clusterCard: {
    backgroundColor: tokens.color.bgPrimary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: tokens.color.borderDefault,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  clusterCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: tokens.color.textPrimary,
    marginBottom: 12,
    paddingRight: 24,
  },
  clusterList: {
    width: "100%",
  },
  clusterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.borderLight,
  },
  clusterItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  miniStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clusterItemName: {
    fontSize: 13,
    fontWeight: "600",
    color: tokens.color.textPrimary,
  },
  clusterItemDate: {
    fontSize: 10,
    color: tokens.color.textMuted,
    marginTop: 1,
  },
  clusterItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
