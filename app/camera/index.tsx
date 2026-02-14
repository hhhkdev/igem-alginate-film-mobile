import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import {
  ArrowLeft,
  Zap,
  ZapOff,
  Camera as CameraIcon,
  Image as GalleryIcon,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { cn } from "../../lib/utils";
import { setAnalysisImage } from "../../lib/temp-storage";
import { safeGoBack } from "../../lib/navigation";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const { method, filmDiameter, refDimension } = useLocalSearchParams();
  const cameraRef = useRef<CameraView>(null);
  const isFocused = useIsFocused();
  const SCREEN_WIDTH = Dimensions.get("window").width;
  const SCREEN_HEIGHT = Dimensions.get("window").height;
  const cameraTop = (SCREEN_HEIGHT - SCREEN_WIDTH) / 2;

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "권한 필요",
        "사진을 선택하려면 갤러리 접근 권한이 필요합니다.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // We handle cropping in analysis
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setAnalysisImage(uri);

      router.push({
        pathname: "/analysis",
        params: {
          method: method as string,
          filmDiameter: filmDiameter as string,
          refDimension: refDimension as string,
        },
      });
    }
  };

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center p-6">
        <View className="bg-white dark:bg-slate-900 p-8 rounded-3xl items-center w-full max-w-sm gap-y-6">
          <View className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full">
            <CameraIcon
              size={40}
              className="text-blue-600 dark:text-blue-400"
              color="#2563eb"
            />
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">
              카메라 접근 권한
            </Text>
            <Text className="text-center text-slate-500 dark:text-slate-400 leading-6">
              알지네이트 필름 분석을 위해 사진 촬영 권한이 필요합니다.
            </Text>
          </View>

          <TouchableOpacity
            className="w-full bg-blue-600 py-4 rounded-2xl active:bg-blue-700 items-center justify-center shadow shadow-blue-500/30"
            onPress={requestPermission}
          >
            <Text className="text-white font-bold text-lg">카메라 허용</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => safeGoBack()}>
            <Text className="text-slate-400 font-medium">나중에 하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          // Store image in temp storage to avoid URL length limits
          setAnalysisImage(photo.uri);

          router.push({
            pathname: "/analysis",
            params: {
              // imageUri is now passed via temp storage
              method: method as string,
              filmDiameter: filmDiameter as string,
              refDimension: refDimension as string,
            },
          });
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "사진 촬영에 실패했습니다.");
      }
    }
  };

  return (
    <View className="flex-1 bg-black">
      {isFocused && (
        <CameraView
          style={{
            position: "absolute",
            width: SCREEN_WIDTH,
            height: SCREEN_WIDTH,
            top: cameraTop,
            left: 0,
          }}
          facing="back"
          enableTorch={flash}
          ref={cameraRef}
        />
      )}
      <SafeAreaView
        className="flex-1 justify-between p-6"
        edges={["top", "bottom"]}
        pointerEvents="box-none"
      >
        {/* Top Bar */}
        <View className="flex-row justify-between items-center bg-black/40 p-4 mx-4 mt-2 rounded-2xl backdrop-blur-md border border-white/10">
          <TouchableOpacity
            onPress={() => safeGoBack()}
            className="p-3 rounded-full bg-white/10 active:bg-white/20"
          >
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFlash(!flash)}
            className="p-3 rounded-full bg-white/10 active:bg-white/20"
          >
            {flash ? (
              <Zap color="#fbbf24" size={24} />
            ) : (
              <ZapOff color="white" size={24} />
            )}
          </TouchableOpacity>
        </View>

        {/* Guide Overlay - Simple circle to guide user */}
        <View
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 justify-center items-center"
          pointerEvents="none"
        >
          <View className="w-64 h-64 border-2 border-white/50 rounded-full border-dashed" />
          <Text className="text-white/80 mt-4 text-sm font-medium bg-black/40 px-3 py-1 rounded-full overflow-hidden">
            필름을 중앙에 맞춰주세요
          </Text>
        </View>

        {/* Bottom Bar / Capture Button */}
        <View className="flex-row justify-between items-center pb-8 px-4">
          {/* Gallery Button - Left */}
          <TouchableOpacity
            onPress={pickImage}
            className="p-4 rounded-full bg-white/10 active:bg-white/20"
          >
            <GalleryIcon color="white" size={24} />
          </TouchableOpacity>

          {/* Capture Button - Center */}
          <TouchableOpacity
            onPress={takePicture}
            className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 items-center justify-center shadow active:scale-95 transition-transform"
          >
            <View className="w-16 h-16 bg-white rounded-full border-2 border-black/10" />
          </TouchableOpacity>

          {/* Empty Spacer - Right (for balance) */}
          <View className="w-14" />
        </View>
      </SafeAreaView>
    </View>
  );
}
