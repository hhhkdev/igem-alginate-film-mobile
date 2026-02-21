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
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { tokens } from "../lib/design-tokens";

export default function InputDetailsScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<"petri" | "ruler">("petri");
  const [filmDiameter, setFilmDiameter] = useState("25.0");
  const [petriDiameter, setPetriDiameter] = useState("150.0");
  const [rulerLength, setRulerLength] = useState("");

  const handleNext = () => {
    const fDia = parseFloat(filmDiameter);
    const pDia = parseFloat(petriDiameter);
    const rLen = parseFloat(rulerLength);

    if (!filmDiameter || isNaN(fDia) || fDia <= 0) {
      Alert.alert("Input Error", "Please enter a valid film diameter.");
      return;
    }

    if (method === "petri") {
      if (!petriDiameter || isNaN(pDia) || pDia <= 0) {
        Alert.alert("Input Error", "Please enter a valid Petri dish diameter.");
        return;
      }
    } else {
      if (!rulerLength || isNaN(rLen) || rLen <= 0) {
        Alert.alert("Input Error", "Please enter a valid ruler length.");
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

  const isReady =
    !!filmDiameter && !!(method === "petri" ? petriDiameter : rulerLength);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex1}
      >
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
          disabled={Platform.OS === "web"}
        >
          <View style={styles.content}>
            <View>
              {/* Back Button */}
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={tokens.color.iconDefault} />
              </TouchableOpacity>

              <Text style={styles.title}>Measurement Settings</Text>
              <Text style={styles.subtitle}>
                Select a reference method and enter dimensions.
              </Text>

              {/* Method Selection */}
              <View style={styles.methodContainer}>
                <TouchableOpacity
                  onPress={() => setMethod("petri")}
                  style={[
                    styles.methodButton,
                    method === "petri" && styles.methodButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.methodText,
                      method === "petri" && styles.methodTextActive,
                    ]}
                  >
                    Petri Dish
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMethod("ruler")}
                  style={[
                    styles.methodButton,
                    method === "ruler" && styles.methodButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.methodText,
                      method === "ruler" && styles.methodTextActive,
                    ]}
                  >
                    Ruler
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Inputs */}
              <View style={styles.inputsContainer}>
                {/* Film Diameter Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Film Diameter</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="25.0"
                      placeholderTextColor={tokens.color.textPlaceholder}
                      keyboardType="decimal-pad"
                      value={filmDiameter}
                      onChangeText={setFilmDiameter}
                    />
                    <Text style={styles.unitText}>mm</Text>
                  </View>
                </View>

                {/* Petri Dish Input */}
                <View
                  style={[
                    styles.inputGroup,
                    method !== "petri" && styles.hidden,
                  ]}
                >
                  <Text style={styles.inputLabel}>Petri Dish Diameter</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="150.0"
                      placeholderTextColor={tokens.color.textPlaceholder}
                      keyboardType="decimal-pad"
                      value={petriDiameter}
                      onChangeText={setPetriDiameter}
                    />
                    <Text style={styles.unitText}>mm</Text>
                  </View>
                </View>

                {/* Ruler Length Input */}
                <View
                  style={[
                    styles.inputGroup,
                    method !== "ruler" && styles.hidden,
                  ]}
                >
                  <Text style={styles.inputLabel}>Ruler Length</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 100"
                      placeholderTextColor={tokens.color.textPlaceholder}
                      keyboardType="decimal-pad"
                      value={rulerLength}
                      onChangeText={setRulerLength}
                    />
                    <Text style={styles.unitText}>mm</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <View style={styles.submitContainer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isReady
                    ? styles.submitButtonActive
                    : styles.submitButtonDisabled,
                ]}
                onPress={handleNext}
                disabled={!isReady}
              >
                <Text
                  style={[
                    styles.submitText,
                    isReady
                      ? styles.submitTextActive
                      : styles.submitTextDisabled,
                  ]}
                >
                  Open Camera
                </Text>
                <ArrowRight
                  size={20}
                  color={isReady ? "white" : tokens.color.textPlaceholder}
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

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: tokens.color.bgScreen,
  },
  content: {
    flex: 1,
    padding: tokens.spacing.screenPadding,
    justifyContent: "space-between",
  },
  backButton: {
    ...tokens.component.backButton,
  },
  title: {
    ...tokens.font.title,
    marginBottom: 12,
  },
  subtitle: {
    ...tokens.font.subtitle,
    marginBottom: 24,
  },
  methodContainer: {
    flexDirection: "row",
    backgroundColor: tokens.color.bgMuted,
    padding: 4,
    borderRadius: tokens.radius.toggleContainer,
    marginBottom: 32,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: tokens.radius.toggleInner,
  },
  methodButtonActive: {
    backgroundColor: tokens.color.bgPrimary,
    ...tokens.shadow.toggleActive,
  },
  methodText: {
    fontWeight: "600",
    color: tokens.color.textMuted,
  },
  methodTextActive: {
    color: tokens.color.accentBlue,
  },
  inputsContainer: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  hidden: {
    display: "none",
  },
  inputLabel: {
    ...tokens.font.sectionLabel,
    paddingLeft: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: tokens.color.bgPrimary,
    ...tokens.border.card,
    borderRadius: tokens.radius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: tokens.color.textPrimary,
    padding: 8,
  },
  unitText: {
    fontSize: 18,
    fontWeight: "500",
    color: tokens.color.textPlaceholder,
    marginLeft: 8,
  },
  submitContainer: {
    paddingBottom: 16,
  },
  submitButton: {
    width: "100%",
    height: tokens.button.ctaHeight,
    borderRadius: tokens.radius.button,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  submitButtonActive: {
    backgroundColor: tokens.color.accentBlue,
    ...tokens.shadow.cta,
  },
  submitButtonDisabled: {
    backgroundColor: tokens.color.disabledBg,
  },
  submitText: {
    ...tokens.font.ctaText,
  },
  submitTextActive: {
    color: tokens.color.bgPrimary,
  },
  submitTextDisabled: {
    color: tokens.color.disabledText,
  },
});
