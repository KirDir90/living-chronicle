import { CORS_HEADERS, SYSTEM_PROMPT } from "../config.js";
import { normText } from "../utils/textUtils.js";

export async function handleText(req, env) {
  var body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  var messages = Array.isArray(body.messages) ? body.messages : [];
  var customInstruction = body.instruction
    ? String(body.instruction).slice(0, 2000)
    : "";
  var worldState = body.worldState
    ? String(body.worldState).slice(0, 4000)
    : "";
  var startSeed = body.startSeed ? String(body.startSeed).slice(0, 200) : "";
  var avoidPhrases = body.avoidPhrases
    ? String(body.avoidPhrases).slice(0, 1500)
    : "";
  var anchorSummary = body.anchorSummary
    ? String(body.anchorSummary).slice(0, 2500)
    : "";
  // max_tokens: 1200 по умолчанию (возвращено с 600)
  var maxTokens = typeof body.maxTokens === "number" ? body.maxTokens : 1200;
  if (maxTokens < 300) maxTokens = 300;
  if (maxTokens > 2500) maxTokens = 2500;

  if (messages.length === 0 && !customInstruction) {
    return new Response(
      JSON.stringify({ error: "empty messages and instruction" }),
      { status: 400, headers: CORS_HEADERS },
    );
  }

  var finalMessages = [{ role: "system", content: SYSTEM_PROMPT }];

  if (anchorSummary) {
    finalMessages.push({
      role: "system",
      content: "[АНКЕРНОЕ РЕЗЮМЕ — что произошло ранее]\n" + anchorSummary,
    });
  }
  if (startSeed) {
    finalMessages.push({
      role: "system",
      content: "[СТАРТОВЫЙ КЛЮЧ]\n" + startSeed,
    });
  }
  if (worldState) {
    finalMessages.push({
      role: "system",
      content: "[СИСТЕМНОЕ СОСТОЯНИЕ МИРА]\n" + worldState,
    });
  }
  if (avoidPhrases) {
    finalMessages.push({
      role: "system",
      content: "[НЕ ПОВТОРЯЙ ЭТИ ФРАЗЫ]\n" + avoidPhrases,
    });
  }
  if (messages.length > 0) {
    finalMessages = finalMessages.concat(messages);
  }
  if (customInstruction) {
    finalMessages.push({ role: "user", content: customInstruction });
  }

  if (!env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY not set" }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  try {
    var groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + env.GROQ_API_KEY,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: finalMessages,
          temperature: 0.9,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!groqRes.ok) {
      if (groqRes.status === 429) {
        var retryAfter = groqRes.headers.get("retry-after") || "8";
        return new Response(
          JSON.stringify({
            error: "RATE_LIMIT",
            retryAfter: parseInt(retryAfter),
            message: "Лимит токенов. Подождите " + retryAfter + " сек.",
          }),
          { status: 429, headers: CORS_HEADERS },
        );
      }

      var errText = await groqRes.text();
      return new Response(
        JSON.stringify({
          error: "Groq failed: " + groqRes.status + " " + errText,
        }),
        { status: 502, headers: CORS_HEADERS },
      );
    }

    var groqData = await groqRes.json();
    var text =
      groqData.choices && groqData.choices[0] && groqData.choices[0].message
        ? groqData.choices[0].message.content
        : "";

    // Записываем причину остановки — чтобы понять, обрыв это или нет
    var finishReason =
      groqData.choices &&
      groqData.choices[0] &&
      groqData.choices[0].finish_reason
        ? groqData.choices[0].finish_reason
        : "";

    text = String(text || "").trim();
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "");

    var firstBrace = text.indexOf("{");
    if (firstBrace > 0) text = text.slice(firstBrace);

    var lastBrace = text.lastIndexOf("}");
    if (lastBrace >= 0 && lastBrace < text.length - 1) {
      text = text.slice(0, lastBrace + 1);
    }

    // Пытаемся достроить обрыв: если JSON невалидный и finish_reason=length
    var parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      if (finishReason === "length") {
        // Достраиваем: закрываем строку, добавляем недостающие скобки
        var repaired = repairTruncatedJson(text);
        if (repaired) {
          text = repaired;
          try {
            parsed = JSON.parse(text);
          } catch (e2) {}
          console.warn("[GROQ] Repaired truncated JSON");
        }
      }
    }

    console.log(
      "[GROQ RAW]",
      "finish=" + finishReason,
      "len=" + text.length,
      text.slice(0, 200),
    );

    return new Response(
      JSON.stringify({
        text: text,
        model: "groq/openai/gpt-oss-120b",
        finishReason: finishReason,
      }),
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Groq error: " + String(err.message || err) }),
      { status: 502, headers: CORS_HEADERS },
    );
  }
}

// ============================================================
// Достройка обрезанного JSON
// ============================================================
function repairTruncatedJson(text) {
  if (!text) return null;
  var s = text.trim();
  if (!s.startsWith("{")) return null;

  // Считаем открытые и закрытые скобки, состояние строки
  var openBraces = 0;
  var openBrackets = 0;
  var inString = false;
  var lastValidIndex = -1;

  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    var prev = i > 0 ? s[i - 1] : "";

    if (ch === '"' && prev !== "\\") {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") openBraces++;
    else if (ch === "}") openBraces--;
    else if (ch === "[") openBrackets++;
    else if (ch === "]") openBrackets--;
    else if (ch === ":" || ch === ",") lastValidIndex = i;
    else if (/[a-zA-Zа-яА-Я0-9]/.test(ch)) lastValidIndex = i;
  }

  // Если внутри строки — закрываем её
  if (inString) s += '"';

  // Если обрезано на середине пары "key": — отрезаем до последней запятой
  var trimmed = s.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  if (trimmed !== s) s = trimmed;

  // Убираем висячие запятые
  s = s.replace(/,\s*$/, "");

  // Закрываем все открытые скобки
  while (openBrackets > 0) {
    s += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    s += "}";
    openBraces--;
  }

  // Чистим двойные запятые
  s = s.replace(/,\s*,/g, ",");
  s = s.replace(/,\s*([}\]])/g, "$1");

  return s;
}
