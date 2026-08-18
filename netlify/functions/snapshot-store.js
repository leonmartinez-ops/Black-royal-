const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

const reply = (statusCode, data) => ({ statusCode, headers, body: JSON.stringify(data) });
const validRound = (value) => /^Apertura\s*-\s*\d+$/i.test(String(value || ""));
const validFixture = (value) => /^\d{5,12}$/.test(String(value || ""));

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return reply(204, {});
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: "black-royal-pregame", consistency: "strong" });

  try {
    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};
      if (!validRound(params.round)) return reply(400, { error: "Jornada inválida" });
      const prefix = `${params.round}/`;
      const result = await store.list({ prefix });
      const entries = await Promise.all((result.blobs || []).map(async ({ key }) => {
        const value = await store.get(key, { type: "json", consistency: "strong" });
        return value;
      }));
      return reply(200, { round: params.round, entries: entries.filter(Boolean) });
    }

    if (event.httpMethod !== "POST") return reply(405, { error: "Método no permitido" });
    if ((event.body || "").length > 220000) return reply(413, { error: "Snapshot demasiado grande" });
    const body = JSON.parse(event.body || "{}");
    if (!validRound(body.round) || !validFixture(body.fixtureId) || !body.snapshot || typeof body.snapshot !== "object") {
      return reply(400, { error: "Snapshot inválido" });
    }
    const kickoff = new Date(body.fixtureDate).getTime();
    if (!Number.isFinite(kickoff)) return reply(400, { error: "Fecha de partido inválida" });
    if (Date.now() >= kickoff) return reply(409, { error: "El snapshot prepartido ya no puede guardarse después del inicio" });
    const key = `${body.round}/${body.fixtureId}`;
    const existing = await store.get(key, { type: "json", consistency: "strong" });
    if (existing) return reply(200, { stored: false, immutable: true, entry: existing });
    const entry = {
      fixtureId: String(body.fixtureId),
      round: body.round,
      fixtureDate: body.fixtureDate,
      savedAt: body.snapshot.savedAt || new Date().toISOString(),
      snapshot: body.snapshot
    };
    await store.setJSON(key, entry);
    return reply(201, { stored: true, immutable: true, entry });
  } catch (error) {
    return reply(500, { error: "No se pudo acceder al registro de snapshots", message: error.message });
  }
};
