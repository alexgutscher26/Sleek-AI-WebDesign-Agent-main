import type { UserConfig } from "@commitlint/types"

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],

  rules: {
    // Type must be one of these values
    "type-enum": [
      2,
      "always",
      [
        "feat", // new feature
        "fix", // bug fix
        "docs", // documentation only
        "style", // formatting, no logic change
        "refactor", // code change that is neither fix nor feature
        "perf", // performance improvement
        "test", // adding/updating tests
        "build", // build system or dependency changes
        "ci", // CI configuration changes
        "chore", // maintenance (deps, config, tooling)
        "revert", // reverts a previous commit
      ],
    ],

    // Subject must not be empty
    "subject-empty": [2, "never"],

    // Body lines capped at 200 chars (generous for URLs / migration notes)
    "body-max-line-length": [1, "always", 200],

    // Subject line capped at 100 chars
    "header-max-length": [2, "always", 100],

    // No full stop at end of subject
    "subject-full-stop": [2, "never", "."],

    // Scope is optional but must be lowercase when provided
    "scope-case": [2, "always", "lower-case"],

    // Type must be lowercase
    "type-case": [2, "always", "lower-case"],
  },

  helpUrl: "https://www.conventionalcommits.org/en/v1.0.0/",

  prompt: {
    messages: {
      skip: "(press enter to skip)",
      max: "upper %d chars",
      min: "%d chars at least",
      emptyWarning: "can not be empty",
      upperLimitWarning: "over limit",
      lowerLimitWarning: "below limit",
    },
  },
}

export default config
