import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
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

export default function CustomMapView({ markers, initialRegion }: CustomMapViewProps) {
  const router = useRouter();
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

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

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        initialRegion={initialRegion}
        onPress={() => setSelectedMarker(null)} // Dismiss bottom card when tapping map background
      >
        {markers.map((marker) => {
          if (!marker.location) return null;
          
          return (
            <Marker
              key={marker.id}
              coordinate={{
                latitude: marker.location.latitude,
                longitude: marker.location.longitude,
              }}
              pinColor={getMarkerColor(marker.concentration)}
              onPress={() => handleMarkerPress(marker)}
            />
          );
        })}
      </MapView>

      {/* Floating Bottom sheet details card */}
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
});
