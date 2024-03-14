import * as admin from 'firebase-admin';

    admin.initializeApp({
          apiKey: process.env.FIREBASE_API_KEY,
          projectId: process.env.FIREBASE_PROJECT_ID,
          appId: process.env.FIREBASE_APP_ID,
    });

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { licenseKey, domain } = req.body;

    // Check if licenseKey and domain are provided
    if (!licenseKey || !domain) {
        return res.status(400).json({ error: 'License key and domain are required' });
    }

    try {
        const licenseRef = admin.firestore().collection('licenses').doc(licenseKey);
        const doc = await licenseRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'License key not found' });
        }

        const license = doc.data();

        // Check if the license is active and domain is allowed
        if (license.isActive && license.domains.includes(domain)) {
            return res.status(200).json({ verified: true });
        } else {
            return res.status(403).json({ verified: false, error: 'License key is not active or domain is not allowed' });
        }
    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ error: 'Internal server error during verification' });
    }
};
