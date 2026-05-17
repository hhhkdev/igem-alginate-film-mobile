import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Map, AlertTriangle, Calendar } from "lucide-react-native";
import { tokens } from "../lib/design-tokens";

interface Location {
  latitude: number;
  longitude: number;
}

interface MarkerData {
  id: string;
  location?: Location;
  concentration: number;
  area: number;
  date: string;
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

export default function CustomMapView({ markers }: CustomMapViewProps) {
  return (
    <View style={styles.container}>
      {/* Visual map placeholder with premium glassmorphism card */}
      <View style={styles.visualContainer}>
        <View style={styles.glassCard}>
          <Map size={48} color={tokens.color.accentBlue} style={styles.icon} />
          <Text style={styles.title}>Web Map Preview</Text>
          <Text style={styles.subtitle}>
            Native Google & Apple Maps tracking is optimized for iOS & Android devices.
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Web Preview Mode</Text>
          </View>
        </View>
      </View>

      {/* Detections List for Web */}
      <View style={styles.listContainer}>
        <Text style={styles.listHeader}>Active GPS Detections ({markers.length})</Text>
        {markers.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertTriangle size={24} color={tokens.color.textPlaceholder} />
            <Text style={styles.emptyText}>No geo-tagged contaminants detected yet.</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
            {markers.map((marker) => (
              <View key={marker.id} style={styles.markerCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.concentrationBadge}>
                    <Text style={styles.concentrationText}>
                      {marker.concentration.toFixed(1)} ppm
                    </Text>
                  </View>
                  <View style={styles.dateRow}>
                    <Calendar size={14} color={tokens.color.textMuted} />
                    <Text style={styles.dateText}>
                      {new Date(marker.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Latitude</Text>
                    <Text style={styles.detailValue}>{marker.location?.latitude.toFixed(6)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Longitude</Text>
                    <Text style={styles.detailValue}>{marker.location?.longitude.toFixed(6)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Area</Text>
                    <Text style={styles.detailValue}>{marker.area.toFixed(2)} mm²</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.bgScreen,
  },
  visualContainer: {
    height: 220,
    backgroundColor: "#1e293b", // Deep slate
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.borderDefault,
    padding: 20,
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  icon: {
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: tokens.color.accentBlue,
  },
  badgeText: {
    color: tokens.color.accentBlue,
    fontSize: 11,
    fontWeight: "600",
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  listHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: tokens.color.textPrimary,
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: tokens.color.textPlaceholder,
    fontSize: 13,
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 20,
  },
  markerCard: {
    backgroundColor: tokens.color.bgPrimary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: tokens.color.borderDefault,
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
    paddingBottom: 10,
    marginBottom: 10,
  },
  concentrationBadge: {
    backgroundColor: tokens.color.accentRedDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  concentrationText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: tokens.color.textMuted,
  },
  cardDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: tokens.color.textPlaceholder,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.color.textSecondary,
  },
});
