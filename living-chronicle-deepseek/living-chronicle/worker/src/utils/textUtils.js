export function normText(out) {
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
