import express from 'express';
import { NFTStorage, File } from 'nft.storage';
import * as nearAPI from 'near-api-js';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from '@mintbase-js/sdk';
import { v4 as uuidv4 } from 'uuid';

const mbjs = pkg.mbjs;
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const { connect, keyStores, KeyPair, utils, WalletConnection, Contract } = nearAPI;
const network = process.env.NETWORK;

const nearConfig = {
    networkId: network,
    keyStore: new keyStores.InMemoryKeyStore(),
    nodeUrl: network === "mainnet" ? "https://rpc.mainnet.near.org" : "https://rpc.testnet.near.org",
    walletUrl: network === "mainnet" ? "https://wallet.near.org" : "https://wallet.testnet.near.org",
    helperUrl: network === "mainnet" ? "https://helper.mainnet.near.org" : "https://helper.testnet.near.org",
    explorerUrl: network === "mainnet" ? "https://explorer.mainnet.near.org" : "https://explorer.testnet.near.org",
};

const privateKey = process.env.NEAR_PRIVATE_KEY;
const keyPair = KeyPair.fromString(privateKey);
await nearConfig.keyStore.setKey(nearConfig.networkId, process.env.NEAR_ACCOUNT_ID, keyPair);

const mintbaseConfig = {
    network: network,
    callbackUrl: process.env.MINTBASE_CALLBACK_URL,
    contractAddress: process.env.MINTER_CONTRACT,
    apiKey: process.env.MINTBASE_API_KEY,
}
mbjs.config(mintbaseConfig)


app.get('/create-nft', async (req, res) => {

    let url = constructSignUrl();

    res.json({ message: 'Sign URL:', data: url });

    // const { image, name, description, email, existingAccountId } = req.body;

    // if (!image || !name || !description || !email) {
    //     return res.status(400).send({ error: 'Missing required fields' });
    // }

    // try {
    //     // create new account
    //     let accountId;
    //     let newAccountId = generateRandomAccountId();
    //     let accountName;

    //     if (existingAccountId) {
    //         const accountExists = await checkAccountExists(existingAccountId); 
    //         if (!accountExists) {
    //             accountId = await createNewAccount(newAccountId, '0');
    //             accountName = accountId.accountId;
    //         } else {
    //             accountId, accountName = existingAccountId;
    //         }
    //     } else {
    //         accountId = await createNewAccount(newAccountId, '0');
    //         accountName = accountId.accountId;
    //     }

    //     //res.json({ message: `Account ${accountName}:`, data: accountId });

    //     // upload image to NFT.Storage
    //     const imageUrl = await uploadToNFTStorage(image, name, description);

    //     // mint nft on mintbase
    //     const TokenMetadata = {
    //         title: name,
    //         description: description,
    //         media: imageUrl,
    //         referencce: imageUrl,
    //       }

    //       await execute(
    //         mint({ contractAddress: contractAddress, metadata: { media, reference }, ownerId: 'yoshi-tech.testnet' })
    //       );
          
    //     //res.json({ message: 'Account created', data: accountId });
    //     //res.json({ message: 'NFT created and email sent', data: imageUrl });
    // } catch (error) {
    //     console.error('Error creating NFT:', error);
    //     res.status(500).send('Failed to create NFT');
    // }
});

async function uploadToNFTStorage(imageBase64, name, description) {
    const client = new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY });
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });
   
    // Upload to NFT.Storage
    const metadata = await client.store({
        name,
        description,
        image: imageFile,
    });

    let url = 'https://' + metadata.ipnft + '.ipfs.nftstorage.link';
    return url;
}

async function createNewAccount(newAccountId, initialBalance) {
    const near = await connect(nearConfig);
    const creatorAccount = await near.account(process.env.NEAR_ACCOUNT_ID);

    const newKeyPair = KeyPair.fromRandom('ed25519');

    await creatorAccount.createAccount(
        newAccountId, 
        newKeyPair.publicKey, 
        utils.format.parseNearAmount(initialBalance.toString())
    );

    console.log(`New account ${newAccountId} created with public key ${newKeyPair.publicKey.toString()} and private key: ${newKeyPair.secretKey}`);

    return {
        accountId: newAccountId,
        publicKey: newKeyPair.publicKey.toString(),
        privateKey: newKeyPair.secretKey,
    };
}

async function checkAccountExists(accountId) {
    try {
        const near = await connect(nearConfig);
        const account = await near.account(accountId); // Correct usage
        await account.state();
  
        return true;
    } catch (error) {
        return false;
    }
}

function generateRandomAccountId(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let accountId = '';
    for (let i = 0; i < length; i++) {
        accountId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (process.env.NETWORK === 'mainnet') {
        accountId += '.yoshi-tech.near';
    } else {
        accountId += '.hamato.testnet';
    }

    return accountId;
}

// Function to mint an NFT
async function mintNFT(metadata, receiverId) {
  const { wallet } = await connect(nearConfig);
  
  const contract = new Contract(wallet.account(), process.env.MINTER_CONTRACT, {
    viewMethods: [],
    changeMethods: ['nft_mint'],
  });

  await contract.nft_mint({
    args: {
      token_id: 'UNIQUE_TOKEN_ID', // Ensure you use a unique ID for each token
      metadata: metadata,
      receiver_id: receiverId,
    },
    amount: 'MINTING_FEE_IF_REQUIRED', // Some contracts require a fee to mint
    gas: 'GAS_AMOUNT', // Specify the gas amount
  });
}


function constructSignUrl() {

    const transactionsData = [{
        receiverId: "0.minsta.proxy.mintbase.xyz",
        signerId: "",
        actions: [{
        type: "FunctionCall",
        params: {
            methodName: "mint",
            args:
            {
                "metadata": "{\"reference\":\"_HNz4mDlD5lpeyeCrAetCra4S-QQE5BuPv_Z4O56qJU\"}",
                "nft_contract_id": "moments.mintbase1.near"
            },
            gas: "0",
            deposit: "0"
        }
        }]
    }];
    
    const callbackUrl = "https://minsta-clone.vercel.app";
    
    const encodedTransactionsData = encodeURIComponent(JSON.stringify(transactionsData));
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    
    const mintbaseSignTransactionUrl = `https://wallet.mintbase.xyz/sign-transaction?transactions_data=${encodedTransactionsData}&callback_url=${encodedCallbackUrl}`;
    
    return mintbaseSignTransactionUrl;

}







const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

