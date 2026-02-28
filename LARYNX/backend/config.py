"""LARYNX Backend Configuration — Articulatory physics constants and thresholds."""

# Audio preprocessing
SAMPLE_RATE = 16000
NOISE_GATE_DB = -40.0  # RMS threshold for silence detection
PITCH_FILTER_HZ = 80.0  # Discard frames with pitch < 80Hz
MEDIAN_FILTER_SIZE = 5  # 5-frame median filter on formant tracks

# Formant extraction (parselmouth/Praat)
FORMANT_TIME_STEP = 0.01  # 100fps = 10ms per frame
MAX_FORMANTS = 5
MAX_FORMANT_HZ = 5500.0  # 5500 for male, 5000 for female (default male)
WINDOW_LENGTH = 0.025  # 25ms analysis window

# Articulatory mapping — formant Hz to midsagittal mm
# F1 → jaw opening (vertical): low F1 = closed, high F1 = open
F1_CLOSED_HZ = 300.0  # Closed jaw ≈ 0mm displacement
F1_OPEN_HZ = 900.0    # Full open ≈ 15mm displacement
JAW_MAX_MM = 15.0

# F2 → tongue frontness (horizontal): high F2 = front, low F2 = back
F2_BACK_HZ = 800.0    # Tongue back ≈ -20mm
F2_FRONT_HZ = 2400.0  # Tongue front ≈ +20mm
TONGUE_BACK_MM = -20.0
TONGUE_FRONT_MM = 20.0

# F3 → lip rounding (reserved for future use — not mapped in current pipeline)

# Velocity computation
# DO NOT CLAMP articulatory values — deepfake values > 1.0 cause skull clip
# which is the visual "smoking gun" evidence
VELOCITY_SCALE = 1.5  # Scaling factor for articulatory → cm/s

# Anomaly detection thresholds (cm/s)
# Human physiological limits from Ladefoged/Stevens research
VELOCITY_THRESHOLDS: dict[str, float] = {
    "T1": 20.0,   # Tongue tip — max 20 cm/s in connected speech
    "T2": 15.0,   # Tongue body
    "T3": 12.0,   # Tongue dorsum
    "JAW": 10.0,  # Jaw — slower than tongue
    "UL": 15.0,   # Upper lip
    "LL": 18.0,   # Lower lip — slightly faster than upper
}

# Absolute maximum — anything above is physically impossible
ABSOLUTE_MAX_VELOCITY = 22.0  # cm/s, tongue tip absolute limit

# TTS deepfake signature: F2 jumps of 500+ Hz in 10ms → 50-150 cm/s
# Any velocity > 22 cm/s is flagged as anomalous
# SSE streaming
SSE_HEARTBEAT_INTERVAL = 15.0  # seconds between keepalive pings

# File upload constraints
MAX_FILE_SIZE_MB = 10
ALLOWED_FORMATS = {"wav", "mp3", "flac", "ogg"}
