/** Max characters accepted for job description payloads (API + client). */
export const JOB_DESCRIPTION_MAX_LENGTH = 50_000;

/**
 * Returns an error message if the trimmed JD is invalid length, else null.
 */
export function jobDescriptionLengthError(
  trimmed: string
): string | null {
  if (trimmed.length > JOB_DESCRIPTION_MAX_LENGTH) {
    return `jobDescription must be at most ${JOB_DESCRIPTION_MAX_LENGTH} characters (received ${trimmed.length}).`;
  }
  return null;
}
