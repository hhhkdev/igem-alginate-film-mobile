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
  const [method, setMethod] = useState<"petri" | "ruler">("petri");
  const [filmDiameter, setFilmDiameter] = useState("25.0"); // Default 25mm
  const [petriDiameter, setPetriDiameter] = useState("150.0"); // Default 150mm
  const [rulerLength, setRulerLength] = useState("");

  const handleNext = () => {
    const fDia = parseFloat(filmDiameter);
    const pDia = parseFloat(petriDiameter);
    const rLen = parseFloat(rulerLength);

    if (!filmDiameter || isNaN(fDia) || fDia <= 0) {
      Alert.alert("입력 오류", "유효한 필름 지름을 입력해주세요.");
      return;
    }

    if (method === "petri") {
      if (!petriDiameter || isNaN(pDia) || pDia <= 0) {
        Alert.alert("입력 오류", "유효한 페트리 접시 지름을 입력해주세요.");
        return;
      }
    } else {
      if (!rulerLength || isNaN(rLen) || rLen <= 0) {
        Alert.alert("입력 오류", "유효한 자(Ruler) 길이를 입력해주세요.");
        return;
      }
    }

    router.push({
      pathname: "/camera",
      params: {
        method,
        filmDiameter,
        refDimension: method === "petri" ? petriDiameter : rulerLength,
      },
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

              <Text className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
                측정 설정
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-lg leading-7 mb-6">
                참조 방식(기준)을 선택하고 치수를 입력하세요.
              </Text>

              {/* Method Selection */}
              <View className="flex-row bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl mb-8">
                <TouchableOpacity
                  onPress={() => setMethod("petri")}
                  className={`flex-1 py-3 items-center rounded-xl ${
                    method === "petri"
                      ? "bg-white dark:bg-slate-700 shadow-sm"
                      : ""
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      method === "petri"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    페트리 접시
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMethod("ruler")}
                  className={`flex-1 py-3 items-center rounded-xl ${
                    method === "ruler"
                      ? "bg-white dark:bg-slate-700 shadow-sm"
                      : ""
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      method === "ruler"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    자 (Ruler)
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="gap-y-6">
                {/* Film Diameter Input */}
                <View className="gap-y-2">
                  <Text className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
                    필름 지름
                  </Text>
                  <View className="flex-row items-center w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    <TextInput
                      className="flex-1 text-xl font-bold text-slate-900 dark:text-white p-2"
                      placeholder="25.0"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                      value={filmDiameter}
                      onChangeText={setFilmDiameter}
                    />
                    <Text className="text-lg font-medium text-slate-400 ml-2">
                      mm
                    </Text>
                  </View>
                </View>

                {/* Conditional Input */}
                {method === "petri" ? (
                  <View className="gap-y-2">
                    <Text className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
                      페트리 접시 지름
                    </Text>
                    <View className="flex-row items-center w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                      <TextInput
                        className="flex-1 text-xl font-bold text-slate-900 dark:text-white p-2"
                        placeholder="150.0"
                        placeholderTextColor="#94a3b8"
                        keyboardType="decimal-pad"
                        value={petriDiameter}
                        onChangeText={setPetriDiameter}
                      />
                      <Text className="text-lg font-medium text-slate-400 ml-2">
                        mm
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View className="gap-y-2">
                    <Text className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">
                      자(Ruler) 길이
                    </Text>
                    <View className="flex-row items-center w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                      <TextInput
                        className="flex-1 text-xl font-bold text-slate-900 dark:text-white p-2"
                        placeholder="예: 100" // No default for ruler as it varies
                        placeholderTextColor="#94a3b8"
                        keyboardType="decimal-pad"
                        value={rulerLength}
                        onChangeText={setRulerLength}
                      />
                      <Text className="text-lg font-medium text-slate-400 ml-2">
                        mm
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View className="pb-4">
              <TouchableOpacity
                className={`w-full h-16 rounded-3xl flex-row justify-center items-center gap-x-3 shadow ${
                  filmDiameter &&
                  (method === "petri" ? petriDiameter : rulerLength)
                    ? "bg-blue-600 shadow-blue-500/30"
                    : "bg-gray-200 dark:bg-slate-800 shadow-none"
                }`}
                onPress={handleNext}
                disabled={
                  !filmDiameter ||
                  !(method === "petri" ? petriDiameter : rulerLength)
                }
              >
                <Text
                  className={`font-bold text-xl ${
                    filmDiameter &&
                    (method === "petri" ? petriDiameter : rulerLength)
                      ? "text-white"
                      : "text-gray-400 dark:text-slate-600"
                  }`}
                >
                  카메라 열기
                </Text>
                <ArrowRight
                  size={24}
                  color={
                    filmDiameter &&
                    (method === "petri" ? petriDiameter : rulerLength)
                      ? "white"
                      : "#94a3b8"
                  }
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
