import { CORS_HEADERS } from "./config.js";
import { handleText } from "./handlers/textHandler.js";
import { handleImage } from "./handlers/imageHandler.js";
import { handleSummarize } from "./handlers/summarizeHandler.js";

export default {
  async fetch(req, env) {
    var url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return new Response(
        JSON.stringify({ ok: true, backend: "living-chronicle-v1" }),
        { status: 200, headers: CORS_HEADERS },
      );
    }

    if (env.GAME_KEY) {
      if (req.headers.get("X-Game-Key") !== env.GAME_KEY) {
        return new Response(JSON.stringify({ error: "bad key" }), {
          status: 401,
          headers: CORS_HEADERS,
        });
      }
    }

    if (req.method === "POST" && url.pathname === "/text") {
      return handleText(req, env);
    }

    if (req.method === "POST" && url.pathname === "/image") {
      return handleImage(req, env);
    }

    if (req.method === "POST" && url.pathname === "/summarize") {
      return handleSummarize(req, env);
    }

    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: CORS_HEADERS,
    });
  },
};
