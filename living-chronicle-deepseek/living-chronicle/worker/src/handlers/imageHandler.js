import { IMAGE_MODEL, CORS_HEADERS } from "../config.js";
import { imageToBytes, bytesToB64 } from "../utils/imageUtils.js";

export async function handleImage(req, env) {
  var body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  var prompt = String(body.prompt || "").slice(0, 1000);
  if (!prompt)
    return new Response(JSON.stringify({ error: "empty prompt" }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  if (!env.AI)
    return new Response(JSON.stringify({ error: "AI binding missing" }), {
      status: 500,
      headers: CORS_HEADERS,
    });

  try {
    var img = await env.AI.run(IMAGE_MODEL, {
      prompt: prompt,
      steps: 1, // минимум для Flux Schnell
    });
    var bytes = await imageToBytes(img);
    var mime =
      bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8
        ? "image/jpeg"
        : "image/png";
    return new Response(
      JSON.stringify({
        dataUrl: "data:" + mime + ";base64," + bytesToB64(bytes),
      }),
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (aiErr) {
    return new Response(
      JSON.stringify({
        error: "AI failed: " + String((aiErr && aiErr.message) || aiErr),
      }),
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
