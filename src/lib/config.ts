// Application configuration constants

export const REVIEW_CONFIG = {
  // Review intervals in milliseconds
  INTERVALS: {
    FORGOT: 1 * 24 * 60 * 60 * 1000, // 1 day
    HARD: 3 * 24 * 60 * 60 * 1000,   // 3 days
    EASY: 7 * 24 * 60 * 60 * 1000,   // 7 days
  },
  // Confidence score changes
  CONFIDENCE_CHANGES: {
    FORGOT: -1,
    HARD: 0,
    EASY: 1,
  },
  // Maximum confidence score
  MAX_CONFIDENCE: 5,
  MIN_CONFIDENCE: 0,
  // Review session limits
  REVIEW_SESSION_LIMIT: 20,
} as const;

export const EXAM_CONFIG = {
  DURATION_MS: 15 * 60 * 1000, // 15 minutes
  MAX_ITEMS: 15,
} as const;

export const EDITOR_CONFIG = {
  AUTO_SAVE_DELAY: 2000, // 2 seconds
  MIN_CONTENT_LENGTH: 1,
} as const;

export const APP_CONFIG = {
  NAME: "Recall Genius",
  DESCRIPTION: "Transform your notes into active recall questions. Study smarter, retain longer.",
} as const;
