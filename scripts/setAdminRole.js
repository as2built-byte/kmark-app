import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const admin   = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = getFirestore();

const ADMINS = ['a.matassa@kmark.it', 'a.atamna@kmark.it'];

async function run() {
  for (const email of ADMINS) {
    const snap = await db.collection('dipendenti').where('email', '==', email).limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({ role: 'admin' });
      console.log(`✅  ${email}  →  role: admin  (documento aggiornato)`);
      continue;
    }

    /* No Firestore doc — fetch uid from Auth and create it */
    try {
      const authUser = await admin.auth().getUserByEmail(email);
      await db.collection('dipendenti').add({
        displayName: authUser.displayName || email.split('@')[0],
        email,
        uid:      authUser.uid,
        matricola: '00',
        reparto:  'K-MARK',
        attivo:   true,
        role:     'admin',
        createdAt: new Date().toISOString(),
      });
      console.log(`✅  ${email}  →  role: admin  (documento creato)`);
    } catch (err) {
      console.log(`❌  ${email}  →  ${err.message}`);
    }
  }
  console.log('\nFatto!');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
