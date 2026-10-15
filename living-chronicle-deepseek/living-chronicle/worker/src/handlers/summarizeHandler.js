import { CORS_HEADERS } from "../config.js";

const SUMMARIZE_MODEL = "openai/gpt-oss-20b";

const SUMMARY_SYSTEM_PROMPT = `Ты — сжиматель истории для текстовой RPG. Твоя задача — превратить длинный фрагмент игры в краткое резюме, сохранив только самое важное.

Сохраняй:
- Имена и роли значимых NPC (кто друг, кто враг, кто нейтрал)
- Принятые игроком решения и их последствия
- Изменения в инвентаре, здоровье, деньгах, статусах
- Текущее местоположение героя и его цель
- Обещания, долги, тайны, найденные зацепки
- Смены глав

Не сохраняй:
- Поэтические описания природы, погоды, ощущений
- Дословные реплики (кроме коротких ключевых фраз)
- Повторяющиеся действия
- Атмосферные детали, которые не влияют на сюжет

Формат ответа — СТРОГО JSON:
{"summary": "..."}

В поле "summary" — связный текст 3-6 предложений. Пиши как хронику: сухо, по фактам, без метафор.`;

export async function handleSummarize(req, env) {
  var body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  var fragment = body.fragment ? String(body.fragment).slice(0, 8000) : "";
  var previousSummary = body.previousSummary
    ? String(body.previousSummary).slice(0, 2000)
    : "";

  if (!fragment) {
    return new Response(JSON.stringify({ error: "empty fragment" }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  if (!env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY not set" }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  var userContent = "";
  if (previousSummary) {
    userContent += "Предыдущее резюме:\n" + previousSummary + "\n\n";
  }
  userContent += "Фрагмент истории для сжатия:\n" + fragment;

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
          model: SUMMARIZE_MODEL,
          messages: [
            { role: "system", content: SUMMARY_SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!groqRes.ok) {
      if (groqRes.status === 429) {
        var retryAfter = groqRes.headers.get("retry-after") || "5";
        return new Response(
          JSON.stringify({
            error: "RATE_LIMIT",
            retryAfter: parseInt(retryAfter),
          }),
          { status: 429, headers: CORS_HEADERS },
        );
      }
      var errText = await groqRes.text();
      return new Response(
        JSON.stringify({
          error: "Summarize failed: " + groqRes.status + " " + errText,
        }),
        { status: 502, headers: CORS_HEADERS },
      );
    }

    var groqData = await groqRes.json();
    var raw =
      groqData.choices && groqData.choices[0] && groqData.choices[0].message
        ? groqData.choices[0].message.content
        : "";

    raw = String(raw || "").trim();
    raw = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "");

    var summary = "";
    try {
      var parsed = JSON.parse(raw);
      summary = parsed.summary || "";
    } catch (e) {
      summary = raw;
    }

    return new Response(
      JSON.stringify({ summary: summary, model: SUMMARIZE_MODEL }),
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Summarize error: " + String(err.message || err),
      }),
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
