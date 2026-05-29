import * as React from "react";
import { useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { tokens } from "../lib/design-tokens";
import { Locate } from "lucide-react-native";
import * as Location from "expo-location";

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (coords: { latitude: number; longitude: number }) => void;
}

const MapMarker = Marker as any;

export default function LocationPickerMap({ latitude, longitude, onLocationSelect }: LocationPickerMapProps) {
  const mapRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const deltaRef = useRef({ latitudeDelta: 0.005, longitudeDelta: 0.005 });

  const handleLocateMe = async () => {
    if (locating) return;
    setLocating(true);
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
        
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };

        // Move map camera to current location while preserving current zoom levels
        mapRef.current?.animateToRegion({
          ...coords,
          ...deltaRef.current,
        }, 1000);

        // Sync local coords with selection state
        onLocationSelect(coords);
      }
    } catch (e) {
      console.error("LocationPickerMap failed to locate current position", e);
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        {...({ ref: mapRef } as any)}
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        onRegionChangeComplete={(region) => {
          deltaRef.current = {
            latitudeDelta: region.latitudeDelta,
            longitudeDelta: region.longitudeDelta,
          };
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
        <MapMarker
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

      {/* Locate Me Floating button in Picker Map */}
      <TouchableOpacity
        style={styles.locateButton}
        onPress={handleLocateMe}
        activeOpacity={0.8}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator size="small" color={tokens.color.accentBlue} />
        ) : (
          <Locate size={18} color={tokens.color.accentBlue} />
        )}
      </TouchableOpacity>
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
    position: "relative",
  },
  map: {
    flex: 1,
  },
  locateButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: tokens.color.bgPrimary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: tokens.color.borderDefault,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 999,
  },
});
