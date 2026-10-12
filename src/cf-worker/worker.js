/* ============================================================================
 * Lia backend — Cloudflare Worker (пробная версия, v1)
 * ----------------------------------------------------------------------------
 * Что это: тонкая прослойка между игрой «Живая летопись» и Workers AI.
 * Игра шлёт сюда текст/картинки-запросы, воркер выполняет их через биндинг
 * env.AI (Workers AI) и возвращает результат. Оплата нейронов идёт на аккаунт
 * владельца воркера, в бесплатных пределах — 10 000 нейронов/день.
 *
 * Секретов в этом файле НЕТ и быть не должно: файл публичный (лежит в src/).
 * Единственная «защита» — опциональный общий ключ GAME_KEY, который хранится
 * в Cloudflare как Secret (Dashboard → Worker → Settings → Variables and
 * Secrets) и сверяется с заголовком X-Game-Key. Честное предупреждение:
 * ключ дублируется в коде игры, а код игры публичен, — это защита только от
 * случайных чужих запросов, не от взлома. Настоящая авторизация (проверка
 * Telegram initData) — следующим шагом, когда переезжаем в Telegram.
 *
 * Контракт:
 *   GET  /health                       → {ok:true}
 *   POST /text  {instruction, startWith?} → {text}
 *   POST /image {prompt, negativePrompt?} → {dataUrl} (data:image/png;base64,…)
 * Ошибки: {error:"..."} + HTTP-код. CORS открыт (*) — игру хостит Perchance.
 * ========================================================================== */

var TEXT_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8"; // основной: лучший баланс русского/цены (проверен перебором 2026-10-12)
// Белый список текстовых моделей: клиент может попросить другую через body.model.
// Дешёвая по умолчанию, сильные — для сложных мест (завязка) или если 8b не тянет русский.
var TEXT_MODELS = {
  "llama-8b": "@cf/meta/llama-3.1-8b-instruct-fp8",
  "qwen3-30b": "@cf/qwen/qwen3-30b-a3b-fp8",
  "gemma-4-26b": "@cf/google/gemma-4-26b-a4b-it",
  "llama-70b": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
};
var IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Game-Key",
  "Access-Control-Max-Age": "86400",
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, CORS),
  });
}

async function readJson(req) {
  try { return await req.json(); }
  catch (e) { return {}; }
}

// btoa() падает на больших массивах разом — кодируем кусками.
function bytesToB64(bytes) {
  var CH = 0x8000, out = "";
  for (var i = 0; i < bytes.length; i += CH) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(out);
}

// Workers AI отдаёт картинку байтами в разных обёртках — приводим к Uint8Array.
async function imageToBytes(img) {
  if (img && typeof img === "object" && !(img instanceof Uint8Array) && !(img instanceof ArrayBuffer) && !(img instanceof ReadableStream)) {
    // FLUX-обёртка: {image: <base64|bytes>, usage: {...}} — распаковываем и обрабатываем дальше
    if (img.image != null) return imageToBytes(img.image);
    if (img.data != null) return imageToBytes(img.data);
  }
  if (typeof img === "string") {
    // некоторые модели отдают готовый base64 или data URL строкой
    var s = img;
    if (s.indexOf("data:") === 0) s = s.slice(s.indexOf(",") + 1);
    var bin = atob(s), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  if (img instanceof Uint8Array) return img;
  if (img instanceof ArrayBuffer) return new Uint8Array(img);
  if (img && typeof img === "object" && img.buffer instanceof ArrayBuffer) {
    return new Uint8Array(img.buffer, img.byteOffset || 0, img.byteLength);
  }
  if (img instanceof ReadableStream) {
    return new Uint8Array(await new Response(img).arrayBuffer());
  }
  throw new Error("unexpected image payload (" + describePayload(img) + ")");
}

// Неизвестный формат картинки — описываем (тип/ключи/размер), чтобы было видно в ошибке.
function describePayload(v){
  try{
    if(v == null) return String(v);
    if(typeof v === "string") return "string len=" + v.length + " head=" + v.slice(0, 30);
    if(v instanceof Uint8Array) return "Uint8Array len=" + v.length;
    if(v instanceof ArrayBuffer) return "ArrayBuffer len=" + v.byteLength;
    if(v instanceof ReadableStream) return "ReadableStream";
    if(Array.isArray(v)) return "Array len=" + v.length;
    if(typeof v === "object") return "object keys=[" + Object.keys(v).slice(0, 10).join(",") + "]";
    return typeof v;
  }catch(dErr){ return "undescribable"; }
}

// Ответ Workers AI бывает строкой, а у reasoning-моделей — объектом
// (отдельно ход мыслей, отдельно текст). Вытаскиваем именно текст ответа.
function normText(out){
  if (!out) return "";
  var r = out.response != null ? out.response : out;
  if (typeof r === "string") return r;
  if (r && typeof r === "object") {
    if (typeof r.content === "string" && r.content) return r.content;
    if (typeof r.text === "string" && r.text) return r.text;
    if (typeof r.response === "string" && r.response) return r.response;
    if (typeof r.message === "string" && r.message) return r.message;
    try { return JSON.stringify(r).slice(0, 12000); }
    catch (jErr) { return ""; }
  }
  return String(r == null ? "" : r);
}

export default {
  async fetch(req, env) {
    var url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, backend: "lia-cf-v6" });
    }

    // Общий ключ: проверяем, только если задан в Secrets. Не задан — пускаем всех.
    if (env.GAME_KEY) {
      if (req.headers.get("X-Game-Key") !== env.GAME_KEY) {
        return json({ error: "bad key" }, 401);
      }
    }

    if (req.method === "POST" && url.pathname === "/text") {
      var tb = await readJson(req);
      var instruction = String(tb.instruction || "").slice(0, 12000);
      if (!instruction) return json({ error: "empty instruction" }, 400);
      if (!env.AI) return json({ error: "AI binding missing: привяжите Workers AI с именем AI" }, 500);
      var model = TEXT_MODELS[String(tb.model || "")] || TEXT_MODEL;
      try {
        var out = await env.AI.run(model, {
          messages: [
            { role: "system", content: "Выполняй инструкцию пользователя точно. Если просят JSON — отвечай только JSON." },
            { role: "user", content: instruction },
          ],
        });
      } catch (aiErr) {
        return json({ error: "AI failed: " + String((aiErr && aiErr.message) || aiErr) }, 502);
      }
      var text = normText(out);
      return json({ text: text, model: model });
    }

    if (req.method === "POST" && url.pathname === "/image") {
      var ib = await readJson(req);
      var prompt = String(ib.prompt || "").slice(0, 1000);
      if (!prompt) return json({ error: "empty prompt" }, 400);
      if (!env.AI) return json({ error: "AI binding missing: привяжите Workers AI с именем AI" }, 500);
      // NOTE: negativePrompt намеренно не передаём — schnell его не понимает;
      // запреты уже вшиты в сам промпт игры («no text, no watermark, …»).
      try {
        var img = await env.AI.run(IMAGE_MODEL, { prompt: prompt });
        var bytes = await imageToBytes(img);
      } catch (aiErr) {
        return json({ error: "AI failed: " + String((aiErr && aiErr.message) || aiErr) }, 502);
      }
      // модель отдаёт JPEG (сигнатура FF D8) — подписываем честный MIME-тип
      var mime = (bytes.length > 2 && bytes[0] === 0xFF && bytes[1] === 0xD8) ? "image/jpeg" : "image/png";
      return json({ dataUrl: "data:" + mime + ";base64," + bytesToB64(bytes) });
    }

    return json({ error: "not found" }, 404);
  },
};
