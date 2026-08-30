import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { parseBuffer } from "music-metadata";

// =========================================================
// CONFIG
// =========================================================

export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const BUCKET = "music";

// =========================================================
// AUDIO EXTENSIONS
// =========================================================

function isAudioFile(name) {
  return /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(
    name || ""
  );
}

// =========================================================
// SUPABASE PUBLIC URL
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
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =========================================================
// VALIDATE PATH
// =========================================================

function isValidPath(filePath) {
  if (!filePath) {
    return false;
  }

  if (
    filePath.startsWith("/") ||
    filePath.includes("..") ||
    filePath.includes("\\") ||
    filePath.includes("//")
  ) {
    return false;
  }

  if (!filePath.includes("/")) {
    return false;
  }

  const filename =
    filePath.split("/").pop();

  return isAudioFile(filename);
}

// =========================================================
// DOWNLOAD AUDIO FOR METADATA
//
// This happens ONLY when the user requests metadata.
//
// NOTE:
// This downloads the individual song, NOT the whole library.
// =========================================================

async function readAudioFile(filePath) {
  const audioUrl =
    getPublicUrl(filePath);

  console.log(
    "Downloading audio for metadata:",
    filePath
  );

  const response =
    await fetch(audioUrl, {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${SUPABASE_KEY}`,

        apikey:
          SUPABASE_KEY,
      },

      cache: "no-store",
    });

  if (!response.ok) {
    throw new Error(
      `Supabase audio fetch failed ${response.status}`
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  return Buffer.from(
    arrayBuffer
  );
}

// =========================================================
// EXTRACT METADATA
// =========================================================

async function extractMetadata(
  filePath
) {

  const buffer =
    await readAudioFile(
      filePath
    );

  const filename =
    filePath
      .split("/")
      .pop();

  const metadata =
    await parseBuffer(
      buffer,
      {
        path:
          filename,
      }
    );

  const common =
    metadata.common || {};

  // -------------------------------------------------------
  // ALBUM ART
  // -------------------------------------------------------

  let picture =
    null;

  if (
    Array.isArray(
      common.picture
    ) &&
    common.picture.length > 0
  ) {

    const image =
      common.picture[0];

    if (
      image?.data
    ) {

      picture = {
        format:
          image.format ||
          "image/jpeg",

        data:
          Buffer.from(
            image.data
          ).toString(
            "base64"
          ),
      };
    }
  }

  // -------------------------------------------------------
  // RETURN
  // -------------------------------------------------------

  return {

    title:
      common.title ||
      fallbackTitle(
        filename
      ),

    artist:
      common.artist ||
      "Unknown artist",

    album:
      common.album ||
      "",

    albumArtist:
      common.albumartist ||
      "",

    year:
      common.year ||
      null,

    genre:
      Array.isArray(
        common.genre
      )
        ? common.genre[0] || ""
        : "",

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
        ? common.composer[0] || ""
        : "",

    picture,
  };
}

// =========================================================
// CACHE METADATA
//
// Once a song has been processed, subsequent requests use
// the cached metadata for 5 minutes.
//
// The cache key includes the file path.
// =========================================================

const getCachedMetadata =
  unstable_cache(
    async (
      filePath
    ) => {

      return extractMetadata(
        filePath
      );
    },

    ["song-metadata-v1"],

    {
      revalidate:
        300,
    }
  );

// =========================================================
// GET
//
// /api/music/metadata?path=Playlist/song.mp3
// =========================================================

export async function GET(
  request
) {

  try {

    const { searchParams } =
      new URL(
        request.url
      );

    const filePath =
      searchParams.get(
        "path"
      );

    // -------------------------------------------------------
    // VALIDATE
    // -------------------------------------------------------

    if (
      !isValidPath(
        filePath
      )
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "Invalid audio path.",
        },

        {
          status:
            400,
        }
      );
    }

    console.log(
      "GET /api/music/metadata:",
      filePath
    );

    // -------------------------------------------------------
    // LOAD METADATA
    // -------------------------------------------------------

    const metadata =
      await getCachedMetadata(
        filePath
      );

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json(
      {
        success:
          true,

        metadata,
      },

      {
        status:
          200,

        headers: {

          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );

  } catch (error) {

    console.error(
      "MUSIC METADATA ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error?.message ||
          "Unable to read song metadata.",
      },

      {
        status:
          500,
      }
    );
  }
}