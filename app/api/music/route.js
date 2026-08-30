import { NextResponse } from "next/server";
import { parseBuffer } from "music-metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const BUCKET = "music";

/* =========================================================
   AUDIO EXTENSIONS
========================================================= */

function isAudioFile(name) {
  return /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(
    name || ""
  );
}

/* =========================================================
   PUBLIC SUPABASE URL
========================================================= */

function getPublicUrl(filePath) {
  const encodedPath = filePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}

/* =========================================================
   LIST SUPABASE FOLDER
========================================================= */

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

  const text =
    await response.text();

  console.log(
    `LIST ${prefix || "/"} → ${response.status}`
  );

  if (!response.ok) {
    throw new Error(
      `Supabase list failed ${response.status}: ${text}`
    );
  }

  return JSON.parse(text);
}

/* =========================================================
   READ ID3 METADATA
========================================================= */

async function readMetadata(filePath) {
  const url =
    getPublicUrl(filePath);

  try {
    console.log(
      `Reading ID3: ${filePath}`
    );

    /*
     * Fetch the MP3 from Supabase.
     *
     * This happens ONLY on the server while
     * building the metadata response.
     */

    const response =
      await fetch(url, {
        cache: "no-store",
      });

    if (!response.ok) {
      throw new Error(
        `Unable to fetch audio: ${response.status}`
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    /*
     * music-metadata reads the actual embedded
     * ID3 / metadata tags.
     */

    const metadata =
      await parseBuffer(
        buffer,
        {
          mimeType:
            response.headers.get(
              "content-type"
            ) || "audio/mpeg",
        }
      );

    const common =
      metadata.common || {};

    console.log(
      "ID3:",
      JSON.stringify(
        {
          title: common.title,
          artist: common.artist,
          album: common.album,
          albumartist:
            common.albumartist,
          year: common.year,
          genre: common.genre,
          track:
            common.track,
          disk:
            common.disk,
        },
        null,
        2
      )
    );

    return {
      title:
        common.title ||
        null,

      artist:
        common.artist ||
        null,

      album:
        common.album ||
        null,

      albumArtist:
        common.albumartist ||
        null,

      year:
        common.year ||
        null,

      genre:
        Array.isArray(
          common.genre
        )
          ? common.genre[0]
          : common.genre ||
            null,

      track:
        common.track?.no ||
        null,

      disk:
        common.disk?.no ||
        null,

      composer:
        Array.isArray(
          common.composer
        )
          ? common.composer[0]
          : common.composer ||
            null,
    };
  } catch (error) {
    console.error(
      `ID3 failed for ${filePath}:`,
      error
    );

    return {
      title: null,
      artist: null,
      album: null,
      albumArtist: null,
      year: null,
      genre: null,
      track: null,
      disk: null,
      composer: null,
    };
  }
}

/* =========================================================
   FALLBACK TITLE
========================================================= */

function fallbackTitle(filename) {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   BUILD TRACK
========================================================= */

async function buildTrack(
  playlistName,
  item
) {
  const filePath =
    `${playlistName}/${item.name}`;

  const url =
    getPublicUrl(filePath);

  const metadata =
    await readMetadata(filePath);

  return {
    id: filePath,

    file: url,

    /*
     * ID3 metadata first.
     * Filename is ONLY the fallback.
     */

    title:
      metadata.title ||
      fallbackTitle(item.name),

    artist:
      metadata.artist ||
      "Unknown artist",

    album:
      metadata.album ||
      "",

    albumArtist:
      metadata.albumArtist ||
      "",

    year:
      metadata.year ||
      null,

    genre:
      metadata.genre ||
      "",

    track:
      metadata.track ||
      null,

    disk:
      metadata.disk ||
      null,

    composer:
      metadata.composer ||
      "",

    filename:
      item.name,
  };
}

/* =========================================================
   FIND AUDIO FILES
========================================================= */

async function getPlaylistTracks(
  playlistName
) {
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

  console.log(
    `Playlist "${playlistName}" → ${audioItems.length} audio files`
  );

  /*
   * Parse metadata sequentially.
   *
   * This is intentionally conservative so we don't
   * hammer Supabase with dozens of simultaneous
   * MP3 downloads.
   */

  const tracks = [];

  for (const item of audioItems) {
    const track =
      await buildTrack(
        playlistName,
        item
      );

    tracks.push(track);
  }

  return tracks;
}

/* =========================================================
   GET
========================================================= */

export async function GET() {
  try {
    console.log("");
    console.log(
      "============================================================"
    );
    console.log(
      "MUSIC API — SUPABASE + ID3"
    );
    console.log(
      "============================================================"
    );

    console.log(
      "Supabase URL:",
      SUPABASE_URL
    );

    console.log(
      "Supabase key:",
      SUPABASE_KEY
        ? "PRESENT"
        : "MISSING"
    );

    console.log(
      "Bucket:",
      BUCKET
    );

    /* =======================================================
       ROOT
    ======================================================= */

    const root =
      await listFolder("");

    console.log(
      "Root objects:",
      root.length
    );

    console.log(
      JSON.stringify(
        root,
        null,
        2
      )
    );

    /* =======================================================
       PLAYLISTS
    ======================================================= */

    const playlists = [];

    for (const item of root) {
      if (!item?.name) {
        continue;
      }

      /*
       * Root-level MP3s are not playlists.
       */

      if (
        isAudioFile(
          item.name
        )
      ) {
        continue;
      }

      const playlistName =
        item.name;

      console.log("");
      console.log(
        "------------------------------------------------------------"
      );

      console.log(
        "PLAYLIST:",
        playlistName
      );

      try {
        const tracks =
          await getPlaylistTracks(
            playlistName
          );

        if (tracks.length > 0) {
          playlists.push({
            id: playlistName,

            name: playlistName,

            tracks,
          });
        }
      } catch (error) {
        console.error(
          `Playlist failed: ${playlistName}`,
          error
        );
      }
    }

    /* =======================================================
       FINAL
    ======================================================= */

    const totalTracks =
      playlists.reduce(
        (total, playlist) =>
          total +
          playlist.tracks.length,
        0
      );

    console.log("");
    console.log(
      "============================================================"
    );
    console.log(
      "FINAL RESULT"
    );
    console.log(
      "============================================================"
    );

    console.log(
      "Playlists:",
      playlists.length
    );

    console.log(
      "Tracks:",
      totalTracks
    );

    console.log(
      JSON.stringify(
        playlists,
        null,
        2
      )
    );

    console.log(
      "============================================================"
    );

    return NextResponse.json(
      {
        success: true,

        playlists,

        totalPlaylists:
          playlists.length,

        totalTracks,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
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
        success: false,

        error:
          error?.message ||
          "Unable to load music.",

        playlists: [],
      },
      {
        status: 500,
      }
    );
  }
}