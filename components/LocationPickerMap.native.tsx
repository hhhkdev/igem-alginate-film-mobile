import React from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { tokens } from "../lib/design-tokens";

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (coords: { latitude: number; longitude: number }) => void;
}

export default function LocationPickerMap({ latitude, longitude, onLocationSelect }: LocationPickerMapProps) {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        onPress={(e) => {
          const coords = e.nativeEvent.coordinate;
          if (coords) {
            onLocationSelect({
              latitude: coords.latitude,
              longitude: coords.longitude,
            });
          }
        }}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          draggable
          onDragEnd={(e) => {
            const coords = e.nativeEvent.coordinate;
            if (coords) {
              onLocationSelect({
                latitude: coords.latitude,
                longitude: coords.longitude,
              });
            }
          }}
          pinColor={tokens.color.accentRed}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    width: "100%",
    borderRadius: tokens.radius.toggleInner,
    overflow: "hidden",
    marginTop: 4,
    borderWidth: 1,
    borderColor: tokens.color.borderDefault,
  },
  map: {
    flex: 1,
  },
});
