import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, ApiResponse, Report } from './types';

const ALLOWED_ORIGINS = [
  'https://larynx.pages.dev',
  'https://voxlarynx.tech',
  'http://localhost:5173',
];

const ALLOWED_FORMATS = new Set(['wav', 'mp3', 'flac', 'ogg']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use(
  '*',
  cors({
    origin: ALLOWED_ORIGINS,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Request-ID'],
    exposeHeaders: ['X-Request-ID', 'X-Processing-Time-Ms'],
  })
);

// Rate limiting middleware
app.use('/api/*', async (c, next) => {
  const limiter = c.env.RATE_LIMITER;
  if (limiter) {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const { success } = await limiter.limit({ key: ip });
    if (!success) {
      return c.json<ApiResponse<null>>(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Max 20/min.' } },
        429
      );
    }
  }
  await next();
});

// Helper: generate report ID
function generateReportId(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `rpt_${hex}`;
}

// Helper: hash IP for privacy
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── GET /api/health ───
app.get('/api/health', (c) => {
  return c.json<ApiResponse<{ service: string; status: string; timestamp: number }>>({
    success: true,
    data: { service: 'larynx', status: 'healthy', timestamp: Date.now() },
  });
});

// ─── POST /api/analyze ───
// Accepts multipart audio, uploads to R2, proxies to Modal, streams SSE back.
// Intercepts `verdict` event to persist result in D1 and inject reportId.
app.post('/api/analyze', async (c) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const reportId = generateReportId();

  // Parse multipart
  const formData = await c.req.parseBody();
  const file = formData['file'];

  if (!file || !(file instanceof File)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: { code: 'INVALID_FORMAT', message: 'No audio file provided. Use field name "file".' } },
      400
    );
  }

  // Validate format
  const filename = file.name || 'unknown.wav';
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  if (!ALLOWED_FORMATS.has(ext)) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: `Invalid format "${ext}". Allowed: wav, mp3, flac, ogg`,
        },
      },
      400
    );
  }

  // Validate size
  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
    const sizeMb = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(1);
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: {
          code: 'UPLOAD_TOO_LARGE',
          message: `File too large (${sizeMb}MB). Maximum: 10MB`,
        },
      },
      413
    );
  }

  // Upload to R2
  const audioKey = `audio/${reportId}/${filename}`;
  await c.env.AUDIO_BUCKET.put(audioKey, arrayBuffer, {
    httpMetadata: { contentType: file.type || 'audio/wav' },
  });

  // Proxy to Modal as multipart/form-data
  const modalForm = new FormData();
  modalForm.append('file', new Blob([arrayBuffer], { type: file.type || 'audio/wav' }), filename);

  let modalResponse: Response;
  try {
    modalResponse = await fetch(c.env.MODAL_API_URL, {
      method: 'POST',
      body: modalForm,
    });
  } catch (err) {
    return c.json<ApiResponse<null>>(
      { success: false, error: { code: 'MODEL_UNAVAILABLE', message: 'Backend unreachable' } },
      503
    );
  }

  if (!modalResponse.ok || !modalResponse.body) {
    const errText = await modalResponse.text().catch(() => 'Unknown error');
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: `Backend error ${modalResponse.status}: ${errText.slice(0, 200)}`,
        },
      },
      500
    );
  }

  // Stream SSE from Modal → Client, intercepting verdict to persist
  const reader = modalResponse.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const db = c.env.DB;
  const clientIp = c.req.header('CF-Connecting-IP') || 'unknown';

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages (double newline separated)
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep incomplete message in buffer

          for (const msg of messages) {
            if (!msg.trim()) continue;

            // Check if this is a verdict event
            const eventMatch = msg.match(/^event:\s*(\w+)/m);
            const dataMatch = msg.match(/^data:\s*(.+)$/m);

            if (eventMatch?.[1] === 'verdict' && dataMatch?.[1]) {
              // Intercept verdict: add reportId, persist to D1
              try {
                const verdict = JSON.parse(dataMatch[1]);
                const processingTimeMs = Date.now() - startTime;

                // Add reportId to verdict
                verdict.reportId = reportId;
                verdict.processingTimeMs = processingTimeMs;

                // Persist to D1
                const ipHash = await hashIp(clientIp);
                await db
                  .prepare(
                    `INSERT INTO analysis_reports (
                      report_id, audio_key, verdict, confidence,
                      peak_velocity, threshold, anomalous_frames,
                      total_frames, anomaly_ratio, processing_time_ms,
                      client_ip_hash
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                  )
                  .bind(
                    reportId,
                    audioKey,
                    verdict.isGenuine ? 'GENUINE' : 'DEEPFAKE',
                    verdict.confidence,
                    verdict.peakVelocity,
                    verdict.threshold,
                    verdict.anomalousFrameCount || 0,
                    verdict.totalFrameCount || 0,
                    verdict.anomalyRatio || 0,
                    processingTimeMs,
                    ipHash
                  )
                  .run();

                // Forward modified verdict with reportId
                const modifiedMsg = `event: verdict\ndata: ${JSON.stringify(verdict)}\n\n`;
                controller.enqueue(encoder.encode(modifiedMsg));
                continue;
              } catch {
                // If D1 fails, still forward the original verdict
              }
            }

            // Forward all other events as-is
            controller.enqueue(encoder.encode(msg + '\n\n'));
          }
        }

        // Flush remaining buffer
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(buffer + '\n\n'));
        }

        controller.close();
      } catch (err) {
        const errMsg = `event: error\ndata: ${JSON.stringify({ message: 'Stream interrupted' })}\n\n`;
        controller.enqueue(encoder.encode(errMsg));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Request-ID': requestId,
      'X-Processing-Time-Ms': String(Date.now() - startTime),
      'Access-Control-Allow-Origin': c.req.header('Origin') || ALLOWED_ORIGINS[0],
      'Access-Control-Expose-Headers': 'X-Request-ID, X-Processing-Time-Ms',
    },
  });
});

// ─── POST /api/compare ───
// Accepts two audio files (file_a, file_b), uploads both to R2, proxies to Modal compare endpoint.
app.post('/api/compare', async (c) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const reportIdA = generateReportId();
  const reportIdB = generateReportId();

  const formData = await c.req.parseBody();
  const fileA = formData['file_a'];
  const fileB = formData['file_b'];

  if (!fileA || !(fileA instanceof File) || !fileB || !(fileB instanceof File)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: { code: 'INVALID_FORMAT', message: 'Two audio files required. Use field names "file_a" and "file_b".' } },
      400
    );
  }

  // Validate both files
  for (const [label, file] of [['file_a', fileA], ['file_b', fileB]] as const) {
    const fname = (file as File).name || 'unknown.wav';
    const ext = fname.includes('.') ? fname.split('.').pop()!.toLowerCase() : '';
    if (!ALLOWED_FORMATS.has(ext)) {
      return c.json<ApiResponse<null>>(
        { success: false, error: { code: 'INVALID_FORMAT', message: `Invalid format for ${label}: "${ext}". Allowed: wav, mp3, flac, ogg` } },
        400
      );
    }
    const ab = await (file as File).arrayBuffer();
    if (ab.byteLength > MAX_FILE_SIZE) {
      return c.json<ApiResponse<null>>(
        { success: false, error: { code: 'UPLOAD_TOO_LARGE', message: `${label} too large (${(ab.byteLength / (1024 * 1024)).toFixed(1)}MB). Maximum: 10MB` } },
        413
      );
    }
  }

  // Upload both to R2
  const bufA = await fileA.arrayBuffer();
  const bufB = await fileB.arrayBuffer();
  const nameA = fileA.name || 'file_a.wav';
  const nameB = fileB.name || 'file_b.wav';

  await Promise.all([
    c.env.AUDIO_BUCKET.put(`audio/${reportIdA}/${nameA}`, bufA, {
      httpMetadata: { contentType: fileA.type || 'audio/wav' },
    }),
    c.env.AUDIO_BUCKET.put(`audio/${reportIdB}/${nameB}`, bufB, {
      httpMetadata: { contentType: fileB.type || 'audio/wav' },
    }),
  ]);

  // Proxy to Modal compare endpoint
  const modalForm = new FormData();
  modalForm.append('file_a', new Blob([bufA], { type: fileA.type || 'audio/wav' }), nameA);
  modalForm.append('file_b', new Blob([bufB], { type: fileB.type || 'audio/wav' }), nameB);

  const compareUrl = c.env.MODAL_COMPARE_URL || c.env.MODAL_API_URL.replace('analyze', 'compare');

  let modalResponse: Response;
  try {
    modalResponse = await fetch(compareUrl, {
      method: 'POST',
      body: modalForm,
    });
  } catch {
    return c.json<ApiResponse<null>>(
      { success: false, error: { code: 'MODEL_UNAVAILABLE', message: 'Backend unreachable' } },
      503
    );
  }

  if (!modalResponse.ok || !modalResponse.body) {
    const errText = await modalResponse.text().catch(() => 'Unknown error');
    return c.json<ApiResponse<null>>(
      { success: false, error: { code: 'PROCESSING_FAILED', message: `Backend error ${modalResponse.status}: ${errText.slice(0, 200)}` } },
      500
    );
  }

  // Stream SSE from Modal to Client (pass-through with reportId injection on verdicts)
  const reader = modalResponse.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || '';

          for (const msg of messages) {
            if (!msg.trim()) continue;
            const eventMatch = msg.match(/^event:\s*(\w+)/m);
            const dataMatch = msg.match(/^data:\s*(.+)$/m);

            if (eventMatch?.[1] === 'verdict' && dataMatch?.[1]) {
              try {
                const verdict = JSON.parse(dataMatch[1]);
                verdict.reportId = verdict.channel === 0 ? reportIdA : reportIdB;
                verdict.processingTimeMs = Date.now() - startTime;
                const modifiedMsg = `event: verdict\ndata: ${JSON.stringify(verdict)}\n\n`;
                controller.enqueue(encoder.encode(modifiedMsg));
                continue;
              } catch {
                // Fall through to forward as-is
              }
            }
            controller.enqueue(encoder.encode(msg + '\n\n'));
          }
        }
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(buffer + '\n\n'));
        }
        controller.close();
      } catch {
        const errMsg = `event: error\ndata: ${JSON.stringify({ message: 'Stream interrupted' })}\n\n`;
        controller.enqueue(encoder.encode(errMsg));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Request-ID': requestId,
      'Access-Control-Allow-Origin': c.req.header('Origin') || ALLOWED_ORIGINS[0],
      'Access-Control-Expose-Headers': 'X-Request-ID',
    },
  });
});

// ─── GET /api/reports/:reportId ───
app.get('/api/reports/:reportId', async (c) => {
  const reportId = c.req.param('reportId');

  const row = await c.env.DB.prepare('SELECT * FROM analysis_reports WHERE report_id = ?')
    .bind(reportId)
    .first();

  if (!row) {
    return c.json<ApiResponse<null>>(
      { success: false, error: { code: 'NOT_FOUND', message: `Report ${reportId} not found` } },
      404
    );
  }

  const report: Report = {
    reportId: row.report_id as string,
    createdAt: row.created_at as string,
    verdict: row.verdict as 'GENUINE' | 'DEEPFAKE',
    confidence: row.confidence as number,
    peakVelocity: row.peak_velocity as number,
    threshold: row.threshold as number,
    anomalousFrameCount: row.anomalous_frames as number,
    totalFrameCount: row.total_frames as number,
    anomalyRatio: row.anomaly_ratio as number,
    audioKey: row.audio_key as string,
    durationSeconds: row.duration_s as number,
    processingTimeMs: row.processing_time_ms as number,
    classifierScore: row.classifier_score as number | undefined,
    classifierModel: row.classifier_model as string | undefined,
    ensembleScore: row.ensemble_score as number | undefined,
  };

  return c.json<ApiResponse<Report>>({ success: true, data: report });
});

// ─── GET /api/history ───
app.get('/api/history', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || '50'), 100);

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM analysis_reports ORDER BY created_at DESC LIMIT ?'
  )
    .bind(limit)
    .all();

  return c.json<ApiResponse<typeof results>>({ success: true, data: results });
});

export default app;
