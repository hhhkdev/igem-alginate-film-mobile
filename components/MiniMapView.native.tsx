import React from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { tokens } from "../lib/design-tokens";

interface MiniMapViewProps {
  latitude: number;
  longitude: number;
  isDetected: boolean;
}

export default function MiniMapView({ latitude, longitude, isDetected }: MiniMapViewProps) {
  return (
    <View style={styles.miniMapContainer}>
      <MapView
        style={styles.miniMap}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          pinColor={isDetected ? tokens.color.accentRed : tokens.color.accentBlue}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  miniMapContainer: {
    height: 160,
    width: "100%",
    borderRadius: tokens.radius.toggleInner,
    overflow: "hidden",
    marginTop: 12,
    borderWidth: 1,
    borderColor: tokens.color.borderDefault,
  },
  miniMap: {
    flex: 1,
  },
});
