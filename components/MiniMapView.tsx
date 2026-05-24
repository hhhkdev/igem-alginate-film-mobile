import React from "react";
import { View, StyleSheet } from "react-native";
import { tokens } from "../lib/design-tokens";

interface MiniMapViewProps {
  latitude: number;
  longitude: number;
  isDetected: boolean;
}

export default function MiniMapView({ latitude, longitude }: MiniMapViewProps) {
  // Embed standard Google Map focused on precise coordinate - Zero API Keys required!
  const mapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;

  return (
    <View style={styles.webMiniMapContainer}>
      <iframe
        src={mapUrl}
        style={styles.iframe}
        title="Contaminant Mini Map"
        frameBorder="0"
        allowFullScreen
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webMiniMapContainer: {
    height: 160,
    width: "100%",
    borderRadius: tokens.radius.toggleInner,
    overflow: "hidden",
    marginTop: 12,
    borderWidth: 1,
    borderColor: tokens.color.borderDefault,
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: 0,
  },
});
