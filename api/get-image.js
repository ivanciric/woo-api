import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const config = {
    runtime: 'experimental-edge',
};

export default async (request) => {
    // Preflight request handling for CORS
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    if (request.method === 'POST') {
        try {
            const reqBody = await request.json();
            const response = await openai.images.generate({
                prompt: reqBody.description,
                size: process.env.OPENAI_IMAGE_SIZE,
                model: process.env.OPENAI_IMAGE_MODEL,
                style: 'vivid',
                response_format: 'url'
            });

            let image = response.data[0].url;

            if (reqBody.width) {
                image = await resizeImageFromUrlToBase64(image, reqBody.width);
            } else {
                let resizedImage = await resizeImageFromUrlToBase64(image);
            };
            
            return new Response(JSON.stringify({ imageUrl: resizedImage }), {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            console.error(error);
            return new Response(JSON.stringify({ error: 'Error generating image' }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
    } else {
        return new Response(`Method ${request.method} Not Allowed`, {
            status: 405,
            headers: {
                'Allow': ['POST'],
            },
        });
    }
};


async function resizeImageFromUrlToBase64(imageUrl, width = 512) {
    try {
        // Construct the payload for the resize-image endpoint
        const payload = {
            imageUrl: imageUrl,
            width: width
        };
    
        // Call the resize-image endpoint
        const resizeResponse = await fetch('https://woonft-api.yoshi.tech/api/resize-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
    
        if (!resizeResponse.ok) throw new Error('Failed to resize image');
    
        const { base64Image } = await resizeResponse.json();
        return base64Image;
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error in minting process' });
    }
}