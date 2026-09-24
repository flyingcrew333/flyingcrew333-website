// Returns aggregated visit counts for the last 30 days. Requires a logged-in
// Netlify Identity user (the same login used for /admin/) — no separate
// account, and no personal data is stored or returned, only path counters.
const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Bitte einloggen." }) };
  }

  const store = getStore("site-stats");
  const { blobs } = await store.list({ prefix: "day-" });
  const recentKeys = blobs.map((b) => b.key).sort().slice(-30);

  const days = [];
  const totals = {};

  for (const key of recentKeys) {
    const data = await store.get(key, { type: "json" });
    if (!data) continue;
    let dayTotal = 0;
    for (const [path, count] of Object.entries(data)) {
      dayTotal += count;
      totals[path] = (totals[path] || 0) + count;
    }
    days.push({ day: key.replace("day-", ""), total: dayTotal });
  }

  const topPages = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, count]) => ({ path, count }));

  const grandTotal = days.reduce((sum, d) => sum + d.total, 0);

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ days, topPages, grandTotal }),
  };
};
