/**
 * Logic to calculate heavy metal concentration or detection status.
 *
 * TODO: The specific formula needs to be provided by the user.
 * Currently, we are using a placeholder logic where:
 * - If spotting diameter is > 0.5 * film diameter (arbitrary), logic triggers.
 *
 * @param spotDiameterMm The measured diameter of the colored spot in mm.
 * @param filmDiameterMm The total diameter of the film in mm.
 * @returns Object containing detection status and estimated concentration.
 */
export function analyzeHeavyMetal(spotDiameterMm: number) {
  // Placeholder Formula
  // Example: Concentration = (Diameter - Offset) * Factor
  // This is strictly a placeholder.

  // Let's assume a linear relationship for demonstration
  // If diameter > 0, it means some reaction occurred.

  const isDetected = spotDiameterMm > 0.5; // Threshold

  // Dummy concentration calculation
  const concentration = isDetected
    ? (spotDiameterMm * 1.5).toFixed(2) + " ppm"
    : "0 ppm";

  return {
    isDetected,
    concentration,
    message: isDetected ? "Heavy Metal Detected" : "Safe / Not Detected",
  };
}
