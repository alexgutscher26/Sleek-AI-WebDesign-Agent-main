export const STYLE_INTENSITIES = [
  {
    value: "minimal",
    label: "Minimal",
    description: "Restrained layouts with quiet surfaces, subtle depth, and a cleaner visual footprint."
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "A measured mix of clarity and visual personality for most projects."
  },
  {
    value: "bold",
    label: "Bold",
    description: "High-contrast, expressive compositions with stronger motion, color, and depth."
  }
] as const;

export type StyleIntensity = (typeof STYLE_INTENSITIES)[number]["value"];

export const DEFAULT_STYLE_INTENSITY: StyleIntensity = "balanced";

export const STYLE_INTENSITY_SET = new Set<StyleIntensity>(
  STYLE_INTENSITIES.map((intensity) => intensity.value)
);
