import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const maxDuration = 25;
export default async (req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            const response = await openai.images.generate({
                prompt: req.body.description,
                size: process.env.OPENAI_IMAGE_SIZE,
                model: process.env.OPENAI_IMAGE_MODEL,
                style: 'vivid',
                response_format: 'url'
            });

            let image = response.data[0].url;
            res.json({ imageUrl: image });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error generating image' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
