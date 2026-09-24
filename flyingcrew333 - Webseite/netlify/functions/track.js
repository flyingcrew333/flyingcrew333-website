// Records one anonymous page view: no IP, no user agent, no cookies —
// just "this path was viewed today", counted once per day per path.
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let path = "/";
  try {
    const body = JSON.parse(event.body || "{}");
    if (typeof body.path === "string" && body.path.length > 0 && body.path.length < 200) {
      path = body.path;
    }
  } catch (e) {
    // ignore malformed payloads, fall back to "/"
  }

  const day = new Date().toISOString().slice(0, 10);
  const key = `day-${day}`;
  const store = getStore("site-stats");

  const data = (await store.get(key, { type: "json" })) || {};
  data[path] = (data[path] || 0) + 1;
  await store.setJSON(key, data);

  return { statusCode: 204, body: "" };
};
