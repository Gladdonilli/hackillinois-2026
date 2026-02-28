export interface Env {
  MODAL_URL: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    // 1. Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          ...CORS_HEADERS,
        },
      });
    }

    // 2. Define allowed proxy routes
    const isAllowedRoute = 
      url.pathname === "/api/generate" ||
      url.pathname === "/api/ablate" ||
      url.pathname === "/api/steer" ||
      /^\/api\/features\/[^/]+$/.test(url.pathname);

    if (!isAllowedRoute) {
      return this.errorResponse("Route not found", 404, origin);
    }

    // 3. Proxy to Modal
    try {
      const modalUrl = new URL(url.pathname, env.MODAL_URL);
      
      // Copy original search params
      url.searchParams.forEach((value, key) => {
        modalUrl.searchParams.append(key, value);
      });

      const proxyRequest = new Request(modalUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer(),
      });

      const response = await fetch(proxyRequest);
      
      // Clone response to add CORS headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("Access-Control-Allow-Origin", origin);
      Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
      });

      return newResponse;

    } catch (err: any) {
      return this.errorResponse(err.message || "Internal Proxy Error", 500, origin);
    }
  },

  errorResponse(message: string, status: number, origin: string): Response {
    const body: ApiResponse<null> = {
      success: false,
      error: message,
    };

    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
        ...CORS_HEADERS,
      },
    });
  },
};
