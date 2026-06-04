import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

loadEnvFile('src/.env');

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const bggAccessToken = process.env.BGG_ACCESS_TOKEN;
const geekdoImageHost = 'cf.geekdo-images.com';
const chunkSize = 20;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  );
}

if (!bggAccessToken) {
  throw new Error(
    'BGG XML returned 401 in this environment and now requires authorization. Set BGG_ACCESS_TOKEN, or use npm run backfill:search-images for a no-BGG-token cf.geekdo-images.com lookup.',
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);
const { data: games, error } = await supabase
  .from('board_games')
  .select('id, name, bgg_id, bgg_url, image_url')
  .is('image_url', null)
  .order('name', { ascending: true });

if (error) {
  throw new Error(error.message);
}

const gamesWithBggId = games
  .map((game) => ({ ...game, bggId: game.bgg_id ?? getBggGameId(game.bgg_url) }))
  .filter((game) => game.bggId);

console.log(`Found ${gamesWithBggId.length} games without images.`);

for (let index = 0; index < gamesWithBggId.length; index += chunkSize) {
  const chunk = gamesWithBggId.slice(index, index + chunkSize);
  const imagesByBggId = await fetchBggImages(chunk.map((game) => game.bggId));

  for (const game of chunk) {
    const imageUrl = imagesByBggId.get(game.bggId);

    if (!imageUrl) {
      console.log(`No image found for ${game.name} (${game.bggId})`);
      continue;
    }

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

  await delay(750);
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

function getBggGameId(bggUrl) {
  return Number(/boardgame\/(\d+)/.exec(bggUrl)?.[1] ?? NaN) || null;
}

async function fetchBggImages(ids) {
  const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${ids.join(',')}`, {
    headers: {
      accept: 'application/xml,text/xml',
      authorization: `Bearer ${bggAccessToken}`,
      'user-agent': 'boardgames-manager-image-backfill/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`BGG request failed with status ${response.status}`);
  }

  const xml = await response.text();
  const imagesByBggId = new Map();
  const itemPattern = /<item\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemPattern.exec(xml)) !== null) {
    const imageUrl = readXmlText(match[2], 'image') ?? readXmlText(match[2], 'thumbnail');

    if (isGeekdoImageUrl(imageUrl)) {
      imagesByBggId.set(Number(match[1]), imageUrl);
    }
  }

  return imagesByBggId;
}

function readXmlText(xml, tagName) {
  return new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`).exec(xml)?.[1]?.trim() ?? null;
}

function isGeekdoImageUrl(value) {
  try {
    return new URL(value).hostname === geekdoImageHost;
  } catch {
    return false;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
