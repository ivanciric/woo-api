import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();
const network = process.env.NETWORK;
const nftContract = network == 'testnet' ? process.env.NFT_CONTRACT_TESTNET : process.env.NFT_CONTRACT_MAINNET;
const mintbaseBaseUrl = network == 'testnet' ? process.env.MINTBASE_BASE_URL_TESTNET : process.env.MINTBASE_BASE_URL_MAINNET;
const graphqlIndexer = network == 'testnet' ? process.env.MINTBASE_INDEXER_TESTNET : process.env.MINTBASE_INDEXER_MAINNET;

export default async (req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            let { tokenId } = req.body;
            let metadata = await getMetadataIdFromTokenId(tokenId); 
            console.log(metadata.data.nft_tokens[0].metadata_id)
            let metadataId = metadata.data.nft_tokens[0].metadata_id;
            let url = `${mintbaseBaseUrl}/meta/${metadataId}`;
            res.status(200).json({ nftUrl: encodeURIComponent(url) });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error in minting process' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

async function getMetadataIdFromTokenId(tokenId) {
    try {
        const response = await fetch(graphqlIndexer, {
          method: 'POST',
          body: JSON.stringify({
            query: `query MyQuery { 
              nft_tokens(where: {token_id: {_eq: "28"}, nft_contract_id: {_eq: "woonft.mintspace2.testnet"}}) {
                metadata_id 
              } 
            }`
          }),
          headers: {
            'Mb-Api-Key': process.env.MINTBASE_GRAPHQL_API_KEY,
          }
        });
    
        if (!response.ok) {
          throw new Error(`Failed to get token data: ${response.statusText}`);
        }

        const result = await response.json();
        return result;

      } catch (error) {
        console.error('Error getting token data:', error.message);
      }
  }
  
function constructNftUrl(metadataId) {

    const nftUrl = `${mintbaseBaseUrl}/meta/${nftContract}%3A${metadataId}`;
    
    return nftUrl;
}
