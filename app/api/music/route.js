import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   MUSIC DIRECTORY
========================================================= */

const MUSIC_DIR = path.join(
  process.cwd(),
  "public",
  "music"
);

/* =========================================================
   SUPPORTED AUDIO FILES
========================================================= */

const AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".aac",
  ".flac",
];

/* =========================================================
   DECODE ID3 TEXT
========================================================= */

function decodeText(buffer) {
  if (!buffer || buffer.length === 0) {
    return "";
  }

  /*
   ID3 encoding:

   0 = ISO-8859-1
   1 = UTF-16
   2 = UTF-16BE
   3 = UTF-8
  */

  const encoding = buffer[0];
  const data = buffer.subarray(1);

  try {
    if (encoding === 1) {
      return data
        .toString("utf16le")
        .replace(/\u0000/g, "")
        .trim();
    }

    if (encoding === 2) {
      /*
       Node does not have a native UTF-16BE
       decoder, so swap the bytes.
      */

      const swapped = Buffer.alloc(
        data.length
      );

      for (
        let i = 0;
        i + 1 < data.length;
        i += 2
      ) {
        swapped[i] = data[i + 1];
        swapped[i + 1] = data[i];
      }

      return swapped
        .toString("utf16le")
        .replace(/\u0000/g, "")
        .trim();
    }

    if (encoding === 3) {
      return data
        .toString("utf8")
        .replace(/\u0000/g, "")
        .trim();
    }

    return data
      .toString("latin1")
      .replace(/\u0000/g, "")
      .trim();
  } catch {
    return "";
  }
}

/* =========================================================
   SYNC SAFE INTEGER

   ID3v2.4 frame sizes can use sync-safe integers.
========================================================= */

function syncSafeInteger(buffer, offset) {
  return (
    ((buffer[offset] & 0x7f) << 21) |
    ((buffer[offset + 1] & 0x7f) << 14) |
    ((buffer[offset + 2] & 0x7f) << 7) |
    (buffer[offset + 3] & 0x7f)
  );
}

/* =========================================================
   NORMAL INTEGER
========================================================= */

