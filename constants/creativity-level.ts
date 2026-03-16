export const CREATIVITY_LEVELS = [
  {
    value: "strict",
    label: "Strict",
    description: "Stay close to the prompt, avoid extra invention, and keep interpretation tightly constrained."
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Follow the prompt faithfully while adding a measured amount of design interpretation."
  },
  {
    value: "exploratory",
    label: "Exploratory",
    description: "Push concepting further with bolder extrapolation, richer variation, and more initiative."
  }
] as const;

export type CreativityLevel = (typeof CREATIVITY_LEVELS)[number]["value"];

export const DEFAULT_CREATIVITY_LEVEL: CreativityLevel = "balanced";

export const CREATIVITY_LEVEL_SET = new Set<CreativityLevel>(
  CREATIVITY_LEVELS.map((level) => level.value)
);
