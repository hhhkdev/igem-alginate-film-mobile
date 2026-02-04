import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Zap, ZapOff } from "lucide-react-native";
import { cn } from "../../lib/utils"; // Make sure this path is correct based on your previous step

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center p-6">
        <Text className="text-center text-lg mb-4 text-foreground">
          We need your permission to show the camera
        </Text>
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-xl"
          onPress={requestPermission}
        >
          <Text className="text-primary-foreground font-semibold">
            Grant Permission
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          // Encode URI to safely pass it; simple URI passing usually works but let's be safe if we add params later
          router.push({
            pathname: "/analysis",
            params: { imageUri: photo.uri },
          });
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to take picture");
      }
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flash}
        ref={cameraRef}
      >
        <SafeAreaView className="flex-1 justify-between p-6">
          {/* Top Bar */}
          <View className="flex-row justify-between items-center bg-black/30 p-2 rounded-full backdrop-blur-md">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 rounded-full bg-black/50"
            >
              <ArrowLeft color="white" size={24} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFlash(!flash)}
              className="p-2 rounded-full bg-black/50"
            >
              {flash ? (
                <Zap color="#fbbf24" size={24} />
              ) : (
                <ZapOff color="white" size={24} />
              )}
            </TouchableOpacity>
          </View>

          {/* Guide Overlay - Simple circle to guide user */}
          <View className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 justify-center items-center pointer-events-none">
            <View className="w-64 h-64 border-2 border-white/50 rounded-full border-dashed" />
            <Text className="text-white/80 mt-4 text-sm font-medium bg-black/40 px-3 py-1 rounded-full overflow-hidden">
              Center the film here
            </Text>
          </View>

          {/* Bottom Bar / Capture Button */}
          <View className="flex-row justify-center items-center pb-8">
            <TouchableOpacity
              onPress={takePicture}
              className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <View className="w-16 h-16 bg-white rounded-full border-2 border-black/10" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