function normalInteger(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

/* =========================================================
   CLEAN METADATA
========================================================= */

function cleanMetadata(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .trim();
}

/* =========================================================
   PARSE ID3 TAGS

   Supports:

   TIT2 = title
   TPE1 = artist
   TALB = album
   TCON = genre
   TRCK = track number
========================================================= */

async function readMp3Metadata(filePath) {
  const empty = {
    title: "",
    artist: "",
    album: "",
    genre: "",
    track: "",
  };

  try {
    /*
      Read enough of the MP3 file to inspect
      the ID3 header and frames.

      1 MB is more than enough for normal
      ID3 metadata.
    */

    const fileHandle = await fs.open(
      filePath,
      "r"
    );

    const stat = await fileHandle.stat();

    const readSize = Math.min(
      Number(stat.size),
      1024 * 1024
    );

    const buffer = Buffer.alloc(readSize);

    await fileHandle.read(
      buffer,
      0,
      readSize,
      0
    );

    await fileHandle.close();

    /*
      No ID3 tag.
    */

    if (
      buffer.length < 10 ||
      buffer.toString(
        "ascii",
        0,
        3
      ) !== "ID3"
    ) {
      return empty;
    }

    const majorVersion =
      buffer[3];

    /*
      ID3v2 header is 10 bytes.
    */

    let tagSize;

    if (majorVersion >= 4) {
      tagSize = syncSafeInteger(
        buffer,
        6
      );
    } else {
      tagSize = normalInteger(
        buffer,
        6
      );
    }

    const tagEnd = Math.min(
      buffer.length,
      10 + tagSize
    );

    let offset = 10;

    const metadata = {
      ...empty,
    };

    while (
      offset + 10 <= tagEnd
    ) {
      /*
        ID3v2.2 uses 3-character frame IDs.
      */

      if (majorVersion === 2) {
        if (offset + 6 > tagEnd) {
          break;
        }

        const frameId =
          buffer.toString(
            "ascii",
            offset,
            offset + 3
          );

        const frameSize =
          (buffer[offset + 3] << 16) |
          (buffer[offset + 4] << 8) |
          buffer[offset + 5];

        if (
          !frameId.trim() ||
          frameSize <= 0
        ) {
          break;
        }

        const frameStart =
          offset + 6;

        const frameEnd =
          Math.min(
            frameStart + frameSize,
            tagEnd
          );

        const frameData =
          buffer.subarray(
            frameStart,
            frameEnd
          );

        if (
          frameId === "TT2"
        ) {
          metadata.title =
            decodeText(frameData);
        }

        if (
          frameId === "TP1"
        ) {
          metadata.artist =
            decodeText(frameData);
        }

        if (
          frameId === "TAL"
        ) {
          metadata.album =
            decodeText(frameData);
        }

        offset =
          frameEnd;

        continue;
      }

      /*
        ID3v2.3 / ID3v2.4
      */

      const frameId =
        buffer.toString(
          "ascii",
          offset,
          offset + 4
        );

      if (
        !/^[A-Z0-9]{4}$/.test(
          frameId
        )
      ) {
        break;
      }

      let frameSize;

      if (majorVersion >= 4) {
        frameSize =
          syncSafeInteger(
            buffer,
            offset + 4
          );
      } else {
        frameSize =
          normalInteger(
            buffer,
            offset + 4
          );
      }

      /*
        Empty frame.
      */

      if (frameSize <= 0) {
        break;
      }

      const frameStart =
        offset + 10;

      const frameEnd =
        Math.min(
          frameStart + frameSize,
          tagEnd
        );

      if (
        frameStart >= tagEnd
      ) {
        break;
      }

      const frameData =
        buffer.subarray(
          frameStart,
          frameEnd
        );

      /*
        Title
      */

      if (
        frameId === "TIT2" &&
        !metadata.title
      ) {
        metadata.title =
          decodeText(frameData);
      }

      /*
        Artist
      */

      if (
        frameId === "TPE1" &&
        !metadata.artist
      ) {
        metadata.artist =
          decodeText(frameData);
      }

      /*
        Album
      */

      if (
        frameId === "TALB" &&
        !metadata.album
      ) {
        metadata.album =
          decodeText(frameData);
      }

      /*
        Genre
      */

      if (
        frameId === "TCON" &&
        !metadata.genre
      ) {
        metadata.genre =
          decodeText(frameData);
      }

      /*
        Track number
      */

      if (
        frameId === "TRCK" &&
        !metadata.track
      ) {
        metadata.track =
          decodeText(frameData);
      }

      offset =
        frameEnd;
    }

    return {
      title: cleanMetadata(
        metadata.title
      ),
      artist: cleanMetadata(
        metadata.artist
      ),
      album: cleanMetadata(
        metadata.album
      ),
      genre: cleanMetadata(
        metadata.genre
      ),
      track: cleanMetadata(
        metadata.track
      ),
    };
  } catch (error) {
    console.warn(
      "Could not read MP3 metadata:",
      filePath,
      error
    );

    return empty;
  }
}

/* =========================================================
   FALLBACK TITLE

   Only used when the audio file has NO ID3 title.
========================================================= */

function filenameToTitle(filename) {
  const withoutExtension =
    filename.replace(
      /\.[^/.]+$/,
      ""
    );

  return withoutExtension
    .replace(/[_-]+/g, " ")
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

/* =========================================================
   GET DIRECTORIES
========================================================= */

async function getDirectories(directory) {
  try {
    const entries =
      await fs.readdir(
        directory,
        {
          withFileTypes: true,
        }
      );

    return entries
      .filter(
        (entry) =>
          entry.isDirectory()
      )
      .map(
        (entry) =>
          entry.name
      )
      .sort(
        (a, b) =>
          a.localeCompare(
            b,
            undefined,
            {
              numeric: true,
              sensitivity:
                "base",
            }
          )
      );
  } catch {
    return [];
  }
}

/* =========================================================
   GET AUDIO FILES
========================================================= */

async function getAudioFiles(
  directory
) {
  try {
    const entries =
      await fs.readdir(
        directory,
        {
          withFileTypes: true,
        }
      );

    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          AUDIO_EXTENSIONS.includes(
            path
              .extname(
                entry.name
              )
              .toLowerCase()
          )
      )
      .map(
        (entry) =>
          entry.name
      )
      .sort(
        (a, b) =>
          a.localeCompare(
            b,
            undefined,
            {
              numeric: true,
              sensitivity:
                "base",
            }
          )
      );
  } catch {
    return [];
  }
}

/* =========================================================
   URL ENCODING
========================================================= */

function publicMusicUrl(
  playlistName,
  filename
) {
  return (
    "/music/" +
    encodeURIComponent(
      playlistName
    ) +
    "/" +
    encodeURIComponent(
      filename
    )
  );
}

/* =========================================================
   GET MUSIC
========================================================= */

export async function GET() {
  try {
    /*
      Check whether public/music exists.
    */

    await fs.access(
      MUSIC_DIR
    );

    const playlistNames =
      await getDirectories(
        MUSIC_DIR
      );

    const playlists = [];

    for (
      const playlistName of playlistNames
    ) {
      const playlistDirectory =
        path.join(
          MUSIC_DIR,
          playlistName
        );

      const files =
        await getAudioFiles(
          playlistDirectory
        );

      const tracks = [];

      for (
        let index = 0;
        index < files.length;
        index++
      ) {
        const filename =
          files[index];

        const filePath =
          path.join(
            playlistDirectory,
            filename
          );

        let metadata = {
          title: "",
          artist: "",
          album: "",
          genre: "",
          track: "",
        };

        /*
          Read ID3 metadata for MP3.

          Other formats will fall back
          to the filename.
        */

        if (
          path
            .extname(filename)
            .toLowerCase() ===
          ".mp3"
        ) {
          metadata =
            await readMp3Metadata(
              filePath
            );
        }

        const title =
          metadata.title ||
          filenameToTitle(
            filename
          );

        const artist =
          metadata.artist ||
          "Unknown Artist";

        tracks.push({
          id: `${playlistName}-${index}-${filename}`,

          title,

          artist,

          album:
            metadata.album || "",

          genre:
            metadata.genre || "",

          track:
            metadata.track || "",

          filename,

          file:
            publicMusicUrl(
              playlistName,
              filename
            ),
        });
      }

      /*
        Only expose folders that actually
        contain audio files.
      */

      if (tracks.length > 0) {
        playlists.push({
          id: playlistName,
          name: playlistName,
          tracks,
        });
      }
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
        playlists: [],
        error:
          "Could not read public/music",
        details:
          error?.message ||
          String(error),
      },
      {
        status: 500,
      }
    );
  }
}