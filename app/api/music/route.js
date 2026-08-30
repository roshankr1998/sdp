
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

/* =========================================================
   CONFIG
========================================================= */

export const revalidate = 300;

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

  return (
    `${SUPABASE_URL}/storage/v1/object/public/` +
    `${BUCKET}/${encodedPath}`
  );
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

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Supabase list failed ${response.status}: ${text}`
    );
  }

  return response.json();
}

/* =========================================================
   BUILD TRACK
========================================================= */

function buildTrack(
  playlistName,
  item
) {
  const filePath =
    `${playlistName}/${item.name}`;

  return {
    id: filePath,

    file: getPublicUrl(filePath),

    /*
     * Metadata is intentionally empty here.
     *
     * It is populated in the browser using
     * music-metadata.
     */

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

/* =========================================================
   BUILD MUSIC LIBRARY
========================================================= */

const getMusicLibrary =
  unstable_cache(
    async () => {
      console.log(
        "Building music library..."
      );

      /* =====================================================
         ROOT
      ===================================================== */

      const root =
        await listFolder("");

      /* =====================================================
         FIND PLAYLIST FOLDERS
         
         Supabase returns:
         
         folder/
         song.mp3
         
         We only consider non-audio root items
         as playlist folders.
      ===================================================== */

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

      /* =====================================================
         LOAD ALL PLAYLISTS IN PARALLEL
      ===================================================== */

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

                /*
                 * Ignore empty folders.
                 */

                if (
                  tracks.length === 0
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

      /* =====================================================
         REMOVE FAILED / EMPTY PLAYLISTS
      ===================================================== */

      const playlists =
        results.filter(
          Boolean
        );

      /* =====================================================
         TOTAL PLAYLISTS
      ===================================================== */

      const totalPlaylists =
        playlists.length;

      /* =====================================================
         TOTAL TRACKS
         
         This is the IMPORTANT count.
         
         It counts every track from every playlist.
      ===================================================== */

      const totalTracks =
        playlists.reduce(
          (
            total,
            playlist
          ) =>
            total +
            (
              Array.isArray(
                playlist.tracks
              )
                ? playlist.tracks.length
                : 0
            ),
          0
        );

      console.log(
        "Music library ready:",
        {
          playlists:
            totalPlaylists,

          tracks:
            totalTracks,
        }
      );

      /* =====================================================
         FINAL API OBJECT
      ===================================================== */

      return {
        success:
          true,

        playlists,

        totalPlaylists,

        totalTracks,
      };
    },

    /*
     * Change this cache key whenever you want
     * to force a fresh library build.
     */

    ["music-library-v3"],

    {
      revalidate: 300,
    }
  );

/* =========================================================
   GET
========================================================= */

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

        totalPlaylists:
          0,

        totalTracks:
          0,
      },

      {
        status: 500,
      }
    );
  }
}

