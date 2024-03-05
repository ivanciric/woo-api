import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default async (req, res) => {
    if (req.method === 'POST') {
        try {
            const response = await openai.images.generate({
                prompt: req.body.description,
                size: '1024x1024',
                model: 'dall-e-3',
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