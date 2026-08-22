exports.handler = async function (event) {
  const API_KEY = process.env.API_FOOTBALL_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "API_FOOTBALL_KEY no está configurada"
      })
    };
  }

  const params = { ...(event.queryStringParameters || {}) };
  const endpoint = params.endpoint || "fixtures";
  delete params.endpoint;

  const allowed = {
    fixtures: ["id", "ids", "team", "last", "league", "season", "round"],
    "fixtures/rounds": ["league", "season", "current"],
    "fixtures/statistics": ["fixture"],
    predictions: ["fixture"],
    odds: ["fixture"]
  };
  if (!allowed[endpoint]) return response(400, { error: "Endpoint no permitido" });
  if (Object.keys(params).some((key) => !allowed[endpoint].includes(key))) return response(400, { error: "Parámetro no permitido" });
  const numericKeys = ["id", "team", "last", "league", "season", "fixture"];
  if (numericKeys.some((key) => params[key] != null && !/^\d+$/.test(String(params[key])))) return response(400, { error: "Parámetro numérico inválido" });
  if (params.ids && !/^\d+(?:-\d+){0,19}$/.test(String(params.ids))) return response(400, { error: "Lista de partidos inválida" });
  if (params.round && !/^[\p{L}\d ._-]{1,60}$/u.test(String(params.round))) return response(400, { error: "Jornada inválida" });
  if (params.last && Number(params.last) > 50) return response(400, { error: "Límite inválido" });
  if (params.league && ![2, 262].includes(Number(params.league))) return response(400, { error: "Liga no permitida" });

  const query = new URLSearchParams(params).toString();
  const url = `https://v3.football.api-sports.io/${endpoint}${query ? `?${query}` : ""}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        "x-apisports-key": API_KEY
      }
    });

    const data = await upstream.json();

    return response(upstream.status, data);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Error conectando con API-Football",
        message: error.message
      })
    };
  }
};

function response(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(payload)
  };
}
