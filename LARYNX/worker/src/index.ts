import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  MODAL_URL: string;
  OPENAI_API_KEY: string;
  ALLOWED_ORIGINS: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS Middleware
app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS ? c.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];
  const corsHandler = cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Accept'],
  });
  return corsHandler(c, next);
});

// Helper for consistent API responses
const successResponse = <T>(c: any, data: T) => c.json({ success: true, data });
const errorResponse = (c: any, error: string, status: number = 500) => c.json({ success: false, error }, status as any);

app.get('/health', (c) => {
  return successResponse(c, { status: 'ok' });
});

app.post('/api/analyze', async (c) => {
  try {
    const formData = await c.req.parseBody();
    const audioFile = formData['audio'];

    if (!audioFile || !(audioFile instanceof File)) {
      return errorResponse(c, 'No audio file provided', 400);
    }

    // Upload to R2 with UUID key
    const uuid = crypto.randomUUID();
    const extension = audioFile.name.split('.').pop() || 'wav';
    const objectKey = `${uuid}.${extension}`;

    const arrayBuffer = await audioFile.arrayBuffer();
    await c.env.AUDIO_BUCKET.put(objectKey, arrayBuffer, {
      httpMetadata: { contentType: audioFile.type },
    });

    // Proxy to Modal
    const modalFormData = new FormData();
    modalFormData.append('audio', new Blob([arrayBuffer], { type: audioFile.type }), audioFile.name);

    const modalResponse = await fetch(`${c.env.MODAL_URL}/api/analyze`, {
      method: 'POST',
      body: modalFormData,
    });

    if (!modalResponse.ok) {
      const errText = await modalResponse.text();
      throw new Error(`Modal backend error: ${modalResponse.status} ${errText}`);
    }

    const data = await modalResponse.json();
    return successResponse(c, data);
  } catch (e: any) {
    return errorResponse(c, e.message);
  }
});

app.get('/api/stream/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const modalResponse = await fetch(`${c.env.MODAL_URL}/api/stream/${jobId}`, {
      headers: {
        'Accept': 'text/event-stream'
      }
    });

    if (!modalResponse.ok) {
      const errText = await modalResponse.text();
      throw new Error(`Modal backend error: ${modalResponse.status} ${errText}`);
    }

    // Pipe response through with SSE headers
    return new Response(modalResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (e: any) {
    return errorResponse(c, e.message);
  }
});

app.get('/api/ema/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const modalResponse = await fetch(`${c.env.MODAL_URL}/api/ema/${jobId}`);

    if (!modalResponse.ok) {
      const errText = await modalResponse.text();
      throw new Error(`Modal backend error: ${modalResponse.status} ${errText}`);
    }

    const data = await modalResponse.json();
    // Modal might already return an ApiResponse shape or raw data, wrap it if not wrapped
    return successResponse(c, data);
  } catch (e: any) {
    return errorResponse(c, e.message);
  }
});

app.post('/api/generate-deepfake', async (c) => {
  try {
    const { text, voice } = await c.req.json();

    if (!text) {
      return errorResponse(c, 'Text is required', 400);
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voice || 'nova',
        response_format: 'wav',
        input: text
      })
    });

    if (!openAiResponse.ok) {
      const errText = await openAiResponse.text();
      throw new Error(`OpenAI error: ${openAiResponse.status} ${errText}`);
    }

    const audioBuffer = await openAiResponse.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
      }
    });
  } catch (e: any) {
    return errorResponse(c, e.message);
  }
});

app.get('/api/history', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM analyses ORDER BY created_at DESC LIMIT 50').all();
    return successResponse(c, results);
  } catch (e: any) {
    return errorResponse(c, e.message);
  }
});

app.post('/api/history', async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || crypto.randomUUID();
    
    await c.env.DB.prepare(`
      INSERT INTO analyses (
        id, filename, duration_s, verdict, confidence, 
        max_velocity, anomaly_frames, total_frames, processing_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.filename,
      body.duration_s,
      body.verdict,
      body.confidence,
      body.max_velocity,
      body.anomaly_frames,
      body.total_frames,
      body.processing_time_ms
    ).run();

    return successResponse(c, { id });
  } catch (e: any) {
    return errorResponse(c, e.message);
  }
});

export default app;