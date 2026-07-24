export type GenerationMode = "landing" | "dashboard" | "auth" | "docs" | "ecommerce" | "mobile-app";
export type GenerationPlatform = "ios" | "android" | "both";
export type CreativityLevel = "strict" | "balanced" | "exploratory";
export type LayoutComplexity = "simple" | "balanced" | "complex";
export type ContentDepth = "wireframe" | "realistic-copy" | "complete";
export type StyleIntensity = "minimal" | "balanced" | "bold";

export interface PromptGuidanceOptions {
  generationMode?: GenerationMode;
  generationPlatform?: GenerationPlatform;
  creativityLevel?: CreativityLevel;
  layoutComplexity?: LayoutComplexity;
  contentDepth?: ContentDepth;
  styleIntensity?: StyleIntensity;
}
