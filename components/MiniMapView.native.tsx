import * as React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { tokens } from "../lib/design-tokens";

interface MiniMapViewProps {
  latitude: number;
  longitude: number;
  isDetected: boolean;
  ionType?: "Cu" | "Ca";
}

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const isTablet = Math.min(windowWidth, windowHeight) >= 600;
const markerSize = isTablet ? 30 : 22;
const markerInnerSize = isTablet ? 12 : 8;

export default function MiniMapView({ latitude, longitude, isDetected, ionType = "Cu" }: MiniMapViewProps) {
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
        >
          <View style={[
            styles.customMarker, 
            { 
              backgroundColor: isDetected 
                ? (ionType === "Ca" ? "#ea580c" : tokens.color.accentRed) 
                : (ionType === "Ca" ? "#fbbf24" : tokens.color.accentBlue) 
            }
          ]} >
            <View style={styles.customMarkerInner} />
          </View>
        </Marker>
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
});
