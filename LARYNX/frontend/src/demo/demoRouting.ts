/**
 * Demo mode routing — determines whether a file should be treated as fake
 * based on filename keywords.
 */

const FAKE_KEYWORDS = /fake|synth|tts|generated|eleven|deepfake/i

/** Returns true if the filename suggests a synthetic/fake voice sample */
export function isDemoFake(filename: string): boolean {
  return FAKE_KEYWORDS.test(filename)
}
