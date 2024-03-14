import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const firebaseConfig = {
          apiKey: process.env.FIREBASE_API_KEY,
          projectId: process.env.FIREBASE_PROJECT_ID,
          appId: process.env.FIREBASE_APP_ID,
    };

    initializeApp({
      credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          appId: process.env.FIREBASE_APP_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
  });

  const db = getFirestore();

  export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { licenseKey, domain } = req.body;

    try {
        const licenseRef = db.collection('licenses').doc(licenseKey);
        const doc = await licenseRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'License key not found' });
        }

        return doc.data();

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
