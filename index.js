import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from "openai";
import sharp from 'sharp';
import fetch from 'node-fetch';
import FormData from 'form-data';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const network = process.env.NETWORK;
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const nftContract = network == 'testnet' ? process.env.NFT_CONTRACT_TESTNET : process.env.NFT_CONTRACT_MAINNET;
const minter = network == 'testnet' ? process.env.MINTER_TESTNET : process.env.MINTER_MAINNET;
const mintbaseWalletUrl = network == 'testnet' ? process.env.MINTBASE_WALLET_TESTNET : process.env.MINTBASE_WALLET_MAINNET;

app.post('/get-image', async (req, res) => {
    return await openai.images.generate({ 
        prompt: req.body.description, 
        size: '1024x1024',
        model: 'dall-e-3',
        style: 'vivid',
        response_format: 'url'
     })
     .then((response) => {
        let image = response.data[0].url;
        res.json({ imageUrl: image });
     });

});

app.post('/mint', async (req, res) => {

    let imageUrl = req.body.imageUrl;
    let imageBase64 = await resizeImageFromUrlToBase64(imageUrl);
    let uploadResult = await uploadToArweave(imageBase64);
    let arweaveId = uploadResult.id;
    let name = req.body.name;
    let description = req.body.description;
    let redirectUrl = req.body.redirectUrl;
    
    let url = constructSignUrl(arweaveId, name, description, redirectUrl);

    res.json({ signUrl: url });
});

async function resizeImageFromUrlToBase64(imageUrl, width = 512) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
  
      const imageBuffer = await response.buffer();
  
      const resizedImageBuffer = await sharp(imageBuffer)
        .resize(width)
        .toBuffer();
  
      const resizedImageBase64 = resizedImageBuffer.toString('base64');

      return resizedImageBase64;

    } catch (error) {
      console.error('Error resizing image from URL:', error);
      throw error;
    }
}

async function uploadToArweave(base64Image) {
    const base64Data = base64Image.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');
    const formData = new FormData();
    formData.append('media', buffer, {
        filename: 'wooImage.png',
        contentType: 'image/png', 
    });

    try {
        const response = await fetch(process.env.ARWEAVE_UPLOAD_URL, {
          method: 'POST',
          body: formData,
          headers: {
            'Mb-Api-Key': process.env.ARWEAVE_UPLOAD_API_KEY,
            ...formData.getHeaders()
          }
        });
    
        if (!response.ok) {
          throw new Error(`Failed to upload image: ${response.statusText}`);
        }

        const result = await response.json();
        return result;

      } catch (error) {
        console.error('Error uploading image:', error.message);
      }
  }
  

function constructSignUrl(arweaveId, name, description, redirectUrl) {

    const transactionsData = [{
        receiverId: minter,
        signerId: "",
        actions: [{
        type: "FunctionCall",
        params: {
            methodName: "mint",
            args:
            {
                "metadata": `{"reference":"${arweaveId}", "title": "${name}", "description": "${description}"}`,
                "nft_contract_id": nftContract
            },
            gas: "200000000000000",
            deposit: "10000000000000000000000"
        }
        }]
    }];
    
    const callbackUrl = redirectUrl;
    const encodedTransactionsData = encodeURIComponent(JSON.stringify(transactionsData));
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    const mintbaseSignTransactionUrl = `${mintbaseWalletUrl}/sign-transaction?transactions_data=${encodedTransactionsData}&callback_url=${encodedCallbackUrl}`;
    
    return mintbaseSignTransactionUrl;
}

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
