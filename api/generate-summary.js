// This file acts as a secure proxy (a serverless function) to hide your Gemini API Key.
// It is set up for use with Vercel or Netlify functions.

// Define the official Gemini API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

export default async function handler(request, response) {
    // 1. Enforce POST Method (Fixes the 405 error)
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed. This endpoint only accepts POST requests.' });
    }

    try {
        // 2. Safely retrieve the API Key from the server's environment variables
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

        if (!GEMINI_API_KEY) {
            // Fails gracefully if the secret is not set up in the hosting environment
            return response.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY environment variable is missing.' });
        }

        // 3. Extract the prompt and system instructions sent from the calculator's front-end
        const { prompt, systemInstruction, model } = request.body;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
        };

        // 4. Call the official Gemini API, securely passing the key in the query parameter
        const apiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const apiResult = await apiResponse.json();

        if (apiResponse.ok) {
            // Extract the generated text
            const generatedText = apiResult.candidates?.[0]?.content?.parts?.[0]?.text;
            if (generatedText) {
                // 5. Send only the final summary back to the calculator (front-end)
                response.status(200).json({ summary: generatedText });
            } else {
                response.status(500).json({ error: 'Gemini API returned an empty or invalid response.' });
            }
        } else {
            // Forward any API errors back to the client for clear debugging
            response.status(apiResponse.status).json({ 
                error: `Gemini API call failed with status ${apiResponse.status}`,
                details: apiResult 
            });
        }
    } catch (error) {
        // Catch any network or parsing errors during proxy execution
        response.status(500).json({ error: 'Internal Server Error during proxy processing.', details: error.message });
    }
}
