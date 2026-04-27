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

async function run() {
  const snap = await db.collection('dipendenti').limit(20).get();
  if (snap.empty) {
    console.log('❌ La collection dipendenti è VUOTA.');
    console.log('→ Devi eseguire: node scripts/importUsers.js');
  } else {
    console.log(`✅ ${snap.size} documenti trovati:\n`);
    snap.docs.forEach(d => {
      const data = d.data();
      console.log(`  id: ${d.id}`);
      console.log(`  email: ${data.email || '—'}`);
      console.log(`  uid:   ${data.uid || '—'}`);
      console.log(`  role:  ${data.role || '—'}`);
      console.log('  ---');
    });
  }
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
