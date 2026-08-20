/* ------------------------------------------------------------------ */
/*  BeeSearch proxy — server-side bridge to the standalone discovery    */
/*  engine (still called "bee23" on its own end).                       */
/*                                                                      */
/*  Keeps BEE23_API_TOKEN out of the browser bundle. The client (see    */
/*  src/lib/beesearchEngine.ts) POSTs an { action, ... } body here;     */
/*  this function maps that to one specific engine endpoint from a      */
/*  fixed whitelist — it is not a general-purpose proxy, so a           */
/*  compromised frontend can't be redirected to call arbitrary paths    */
/*  on the engine.                                                      */
/* ------------------------------------------------------------------ */

interface ProxyRequest {
  action: string;
  [key: string]: unknown;
}

function engineConfig(): { baseUrl: string; token: string } | null {
  const baseUrl = process.env.BEE23_ENGINE_URL?.replace(/\/$/, "");
  const token = process.env.BEE23_API_TOKEN;
  if (!baseUrl || !token) return null;
  return { baseUrl, token };
}

async function callEngine(
  baseUrl: string,
  token: string,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
}

/** One entry per action: how to turn the request body into an engine call. */
function resolveEngineCall(
  req: ProxyRequest,
): { path: string; method?: string; body?: unknown } | { error: string } {
  switch (req.action) {
    case "status":
      // Cheap, cache-friendly probe: no admin scope, cannot mutate anything.
      return { path: "/api/stockists/count" };

    case "list-stockists":
      return { path: "/api/stockists" };

    case "add-stockist": {
      const businessName = typeof req.businessName === "string" ? req.businessName.trim() : "";
      if (!businessName) return { error: "businessName is required" };
      return {
        path: "/api/stockists",
        method: "POST",
        body: {
          businessName,
          websiteUrl: typeof req.websiteUrl === "string" ? req.websiteUrl : undefined,
          location: typeof req.location === "string" ? req.location : undefined,
          category: typeof req.category === "string" ? req.category : undefined,
        },
      };
    }

    case "remove-stockist": {
      const id = Number(req.id);
      if (!Number.isFinite(id)) return { error: "id must be a number" };
      return { path: `/api/stockists/${id}`, method: "DELETE" };
    }

    case "run-discovery":
      return {
        path: "/api/discovery/generate",
        method: "POST",
        body: { customPrompt: typeof req.customPrompt === "string" ? req.customPrompt : "" },
      };

    case "list-discovery":
      return { path: "/api/discovery" };

    case "add-suggestion": {
      const id = Number(req.id);
      if (!Number.isFinite(id)) return { error: "id must be a number" };
      return { path: `/api/discovery/${id}/add`, method: "POST" };
    }

    case "get-account": {
      const id = Number(req.id);
      if (!Number.isFinite(id)) return { error: "id must be a number" };
      return { path: `/api/accounts/${id}` };
    }

    case "generate-pitch": {
      const id = Number(req.id);
      if (!Number.isFinite(id)) return { error: "id must be a number" };
      return { path: `/api/accounts/${id}/generate-pitch`, method: "POST" };
    }

    default:
      return { error: `Unknown action: ${req.action}` };
  }
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const config = engineConfig();
  if (!config) {
    return new Response(
      JSON.stringify({ error: "BeeSearch is not configured", configured: false }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: ProxyRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resolved = resolveEngineCall(body);
  if ("error" in resolved) {
    return new Response(JSON.stringify({ error: resolved.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const engineRes = await callEngine(config.baseUrl, config.token, resolved.path, {
      method: resolved.method,
      body: resolved.body,
    });

    // 204/205/304 are null-body statuses — the Response constructor throws if
    // given a body (even "") alongside one. The delete-stockist route returns
    // a bare 204, so this isn't a hypothetical.
    if (engineRes.status === 204 || engineRes.status === 205 || engineRes.status === 304) {
      return new Response(null, { status: engineRes.status });
    }

    const text = await engineRes.text();
    return new Response(text, {
      status: engineRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "BeeSearch is unreachable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
};
