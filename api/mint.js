import dotenv from 'dotenv';
import fetch from 'node-fetch';
import FormData from 'form-data';
import sharp from 'sharp';

dotenv.config();
const network = process.env.NETWORK;
const nftContract = network == 'testnet' ? process.env.NFT_CONTRACT_TESTNET : process.env.NFT_CONTRACT_MAINNET;
const minter = network == 'testnet' ? process.env.MINTER_TESTNET : process.env.MINTER_MAINNET;
const mintbaseWalletUrl = network == 'testnet' ? process.env.MINTBASE_WALLET_TESTNET : process.env.MINTBASE_WALLET_MAINNET;

export default async (req, res) => {
    if (req.method === 'POST') {
        try {
            let { imageUrl, name, description, redirectUrl } = req.body;
            let imageBase64 = await resizeImageFromUrlToBase64(imageUrl);
            let uploadResult = await uploadToArweave(imageBase64); 
            let arweaveId = uploadResult.id;
            let url = constructSignUrl(arweaveId, name, description, redirectUrl); 
            res.status(200).json({ signUrl: url });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error in minting process' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

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
