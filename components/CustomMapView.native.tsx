import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
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

export default function CustomMapView({ markers, initialRegion }: CustomMapViewProps) {
  return (
    <MapView style={styles.map} initialRegion={initialRegion}>
      {markers.map((marker) => {
        if (!marker.location) return null;
        return (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.location.latitude,
              longitude: marker.location.longitude,
            }}
            title={`Detected: ${marker.concentration.toFixed(1)} ppm`}
            description={`Area: ${marker.area.toFixed(2)} mm², Date: ${new Date(
              marker.date
            ).toLocaleDateString()}`}
            pinColor={tokens.color.accentRed}
          />
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
