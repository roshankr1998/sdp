import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { parseFile } from "music-metadata";

export const dynamic = "force-dynamic";

const MUSIC_DIR = path.join(
  process.cwd(),
  "public",
  "music"
);

const AUDIO_EXTENSIONS = [
  ".mp3",
  ".m4a",
  ".wav",
  ".ogg",
  ".oga",
  ".aac",
  ".flac",
  ".webm",
];

function fallbackTitle(filename) {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function encodePathPart(value) {
  return encodeURIComponent(value);
}

async function readSongMetadata(filePath, filename) {
  const fallback = fallbackTitle(filename);

  try {
    const metadata = await parseFile(filePath, {
      duration: true,
    });

    const common = metadata.common || {};
    const format = metadata.format || {};

    return {
      title: common.title || fallback,

      artist:
        common.artist ||
        common.albumartist ||
        "Unknown Artist",

      album:
        common.album ||
        "",

      year:
        common.year ||
        null,

      track:
        common.track?.no ||
        null,

      disc:
        common.disk?.no ||
        null,

      duration:
        Number.isFinite(format.duration)
          ? format.duration
          : 0,

      filename,

      // This is useful for debugging.
      metadataFound: Boolean(
        common.title ||
        common.artist ||
        common.album
      ),
    };
  } catch (error) {
    console.warn(
      `Metadata could not be read from ${filename}:`,
      error.message
    );

    return {
      title: fallback,
      artist: "Unknown Artist",
      album: "",
      year: null,
      track: null,
      disc: null,
      duration: 0,
      filename,
      metadataFound: false,
    };
  }
}

export async function GET() {
  try {
    await fs.access(MUSIC_DIR);

    const folders = await fs.readdir(
      MUSIC_DIR,
      {
        withFileTypes: true,
      }
    );

    const playlistFolders = folders
      .filter((entry) => entry.isDirectory())
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          undefined,
          {
            sensitivity: "base",
          }
        )
      );

    const playlists = [];

    for (const playlistFolder of playlistFolders) {
      const playlistPath = path.join(
        MUSIC_DIR,
        playlistFolder.name
      );

      const files = await fs.readdir(
        playlistPath,
        {
          withFileTypes: true,
        }
      );

      const audioFiles = files
        .filter((entry) => {
          if (!entry.isFile()) {
            return false;
          }

          return AUDIO_EXTENSIONS.includes(
            path.extname(entry.name).toLowerCase()
          );
        })
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          )
        );

      const tracks = [];

      for (
        let index = 0;
        index < audioFiles.length;
        index++
      ) {
        const audioFile = audioFiles[index];

        const filePath = path.join(
          playlistPath,
          audioFile.name
        );

        const metadata =
          await readSongMetadata(
            filePath,
            audioFile.name
          );

        tracks.push({
          id: `${playlistFolder.name}-${audioFile.name}`,

          title: metadata.title,

          artist: metadata.artist,

          album: metadata.album,

          year: metadata.year,

          track: metadata.track,

          disc: metadata.disc,

          duration: metadata.duration,

          filename: metadata.filename,

          metadataFound:
            metadata.metadataFound,

          file:
            `/music/${encodePathPart(
              playlistFolder.name
            )}/${encodePathPart(
              audioFile.name
            )}`,
        });
      }

      playlists.push({
        id: playlistFolder.name,
        name: playlistFolder.name,
        tracks,
      });
    }

    return NextResponse.json({
      playlists,
    });
  } catch (error) {
    console.error(
      "Music API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to scan music directory",
        details: error.message,
      },
      {
        status: 500,
      }
    );
  }
}