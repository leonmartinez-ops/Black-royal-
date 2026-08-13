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

  const params = event.queryStringParameters || {};
  const endpoint = params.endpoint || "fixtures";

  delete params.endpoint;

  const query = new URLSearchParams(params).toString();
  const url = `https://v3.football.api-sports.io/${endpoint}${query ? `?${query}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: {
        "x-apisports-key": API_KEY
      }
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(data)
    };
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
