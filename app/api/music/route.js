import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

// =========================================================
// CONFIG
// =========================================================

export const revalidate = 300;

const SUPABASE_URL =
process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const BUCKET = "music";

// =========================================================
// AUDIO EXTENSIONS
// =========================================================

function isAudioFile(name) {
return /.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(
name || ""
);
}

// =========================================================
// PUBLIC SUPABASE URL
// =========================================================

function getPublicUrl(filePath) {
const encodedPath = filePath
.split("/")
.map(encodeURIComponent)
.join("/");

return (
`${SUPABASE_URL}/storage/v1/object/public/` +
`${BUCKET}/${encodedPath}`
);
}

// =========================================================
// FALLBACK TITLE
// =========================================================

function fallbackTitle(filename) {
return filename
.replace(/.[^/.]+$/, "")
.replace(/[_-]+/g, " ")
.replace(/\s+/g, " ")
.trim();
}

// =========================================================
// LIST SUPABASE FOLDER
// =========================================================

async function listFolder(prefix = "") {
const url =
`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`;

const response = await fetch(url, {
method: "POST",


headers: {
  Authorization:
    `Bearer ${SUPABASE_KEY}`,

  apikey:
    SUPABASE_KEY,

  "Content-Type":
    "application/json",
},

body: JSON.stringify({
  prefix,
  limit: 1000,
  offset: 0,

  sortBy: {
    column: "name",
    order: "asc",
  },
}),

cache: "no-store",


});

if (!response.ok) {
const text =
await response.text();


throw new Error(
  `Supabase list failed ${response.status}: ${text}`
);


}

return response.json();
}

// =========================================================
// BUILD TRACK
// =========================================================

function buildTrack(
playlistName,
item
) {
const filePath =
`${playlistName}/${item.name}`;

return {
id: filePath,


file: getPublicUrl(filePath),

title:
  fallbackTitle(item.name),

artist:
  "Unknown artist",

album:
  "",

albumArtist:
  "",

year:
  null,

genre:
  "",

track:
  null,

disk:
  null,

composer:
  "",

picture:
  null,

filename:
  item.name,


};
}

// =========================================================
// BUILD MUSIC LIBRARY
// =========================================================

const getMusicLibrary =
unstable_cache(
async () => {
console.log(
"Building music library..."
);


  // -----------------------------------------------------
  // ROOT
  // -----------------------------------------------------

  const root =
    await listFolder("");

  // -----------------------------------------------------
  // PLAYLISTS
  // -----------------------------------------------------

  const playlistNames =
    root
      .filter(
        (item) =>
          item?.name &&
          !isAudioFile(
            item.name
          )
      )
      .map(
        (item) =>
          item.name
      );

  console.log(
    "Playlists found:",
    playlistNames.length
  );

  // -----------------------------------------------------
  // LOAD PLAYLISTS IN PARALLEL
  // -----------------------------------------------------

  const results =
    await Promise.all(
      playlistNames.map(
        async (
          playlistName
        ) => {
          try {
            const items =
              await listFolder(
                playlistName
              );

            const audioItems =
              items.filter(
                (item) =>
                  item?.name &&
                  isAudioFile(
                    item.name
                  )
              );

            const tracks =
              audioItems.map(
                (item) =>
                  buildTrack(
                    playlistName,
                    item
                  )
              );

            if (
              tracks.length ===
              0
            ) {
              return null;
            }

            return {
              id:
                playlistName,

              name:
                playlistName,

              tracks,
            };
          } catch (error) {
            console.error(
              `Playlist failed: ${playlistName}`,
              error
            );

            return null;
          }
        }
      )
    );

  const playlists =
    results.filter(
      Boolean
    );

  const totalTracks =
    playlists.reduce(
      (
        total,
        playlist
      ) =>
        total +
        playlist.tracks.length,
      0
    );

  console.log(
    "Music library ready:",
    playlists.length,
    "playlists /",
    totalTracks,
    "tracks"
  );

  return {
    success:
      true,

    playlists,

    totalPlaylists:
      playlists.length,

    totalTracks,
  };
},

["music-library-v2"],

{
  revalidate:
    300,
}


);

// =========================================================
// GET
// =========================================================

export async function GET() {
try {
const data =
await getMusicLibrary();


return NextResponse.json(
  data,
  {
    status: 200,

    headers: {
      "Cache-Control":
        "public, s-maxage=300, stale-while-revalidate=600",
    },
  }
);


} catch (error) {
console.error(
"MUSIC API ERROR:",
error
);


return NextResponse.json(
  {
    success:
      false,

    error:
      error?.message ||
      "Unable to load music.",

    playlists:
      [],
  },

  {
    status: 500,
  }
);


}
}
