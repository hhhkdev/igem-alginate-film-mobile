import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import CustomMapView from "../components/CustomMapView";
import { getHistory, AnalysisResult } from "../lib/history";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { safeGoBack } from "../lib/navigation";
import { tokens } from "../lib/design-tokens";

export default function MapScreen() {
  const [markers, setMarkers] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory().then((history) => {
      // Filter for normal mode and valid location
      const mapData = history.filter(
        (h) => h.mode === "normal" && h.location && h.concentration > 1
      );
      setMarkers(mapData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={tokens.color.accentBlue} />
      </SafeAreaView>
    );
  }

  const initialRegion = markers.length > 0 ? {
    latitude: markers[0].location!.latitude,
    longitude: markers[0].location!.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  } : {
    latitude: 37.5665, // Seoul
    longitude: 126.9780,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={tokens.color.iconDefault} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detection Map</Text>
        <View style={{ width: 40 }} />
      </View>
      <CustomMapView
        markers={markers}
        initialRegion={initialRegion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.bgScreen,
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
  map: {
    flex: 1,
  },
});
