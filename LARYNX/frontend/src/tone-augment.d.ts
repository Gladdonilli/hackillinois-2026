// Tone.js v15 removed RecursivePartial — re-add to the 'tone' namespace
// This file uses `import 'tone'` to trigger module augmentation (merge, not replace).
import 'tone'
declare module 'tone' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type RecursivePartial<T> = { [P in keyof T]?: any }
}
