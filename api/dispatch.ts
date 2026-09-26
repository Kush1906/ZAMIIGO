// Vercel Serverless Function: /api/dispatch
// Keeps the HACKATHON_API_KEY secure on the server side

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.HACKATHON_API_KEY;
  const apiUrl = process.env.HACKATHON_API_URL || 'https://hackathon-api-new-152590733511.northamerica-northeast2.run.app/api/generate';

  if (!apiKey) {
    return res.status(500).json({ error: 'Server environment variable HACKATHON_API_KEY is not set.' });
  }

  try {
    const { contents, model, response_schema } = req.body || {};

    if (!contents) {
      return res.status(400).json({ error: 'Missing required field: contents' });
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        model: model || 'gemini-3-flash-preview',
        ...(response_schema ? { response_schema } : {})
      }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Server error proxying to Gemini' });
  }
}
