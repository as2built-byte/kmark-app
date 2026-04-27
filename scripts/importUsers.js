import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const DEFAULT_PASSWORD = 'Password1$';
const db = getFirestore();

const ADMIN_EMAILS = new Set(['a.matassa@kmark.it', 'a.atamna@kmark.it']);

const USERS = [
  { displayName: 'Annalisa Matassa',        email: 'a.matassa@kmark.it'        },
  { displayName: 'Emanuela Alesiani',        email: 'e.alesiani@kmark.it'       },
  { displayName: 'Martina Antonini',         email: 'm.antonini@kmark.it'       },
  { displayName: 'Piergiuseppe Belmonte',    email: 'p.belmonte@kmark.it'       },
  { displayName: 'Giovanni Cecchini',        email: 'g.cecchini@kmark.it'       },
  { displayName: 'Michele Cimmino',          email: 'm.cimmino@kmark.it'        },
  { displayName: 'Alessandro Costa',         email: 'a.costa@kmark.it'          },
  { displayName: "Stefano D'Angeli",         email: 's.dangeli@kmark.it'        },
  { displayName: 'Arianna Dejean',           email: 'a.dejean@kmark.it'         },
  { displayName: 'Roberta Deletis',          email: 'r.deletis@kmark.it'        },
  { displayName: 'Francesco Florio',         email: 'f.florio@kmark.it'         },
  { displayName: 'Christian Gonella',        email: 'c.gonella@kmark.it'        },
  { displayName: 'Valentina Gori',           email: 'v.gori@kmark.it'           },
  { displayName: 'Maria Cristina Iulianella',email: 'mc.iulianella@kmark.it'    },
  { displayName: 'Tatiana Macri',            email: 't.macri@kmark.it'          },
  { displayName: 'Desirée Martorelli',       email: 'd.martorelli@kmark.it'     },
  { displayName: 'Lorenzo Nardelli',         email: 'l.nardelli@kmark.it'       },
  { displayName: 'Felix Paliuc',             email: 'f.paliuc@kmark.it'         },
  { displayName: 'Stefano Palmulli',         email: 's.palmulli@kmark.it'       },
  { displayName: 'Claudia Pappagallo',       email: 'c.pappagallo@kmark.it'     },
  { displayName: 'Ivan Patricelli',          email: 'i.patricelli@kmark.it'     },
  { displayName: 'Fabio Petrucci',           email: 'f.petrucci@kmark.it'       },
  { displayName: 'Paola Pisano',             email: 'p.pisano@kmark.it'         },
  { displayName: 'Manuela Polsi',            email: 'm.polsi@kmark.it'          },
  { displayName: 'Francesco Pompili',        email: 'f.pompili@kmark.it'        },
  { displayName: 'Tiziana Poscente',         email: 't.poscente@kmark.it'       },
  { displayName: 'Emanuela Rocchi',          email: 'e.rocchi@kmark.it'         },
  { displayName: 'Davide Romani',            email: 'd.romani@kmark.it'         },
  { displayName: 'Sara Torelli',             email: 's.torelli@kmark.it'        },
  { displayName: 'Mauro Tulli',              email: 'm.tulli@kmark.it'          },
  { displayName: 'Francesco Voce',           email: 'f.voce@kmark.it'           },
  { displayName: 'Francesca Ribuoli',        email: 'f.ribuoli@kreateksrl.com'  },
  { displayName: 'Marco Dotti',              email: 'm.dotti@kreateksrl.com'    },
  { displayName: 'Enrico Callarà',           email: 'e.callara@kmark.it'        },
  { displayName: 'Stefano Basso',            email: 's.basso@kmark.it'          },
  { displayName: 'Massimo Brignardello',     email: 'm.brignardello@kmark.it'   },
  { displayName: 'Andrea Nataletti',         email: 'a.nataletti@kmark.it'      },
  { displayName: 'Marco Pruccoli',           email: 'm.pruccoli@kmark.it'       },
];

const unique = [...new Map(USERS.map(u => [u.email, u])).values()];

async function importUsers() {
  console.log(`\n🚀 K-MARK — Importazione ${unique.length} utenti\n${'─'.repeat(50)}`);

  let created = 0;
  let skipped = 0;
  let failed  = 0;

  for (const { displayName, email } of unique) {
    try {
      let uid;
      try {
        const userRecord = await admin.auth().createUser({
          email,
          password: DEFAULT_PASSWORD,
          displayName,
          emailVerified: false,
        });
        uid = userRecord.uid;
        console.log(`  ✅  ${displayName.padEnd(35)} ${email}`);
        created++;
      } catch (err) {
        if (err.code === 'auth/email-already-exists') {
          const existing = await admin.auth().getUserByEmail(email);
          uid = existing.uid;
          console.log(`  ⏭️   ${displayName.padEnd(35)} ${email}  (già esistente)`);
          skipped++;
        } else {
          throw err;
        }
      }

      const role   = ADMIN_EMAILS.has(email) ? 'admin' : 'user';
      const colRef = db.collection('dipendenti');
      const snap   = await colRef.where('email', '==', email).limit(1).get();
      if (snap.empty) {
        await colRef.add({
          displayName,
          email,
          uid,
          matricola: String(created + skipped),
          reparto: 'K-MARK',
          attivo: true,
          role,
          createdAt: new Date().toISOString(),
        });
      } else {
        /* Update existing doc to ensure uid + role are set */
        await snap.docs[0].ref.update({ uid, role });
      }
    } catch (err) {
      console.error(`  ❌  ${displayName.padEnd(35)} ${email}  → ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅  Creati  : ${created}`);
  console.log(`⏭️   Ignorati: ${skipped}  (account già presenti)`);
  console.log(`❌  Errori  : ${failed}`);
  console.log(`\nPassword di default: ${DEFAULT_PASSWORD}`);
  console.log('Ricorda di comunicare ai dipendenti di cambiare la password al primo accesso.\n');

  process.exit(0);
}

importUsers().catch(err => {
  console.error('Errore fatale:', err.message);
  process.exit(1);
});
