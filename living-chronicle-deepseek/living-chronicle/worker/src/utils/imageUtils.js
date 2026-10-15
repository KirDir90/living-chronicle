export function bytesToB64(bytes) {
  var CH = 0x8000, out = "";
  for (var i = 0; i < bytes.length; i += CH) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(out);
}

export async function imageToBytes(img) {
  if (img && typeof img === "object" && !(img instanceof Uint8Array) && !(img instanceof ArrayBuffer) && !(img instanceof ReadableStream)) {
    if (img.image != null) return imageToBytes(img.image);
    if (img.data != null) return imageToBytes(img.data);
  }
  if (typeof img === "string") {
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

export function describePayload(v) {
  try {
    if (v == null) return String(v);
    if (typeof v === "string") return "string len=" + v.length;
    if (v instanceof Uint8Array) return "Uint8Array len=" + v.length;
    if (v instanceof ArrayBuffer) return "ArrayBuffer len=" + v.byteLength;
    if (v instanceof ReadableStream) return "ReadableStream";
    if (Array.isArray(v)) return "Array len=" + v.length;
    if (typeof v === "object") return "object keys=[" + Object.keys(v).slice(0, 10).join(", ") + "]";
    return typeof v;
  } catch (dErr) { return "undescribable"; }
}
