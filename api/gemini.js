export default async function handler(req, res) {

  const allowedOrigins = [
    "https://question-ai.vercel.app",
    "https://geleswarsa13-cpu.github.io"
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured"
    });
  }

  const models = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash"
  ];

  let lastStatus = 503;
  let lastData = null;

  for (const model of models) {

    try {

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },

          body: JSON.stringify(req.body)
        }
      );

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      }

      lastStatus = response.status;
      lastData = data;

      // Temporary overload/rate-limit par next model try karo
      if (
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503
      ) {

        await new Promise(resolve =>
          setTimeout(resolve, 800)
        );

        continue;
      }

      // Other errors par immediately return
      return res.status(response.status).json(data);

    } catch (error) {

      lastStatus = 503;
      lastData = {
        error: {
          message: "Gemini request failed"
        }
      };

      await new Promise(resolve =>
        setTimeout(resolve, 800)
      );
    }
  }

  return res.status(lastStatus).json({
    error: {
      message:
        "Gemini models are temporarily busy. Please try again.",
      details: lastData
    }
  });
}
