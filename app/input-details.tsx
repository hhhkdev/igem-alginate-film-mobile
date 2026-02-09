import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Ruler } from "lucide-react-native";

export default function InputDetailsScreen() {
  const [diameter, setDiameter] = useState("");

  const handleNext = () => {
    const d = parseFloat(diameter);
    if (!diameter || isNaN(d) || d <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid diameter in mm.");
      return;
    }
    router.push({
      pathname: "/camera",
      params: { diameter },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
          disabled={Platform.OS === "web"}
        >
          <View className="flex-1 p-6 justify-between">
            <View>
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-full items-center justify-center mb-8"
              >
                <ArrowLeft
                  size={24}
                  className="text-slate-900 dark:text-white"
                  color="#334155"
                />
              </TouchableOpacity>

              <View className="flex-row items-center gap-x-3 mb-4">
                <View className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                  <Ruler
                    size={28}
                    className="text-blue-600 dark:text-blue-400"
                    color="#2563eb"
                  />
                </View>
              </View>

              <Text className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
                Setup Measurement
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-lg leading-7">
                Enter the actual physical diameter of your film. This is used to
                calibrate the image analysis.
              </Text>

              <View className="mt-10 gap-y-2">
                <Text className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
                  Film Diameter
                </Text>
                <View className="flex-row items-center w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                  <TextInput
                    className="flex-1 text-2xl font-bold text-slate-900 dark:text-white p-2"
                    placeholder="25.0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    value={diameter}
                    onChangeText={(text) => {
                      if (/^\d*\.?\d*$/.test(text)) {
                        setDiameter(text);
                      }
                    }}
                    autoFocus
                  />
                  <Text className="text-xl font-medium text-slate-400 ml-2">
                    mm
                  </Text>
                </View>
                <Text className="text-xs text-slate-400 pl-2">
                  Usually between 10mm - 50mm
                </Text>
              </View>
            </View>

            <View className="pb-4">
              <TouchableOpacity
                className={`w-full h-16 rounded-3xl flex-row justify-center items-center gap-x-3 shadow-lg ${
                  diameter
                    ? "bg-blue-600 shadow-blue-500/30"
                    : "bg-gray-200 dark:bg-slate-800 shadow-none"
                }`}
                onPress={handleNext}
                disabled={!diameter}
              >
                <Text
                  className={`font-bold text-xl ${diameter ? "text-white" : "text-gray-400 dark:text-slate-600"}`}
                >
                  Open Camera
                </Text>
                <ArrowRight
                  size={24}
                  color={diameter ? "white" : "#94a3b8"}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
