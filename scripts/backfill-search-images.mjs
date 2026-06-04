import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

loadEnvFile('.env');
loadEnvFile('src/.env');

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const googleSearchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
const geekdoImageHost = 'cf.geekdo-images.com';
const dryRun = process.argv.includes('--dry-run');

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  );
}

if (!googleApiKey || !googleSearchEngineId) {
  throw new Error(
    'Missing Google credentials. Set GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID.',
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);
const { data: games, error } = await supabase
  .from('board_games')
  .select('id, name, release_year, bgg_id, image_url')
  .is('image_url', null)
  .order('name', { ascending: true });

if (error) {
  throw new Error(error.message);
}

console.log(`Found ${games.length} games without images.`);

for (const game of games) {
  const imageUrl = await findGoogleImage(game);

  if (!imageUrl) {
    console.log(`No image found for ${game.name}`);
    await delay(250);
    continue;
  }

  if (dryRun) {
    console.log(`[dry-run] ${game.name}: ${imageUrl}`);
  } else {
    const { error: updateError } = await supabase
      .from('board_games')
      .update({ image_url: imageUrl })
      .eq('id', game.id);

    if (updateError) {
      console.log(`Failed to update ${game.name}: ${updateError.message}`);
    } else {
      console.log(`Updated ${game.name}`);
    }
  }

  await delay(350);
}

async function findGoogleImage(game) {
  const query = `${game.name} ${game.release_year} board game cover site:${geekdoImageHost}`;
  const url = new URL('https://www.googleapis.com/customsearch/v1');

  url.searchParams.set('key', googleApiKey);
  url.searchParams.set('cx', googleSearchEngineId);
  url.searchParams.set('q', query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('siteSearch', geekdoImageHost);
  url.searchParams.set('siteSearchFilter', 'i');
  url.searchParams.set('num', '3');
  url.searchParams.set('safe', 'active');

  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Google image search failed with status ${response.status}: ${errorBody}`,
    );
  }

  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];
  const matchingItem = items.find((item) => isLikelyImageUrl(item.link));

  return matchingItem?.link ?? null;
}

function isLikelyImageUrl(value) {
  try {
    return new URL(value).hostname === geekdoImageHost;
  } catch {
    return false;
  }
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const match = /^([^#=\s]+)=(.*)$/.exec(line.trim());

      if (!match || process.env[match[1]]) {
        return;
      }

      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    });
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
