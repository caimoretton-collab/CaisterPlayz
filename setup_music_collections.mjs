import PocketBase from 'pocketbase';
import { createInterface } from 'readline';

const PB_URL = process.env.VITE_PB_URL || 'https://caisterplayz-caisterplayz-backend.hf.space';
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

async function main() {
  const email = 'caismoretton@gmail.com';
  const password = 'CaisterAdmin2026!';

  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);

  console.log(`\nConnecting to ${PB_URL}...`);
  await pb.collection('_superusers').authWithPassword(email, password);
  console.log('✓ Authenticated as superuser\n');

  // ── cplayz_tracks ──
  try {
    const existing = await pb.collections.getOne('cplayz_tracks');
    console.log('✓ cplayz_tracks already exists (id:', existing.id, ')');
  } catch {
    console.log('Creating cplayz_tracks...');
    await pb.collections.create({
      name: 'cplayz_tracks',
      type: 'base',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'artist', type: 'text', required: true },
        { name: 'audioFile', type: 'file', required: true, maxSelect: 1, maxSize: 52428800, mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a', 'video/mp4'] },
        { name: 'coverArt', type: 'file', required: false, maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
        { name: 'userId', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 },
        { name: 'plays', type: 'number', required: false },
        { name: 'likes', type: 'number', required: false }
      ],
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""', 
      deleteRule: '@request.auth.id = userId',
    });
    console.log('✓ cplayz_tracks created');
  }

  // ── cplayz_track_likes ──
  try {
    const existing = await pb.collections.getOne('cplayz_track_likes');
    console.log('✓ cplayz_track_likes already exists (id:', existing.id, ')');
  } catch {
    let tracksCollection;
    try {
      tracksCollection = await pb.collections.getOne('cplayz_tracks');
    } catch (e) {
      console.log('Error fetching tracks collection for relation.');
      process.exit(1);
    }

    console.log('Creating cplayz_track_likes...');
    await pb.collections.create({
      name: 'cplayz_track_likes',
      type: 'base',
      fields: [
        { name: 'userId', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 },
        { name: 'trackId', type: 'relation', required: true, collectionId: tracksCollection.id, cascadeDelete: true, maxSelect: 1 },
      ],
      indexes: [
        'CREATE UNIQUE INDEX `idx_track_likes_unique` ON `cplayz_track_likes` (`userId`, `trackId`)'
      ],
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.id != ""',
      updateRule: null,
      deleteRule: '@request.auth.id = userId',
    });
    console.log('✓ cplayz_track_likes created');
  }
  
  console.log('\n🎉 Music collections setup complete!\n');
  rl.close();
}

main().catch(err => {
  console.error('Setup failed:', err.message || err);
  if (err.response) console.error(JSON.stringify(err.response, null, 2));
  process.exit(1);
});
