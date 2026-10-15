const WORKER_URL = "https://living-chronicle-backend.karimdurik2.workers.dev";

async function sendTextRequest(
  messages,
  instruction,
  worldState,
  model,
  startSeed,
  avoidPhrases,
  anchorSummary,
  maxTokens,
) {
  if (model === undefined) model = "openai/gpt-oss-120b";
  const payload = { messages: messages || [], model: model };
  if (instruction) payload.instruction = instruction;
  if (worldState) payload.worldState = worldState;
  if (startSeed) payload.startSeed = startSeed;
  if (avoidPhrases) payload.avoidPhrases = avoidPhrases;
  if (anchorSummary) payload.anchorSummary = anchorSummary;
  if (typeof maxTokens === "number") payload.maxTokens = maxTokens;

  const response = await fetch(WORKER_URL + "/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    let data = {};
    try {
      data = await response.json();
    } catch (e) {}
    const err = new Error(data.message || "Лимит токенов");
    err.code = "RATE_LIMIT";
    err.retryAfter = data.retryAfter || 8;
    throw err;
  }

  if (!response.ok) {
    throw new Error("HTTP error! status: " + response.status);
  }
  return await response.json();
}

async function sendImageRequest(prompt) {
  try {
    const response = await fetch(WORKER_URL + "/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt }),
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch (e) {}
      const isLimit = /neuron|allocation|quota|limit|4006|rate/i.test(
        errorBody,
      );
      const err = new Error(isLimit ? "IMAGE_LIMIT" : "IMAGE_ERROR");
      err.code = isLimit ? "IMAGE_LIMIT" : "IMAGE_ERROR";
      err.status = response.status;
      err.body = errorBody;
      throw err;
    }

    return await response.json();
  } catch (networkErr) {
    if (networkErr.code) throw networkErr;
    const err = new Error("IMAGE_ERROR");
    err.code = "IMAGE_ERROR";
    throw err;
  }
}

async function sendSummarizeRequest(fragment, previousSummary) {
  const payload = { fragment: fragment || "" };
  if (previousSummary) payload.previousSummary = previousSummary;

  const response = await fetch(WORKER_URL + "/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    let data = {};
    try {
      data = await response.json();
    } catch (e) {}
    const err = new Error("Summarize rate limit");
    err.code = "RATE_LIMIT";
    err.retryAfter = data.retryAfter || 5;
    throw err;
  }

  if (!response.ok) {
    throw new Error("Summarize HTTP error! status: " + response.status);
  }
  return await response.json();
}
