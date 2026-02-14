// Simple in-memory storage for passing large data between screens
// This avoids URL length limits (HTTP 431) when passing base64 images

let analysisImageUri: string | null = null;

export const setAnalysisImage = (uri: string) => {
  analysisImageUri = uri;
};

export const getAnalysisImage = () => {
  return analysisImageUri;
};
