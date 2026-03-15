export const MAX_MESSAGES = 20
export const MAX_TEXT_PART_LENGTH = 8000
export const MAX_TOTAL_TEXT_LENGTH = 20000
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
export const ALLOWED_FILE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
] as const

export const ALLOWED_FILE_ACCEPT = ALLOWED_FILE_MIME_TYPES.join(",")

export const MIME_EXTENSIONS: Record<(typeof ALLOWED_FILE_MIME_TYPES)[number], string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"]
}
