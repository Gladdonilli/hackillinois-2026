import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  MODAL_URL: string;
};

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function err(message: string): ApiResponse<null> {
  return { success: false, error: message };
}

const app = new Hono<{ Bindings: Bindings }>();

// CORS
app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.endsWith('.pages.dev') ||
        origin.endsWith('.workers.dev')
      ) {
        return origin;
      }
      return '*';
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// Health
app.get('/health', (c) => c.json(ok({ status: 'ok' })));

// Proxy helper
async function proxyToModal(
  c: { env: Bindings; req: { raw: Request } },
  path: string,
  method: string = 'POST'
): Promise<Response> {
  const modalUrl = new URL(path, c.env.MODAL_URL);
  const body =
    method === 'GET' || method === 'HEAD'
      ? null
      : await c.req.raw.arrayBuffer();

  const response = await fetch(modalUrl.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
    },
  });
}

// POST /api/generate — proxy to Modal
app.post('/api/generate', async (c) => {
  try {
    return await proxyToModal(c, '/api/generate');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Proxy error';
    return c.json(err(msg), 502);
  }
});

// POST /api/features/:jobId — proxy to Modal
app.post('/api/features/:jobId', async (c) => {
  try {
    return await proxyToModal(c, `/api/features/${c.req.param('jobId')}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Proxy error';
    return c.json(err(msg), 502);
  }
});

// POST /api/ablate — proxy to Modal
app.post('/api/ablate', async (c) => {
  try {
    return await proxyToModal(c, '/api/ablate');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Proxy error';
    return c.json(err(msg), 502);
  }
});

// POST /api/steer — proxy to Modal
app.post('/api/steer', async (c) => {
  try {
    return await proxyToModal(c, '/api/steer');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Proxy error';
    return c.json(err(msg), 502);
  }
});

// POST /api/clamp — NEW: Feature clamping endpoint (Golden Gate method)
app.post('/api/clamp', async (c) => {
  try {
    return await proxyToModal(c, '/api/clamp');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Proxy error';
    return c.json(err(msg), 502);
  }
});

// GET /api/history — fetch surgery history from D1
app.get('/api/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM surgeries ORDER BY created_at DESC LIMIT ?'
    )
      .bind(limit)
      .all();
    return c.json(ok(results));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error';
    return c.json(err(msg), 500);
  }
});

// POST /api/history — save surgery result to D1
app.post('/api/history', async (c) => {
  try {
    const body = await c.req.json<{
      id: string;
      prompt: string;
      feature_id?: string;
      feature_label?: string;
      intervention_type: string;
      strength?: number;
      layer?: number;
      original_response?: string;
      steered_response?: string;
      semantic_distance?: number;
      generation_time_ms?: number;
    }>();

    await c.env.DB.prepare(
      `INSERT INTO surgeries (id, prompt, feature_id, feature_label, intervention_type, strength, layer, original_response, steered_response, semantic_distance, generation_time_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        body.id,
        body.prompt,
        body.feature_id || null,
        body.feature_label || null,
        body.intervention_type,
        body.strength || null,
        body.layer || null,
        body.original_response || null,
        body.steered_response || null,
        body.semantic_distance || null,
        body.generation_time_ms || null
      )
      .run();

    return c.json(ok({ id: body.id }), 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB insert error';
    return c.json(err(msg), 500);
  }
});

// 404 fallback
app.notFound((c) => c.json(err('Route not found'), 404));

// Error handler
app.onError((e, c) => {
  console.error('Worker error:', e);
  return c.json(err(e.message || 'Internal error'), 500);
});

export default app;
