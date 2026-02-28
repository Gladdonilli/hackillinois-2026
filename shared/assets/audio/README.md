# Sample Audio Assets for LARYNX Demo

## Formant-Optimized Test Sentences

These sentences are designed to maximize formant variation (F1/F2 transitions)
for demonstrating the velocity gap between real speech and TTS deepfakes.

### Primary Demo Set (use these in the 3-min demo)

1. "The early morning breeze carried the scent of blooming roses across the quiet garden."
   - Rich vowel variety: /i/, /ɔ/, /u/, /ɛ/, /aɪ/
   - Natural pacing with clear formant transitions

2. "Are we aware of any area where aerial arrows arrive?"
   - VOWEL CLUSTER TORTURE TEST — almost entirely vowels
   - TTS WILL produce impossible acceleration spikes on this
   - This is the "gotcha" sentence for the demo

3. "I owe you a really unique and wonderful yellow yo-yo."
   - 100% voiced, extreme tongue gliding /aɪ/→/oʊ/→/u/→/i/
   - Diphthong-heavy = maximum tongue velocity required

### Secondary Set (for validation / extended demo)

4. "She smoothly opened the heavy oak door to reveal a dark hallway."
   - /i/→/u/→/ɛ/→/oʊ/ transitions, multiple tongue position changes

5. "Why do yellow lions roar loudly in the wild enclosure?"
   - Diphthong-heavy, rapid jaw movements, wide F1 range

6. "Beautiful ocean waves crash heavily against the jagged grey rocks."
   - F2 extremes: front vowels (/i/, /ɛ/) vs back vowels (/ɑ/, /ɔ/)

7. "Cold winds howl through the tall, ancient redwood trees."
   - Dynamic range: whispered sibilants to full vowels

8. "Peter baked a perfectly golden pie for the autumn festival."
   - Plosive+vowel onsets (P, B, G) = sharp formant attacks

## Data Sources

### Real Speech
- **LJ Speech** (PRIMARY): https://data.keithito.com/data/speech/LJSpeech-1.1.tar.bz2
  - Single US female speaker, ~13,100 clips, 1-10s each, 22.05kHz WAV, public domain
  - Downsample to 16kHz with librosa: `librosa.load(path, sr=16000)`
  - HUGE dataset — only need 5-10 clips for demo

- **LibriSpeech dev-clean**: https://www.openslr.org/resources/12/dev-clean.tar.gz
  - Multi-speaker audiobook excerpts, 16kHz FLAC

### Paired Real/Fake (for validation)
- **WaveFake**: https://zenodo.org/record/5642694
  - 100K+ generated tracks from 6 vocoders, uses LJ Speech as source
  - EXACT 1:1 real/fake pairs — perfect for A/B formant velocity comparison
  - Direct download, no approval needed

### TTS Generation (for demo deepfakes)
```bash
# OpenAI TTS via curl (use Cliproxy during dev, real key for final demo)
curl -X POST https://api.openai.com/v1/audio/speech \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "voice": "nova",
    "input": "Are we aware of any area where aerial arrows arrive?",
    "response_format": "wav"
  }' \
  --output shared/assets/audio/deepfake/vowel-torture-nova.wav

# Available voices: alloy, echo, fable, onyx, nova, shimmer
# tts-1 = faster, more artifacts (better for triggering detection)
# tts-1-hd = smoother (harder to detect, good for "advanced" demo)
```

## Demo Strategy

1. **Upload real speech clip** → Show smooth formant transitions, tongue stays within physical limits
2. **Upload TTS version of SAME text** → Show velocity spikes, tongue clips through skull
3. **Sentence 2 ("Are we aware...")** is the killshot — vowel clusters force TTS into impossible transitions

## File Layout
```
shared/assets/audio/
├── real/           # Real speech recordings (LJ Speech or recorded)
├── deepfake/       # TTS-generated versions of same sentences
└── README.md       # This file
```
