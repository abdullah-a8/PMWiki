export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"

export const STANDARDS = {
  PMBOK: "PMBOK",
  PRINCE2: "PRINCE2",
  ISO_21502: "ISO 21502",
} as const

export const STANDARD_BADGES = {
  [STANDARDS.PMBOK]: {
    color: "bg-blue-500",
    label: "PMBOK",
  },
  [STANDARDS.PRINCE2]: {
    color: "bg-purple-500",
    label: "PRINCE2",
  },
  [STANDARDS.ISO_21502]: {
    color: "bg-teal-500",
    label: "ISO 21502",
  },
} as const
