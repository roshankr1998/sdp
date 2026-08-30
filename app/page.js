
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  ChevronDown,
  Code2,
  Coffee,
  Keyboard,
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { parseBlob } from "music-metadata";

/* =========================================================
   CONFIG
========================================================= */

const METADATA_INITIAL_BYTES = 256 * 1024;
const METADATA_MAX_BYTES = 1024 * 1024;

/* =========================================================
   HELPERS
========================================================= */

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

/* =========================================================
   OFFICE SOUND TEXT
========================================================= */

const officeLines = [
  "typing...",
  "npm run dev",
  'git commit -m "one more fix"',
  "building...",
  "coffee.exe started",
  "localhost:3000",
  "deploying...",
  "fixing production",
  "refactoring...",
  "code mode: ON",
];

/* =========================================================
   TERMINAL LOOP
========================================================= */

const terminalCommands = [
  {
    command: "whoami",
    output: "software_developer",
  },
  {
    command: "status",
    output: "building something good...",
  },
  {
    command: "git status",
    output: "working tree clean",
  },
  {
    command: "npm run dev",
    output: "ready - started server on localhost:3000",
  },
  {
    command: "git pull",
    output: "Already up to date.",
  },
  {
    command: "npm run build",
    output: "compiled successfully",
  },
  {
    command: "docker ps",
    output: "3 containers running",
  },
  {
    command: "git push",
    output: "Everything up-to-date",
  },
  {
    command: "deploy --production",
    output: "deployment successful",
  },
  {
    command: "coffee --status",
    output: "coffee level: 87%",
  },
  {
    command: "fix production",
    output: "production fixed. probably.",
  },
  {
    command: "git commit",
    output: "one more fix committed",
  },
];

/* =========================================================
   METADATA HELPERS
========================================================= */

function firstValue(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

/* =========================================================
   PICTURE → DATA URL
========================================================= */

function pictureToDataUrl(picture) {
  if (!picture?.data || !picture?.format) {
    return null;
  }

  try {
    const bytes =
      picture.data instanceof Uint8Array
        ? picture.data
        : new Uint8Array(picture.data);

    let binary = "";

    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(
        ...bytes.subarray(i, i + chunkSize)
      );
    }

    return `data:${picture.format};base64,${btoa(binary)}`;
  } catch (error) {
    console.warn("Unable to convert artwork:", error);
    return null;
  }
}

/* =========================================================
   NORMALIZE METADATA
========================================================= */

function normalizeMetadata(metadata) {
  const common = metadata?.common || {};
  const picture = common.picture?.[0];

  return {
    title: common.title || "",

    artist: firstValue(common.artist) || "",

    album: common.album || "",

    albumArtist: firstValue(common.albumartist) || "",

    year: common.year ?? null,

    genre: firstValue(common.genre) || "",

    track: common.track?.no ?? null,

    disk: common.disk?.no ?? null,

    composer: firstValue(common.composer) || "",

    picture: picture ? pictureToDataUrl(picture) : null,
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Home() {
  /* =======================================================
     REFS
  ======================================================= */

  const audioRef = useRef(null);
  const keyboardRef = useRef(null);

  const metadataCacheRef = useRef(new Map());
  const metadataRequestsRef = useRef(new Map());

  const resumeAfterTrackChangeRef = useRef(false);

  const currentSongRef = useRef(null);
  const currentPlaylistRef = useRef(null);

  /* =======================================================
     WALLPAPER
  ======================================================= */

  const [wallpaper, setWallpaper] = useState("/wallpaper.jpg");

  /* =======================================================
     MUSIC
  ======================================================= */

  const [playlists, setPlaylists] = useState([]);
  const [totalTracks, setTotalTracks] = useState(0);

  const [loadingMusic, setLoadingMusic] = useState(true);
  const [musicError, setMusicError] = useState("");

  /* =======================================================
     PLAYLIST NAVIGATION
  ======================================================= */

  const [
    selectedPlaylistId,
    setSelectedPlaylistId,
  ] = useState("");

  const [current, setCurrent] = useState(0);

  /* =======================================================
     CURRENT SONG
  ======================================================= */

  const [currentSong, setCurrentSong] = useState(null);

  /* =======================================================
     PLAYER
  ======================================================= */

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(0.82);
  const [muted, setMuted] = useState(false);

  /* =======================================================
     UI
  ======================================================= */

  const [showPlaylist, setShowPlaylist] = useState(false);

  /* =======================================================
     OFFICE
  ======================================================= */

  const [keyboardOn, setKeyboardOn] = useState(false);
  const [activeKeys, setActiveKeys] = useState([]);
  const [officeText, setOfficeText] = useState("ready.");

  /* =======================================================
     TERMINAL
  ======================================================= */

  const [terminalIndex, setTerminalIndex] = useState(0);

  /* =======================================================
     CURRENT PLAYLIST
  ======================================================= */

  const currentPlaylist = useMemo(() => {
    if (!playlists.length) {
      return null;
    }

    return (
      playlists.find(
        (playlist) => playlist.id === selectedPlaylistId
      ) || playlists[0]
    );
  }, [playlists, selectedPlaylistId]);

  /* =======================================================
     KEEP REFS UPDATED
  ======================================================= */

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    currentPlaylistRef.current = currentPlaylist;
  }, [currentPlaylist]);

  /* =======================================================
     TERMINAL LOOP
     
     This continuously changes commands and output.
     It does NOT depend on keyboard sounds.
     It does NOT stop.
  ======================================================= */

  useEffect(() => {
    const interval = setInterval(() => {
      setTerminalIndex((previous) => {
        return (previous + 1) % terminalCommands.length;
      });
    }, 2600);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const terminalCommand =
    terminalCommands[terminalIndex];

  /* =======================================================
     LOAD MUSIC
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadMusic() {
      try {
        setLoadingMusic(true);
        setMusicError("");

        const response = await fetch("/api/music", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Music API returned ${response.status}`
          );
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        const loadedPlaylists = Array.isArray(data.playlists)
          ? data.playlists
          : [];

        /*
         * IMPORTANT:
         *
         * Use totalTracks returned by the API.
         * Do not calculate the hero count from
         * currentPlaylist.
         */

        const apiTotalTracks = Number(data.totalTracks);

        const calculatedTotalTracks =
          loadedPlaylists.reduce(
            (total, playlist) =>
              total + (playlist.tracks?.length || 0),
            0
          );

        setTotalTracks(
          Number.isFinite(apiTotalTracks) && apiTotalTracks >= 0
            ? apiTotalTracks
            : calculatedTotalTracks
        );

        setPlaylists(loadedPlaylists);

        if (loadedPlaylists.length > 0) {
          const firstPlaylist = loadedPlaylists[0];

          const firstSong =
            firstPlaylist.tracks?.[0] || null;

          setSelectedPlaylistId(firstPlaylist.id);
          setCurrent(0);
          setCurrentSong(firstSong);
        }
      } catch (error) {
        console.error(
          "Unable to load music:",
          error
        );

        if (!cancelled) {
          setMusicError(
            "Unable to load music."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMusic(false);
        }
      }
    }

    loadMusic();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     VOLUME
  ======================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = muted ? 0 : volume;
    audio.muted = false;
  }, [volume, muted]);

  /* =======================================================
     OFFICE SOUND
  ======================================================= */

  useEffect(() => {
    const keyboard = keyboardRef.current;

    if (!keyboard) {
      return;
    }

    keyboard.volume = 0.5;
    keyboard.loop = true;

    if (keyboardOn) {
      keyboard.play().catch((error) => {
        console.warn(
          "Office ambience could not start:",
          error
        );
      });
    } else {
      keyboard.pause();

      try {
        keyboard.currentTime = 0;
      } catch {
        // Ignore.
      }
    }
  }, [keyboardOn]);

  /* =======================================================
     OFFICE VISUAL ANIMATION
  ======================================================= */

  useEffect(() => {
    if (!keyboardOn) {
      setActiveKeys([]);
      setOfficeText("ready.");
      return;
    }

    let timeout;

    const chars = [
      "A",
      "S",
      "D",
      "F",
      "J",
      "K",
      "L",
      ";",
      "⌘",
      "SHIFT",
      "SPACE",
      "ENTER",
    ];

    const cycle = () => {
      const selected =
        chars[Math.floor(Math.random() * chars.length)];

      const line =
        officeLines[
          Math.floor(Math.random() * officeLines.length)
        ];

      setActiveKeys([selected]);
      setOfficeText(line);

      timeout = setTimeout(() => {
        setActiveKeys([]);

        timeout = setTimeout(
          cycle,
          120 + Math.random() * 800
        );
      }, 55 + Math.random() * 130);
    };

    cycle();

    return () => {
      clearTimeout(timeout);
    };
  }, [keyboardOn]);

  /* =======================================================
     METADATA
  ======================================================= */

  const loadMetadata = useCallback(
    async (track) => {
      if (!track?.id || !track?.file) {
        return null;
      }

      const cached =
        metadataCacheRef.current.get(track.id);

      if (cached) {
        return cached;
      }

      const existingRequest =
        metadataRequestsRef.current.get(track.id);

      if (existingRequest) {
        return existingRequest;
      }

      const request = (async () => {
        try {
          let response = await fetch(track.file, {
            headers: {
              Range: `bytes=0-${METADATA_INITIAL_BYTES - 1}`,
            },
            cache: "force-cache",
          });

          if (!response.ok) {
            throw new Error(
              `Metadata range request failed: ${response.status}`
            );
          }

          const blob = await response.blob();

          let parsed;

          try {
            parsed = await parseBlob(blob, {
              duration: false,
            });
          } catch {
            response = await fetch(track.file, {
              headers: {
                Range: `bytes=0-${METADATA_MAX_BYTES - 1}`,
              },
              cache: "force-cache",
            });

            if (!response.ok) {
              throw new Error(
                `Metadata retry failed: ${response.status}`
              );
            }

            const largerBlob =
              await response.blob();

            parsed = await parseBlob(largerBlob, {
              duration: false,
            });
          }

          const metadata =
            normalizeMetadata(parsed);

          if (
            !metadata.title &&
            !metadata.artist &&
            !metadata.album
          ) {
            return null;
          }

          metadataCacheRef.current.set(
            track.id,
            metadata
          );

          setCurrentSong((currentTrack) => {
            if (
              !currentTrack ||
              currentTrack.id !== track.id
            ) {
              return currentTrack;
            }

            return {
              ...currentTrack,
              ...metadata,
            };
          });

          setPlaylists((previous) =>
            previous.map((playlist) => ({
              ...playlist,
              tracks: playlist.tracks?.map(
                (item) =>
                  item.id === track.id
                    ? {
                        ...item,
                        ...metadata,
                      }
                    : item
              ),
            }))
          );

          return metadata;
        } catch (error) {
          console.warn(
            "Metadata could not be loaded:",
            track.file,
            error
          );

          return null;
        } finally {
          metadataRequestsRef.current.delete(
            track.id
          );
        }
      })();

      metadataRequestsRef.current.set(
        track.id,
        request
      );

      return request;
    },
    []
  );

  /* =======================================================
     PRELOAD METADATA
  ======================================================= */

  const preloadTrack = useCallback(
    (track) => {
      if (!track) {
        return;
      }

      loadMetadata(track).catch(() => {});
    },
    [loadMetadata]
  );

  /* =======================================================
     PRELOAD NEXT / PREVIOUS
  ======================================================= */

  useEffect(() => {
    if (
      !currentSong ||
      !currentPlaylist?.tracks?.length
    ) {
      return;
    }

    const index =
      currentPlaylist.tracks.findIndex(
        (item) => item.id === currentSong.id
      );

    if (index < 0) {
      return;
    }

    const nextIndex =
      (index + 1) %
      currentPlaylist.tracks.length;

    const previousIndex =
      (index - 1 +
        currentPlaylist.tracks.length) %
      currentPlaylist.tracks.length;

    preloadTrack(
      currentPlaylist.tracks[nextIndex]
    );

    preloadTrack(
      currentPlaylist.tracks[previousIndex]
    );
  }, [
    currentSong,
    currentPlaylist,
    preloadTrack,
  ]);

  /* =======================================================
     CHANGE SONG
  ======================================================= */

  const changeSong = useCallback(
    (index, autoPlay = true) => {
      const playlist =
        currentPlaylistRef.current;

      if (!playlist?.tracks?.length) {
        return;
      }

      if (
        index < 0 ||
        index >= playlist.tracks.length
      ) {
        return;
      }

      const nextSong =
        playlist.tracks[index];

      /*
       * Tell the audio source effect
       * to automatically start playback.
       */

      resumeAfterTrackChangeRef.current =
        Boolean(autoPlay);

      const audio =
        audioRef.current;

      if (audio) {
        audio.pause();

        try {
          audio.currentTime = 0;
        } catch {
          // Ignore.
        }
      }

      setCurrent(index);
      setCurrentSong(nextSong);
      setProgress(0);
      setDuration(0);
      setPlaying(false);

      preloadTrack(nextSong);
    },
    [preloadTrack]
  );

  /* =======================================================
     CHANGE PLAYLIST
     
     This ONLY changes the playlist being viewed.
     It never changes the current song.
  ======================================================= */

  const changePlaylist = useCallback(
    (playlistId) => {
      const playlist =
        playlists.find(
          (item) => item.id === playlistId
        );

      if (!playlist) {
        return;
      }

      setSelectedPlaylistId(playlistId);
    },
    [playlists]
  );

  /* =======================================================
     NEXT
  ======================================================= */

  const next = useCallback(() => {
    const playlist =
      currentPlaylistRef.current;

    const song =
      currentSongRef.current;

    if (!playlist?.tracks?.length) {
      return;
    }

    const playingIndex =
      playlist.tracks.findIndex(
        (item) => item.id === song?.id
      );

    const nextIndex =
      playingIndex >= 0
        ? (playingIndex + 1) %
          playlist.tracks.length
        : 0;

    changeSong(nextIndex, true);
  }, [changeSong]);

  /* =======================================================
     PREVIOUS
  ======================================================= */

  const previous = useCallback(() => {
    const playlist =
      currentPlaylistRef.current;

    const song =
      currentSongRef.current;

    if (!playlist?.tracks?.length) {
      return;
    }

    const audio =
      audioRef.current;

    if (
      audio &&
      audio.currentTime > 3
    ) {
      audio.currentTime = 0;
      setProgress(0);
      return;
    }

    const playingIndex =
      playlist.tracks.findIndex(
        (item) => item.id === song?.id
      );

    const safeIndex =
      playingIndex >= 0
        ? playingIndex
        : 0;

    const previousIndex =
      (safeIndex -
        1 +
        playlist.tracks.length) %
      playlist.tracks.length;

    changeSong(
      previousIndex,
      true
    );
  }, [changeSong]);

  /* =======================================================
     CHANGE AUDIO SOURCE
     
     Automatically plays the newly selected song.
  ======================================================= */

  useEffect(() => {
    const audio =
      audioRef.current;

    if (
      !audio ||
      !currentSong?.file
    ) {
      return;
    }

    let cancelled = false;

    const updateSource = async () => {
      await new Promise((resolve) =>
        requestAnimationFrame(resolve)
      );

      if (cancelled) {
        return;
      }

      if (
        !resumeAfterTrackChangeRef.current
      ) {
        return;
      }

      resumeAfterTrackChangeRef.current =
        false;

      try {
        /*
         * Explicitly reload the new source.
         *
         * This makes Next / Previous reliable
         * even when React reuses the audio element.
         */

        audio.load();

        await audio.play();

        if (cancelled) {
          return;
        }

        setPlaying(true);

        preloadTrack(currentSong);
      } catch (error) {
        console.error(
          "Unable to automatically play:",
          error
        );

        if (!cancelled) {
          setPlaying(false);
        }
      }
    };

    updateSource();

    return () => {
      cancelled = true;
    };
  }, [
    currentSong?.file,
    preloadTrack,
  ]);

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  const togglePlay = async () => {
    const audio =
      audioRef.current;

    if (
      !audio ||
      !currentSong?.file
    ) {
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();

        setPlaying(true);

        preloadTrack(currentSong);
      } else {
        audio.pause();

        setPlaying(false);
      }
    } catch (error) {
      console.error(
        "Unable to play:",
        error
      );

      setPlaying(false);
    }
  };

  /* =======================================================
     AUDIO EVENTS
  ======================================================= */

  const handleLoadedMetadata = (
    event
  ) => {
    const value =
      event.currentTarget.duration;

    if (Number.isFinite(value)) {
      setDuration(value);
    }
  };

  const handleDurationChange = (
    event
  ) => {
    const value =
      event.currentTarget.duration;

    if (Number.isFinite(value)) {
      setDuration(value);
    }
  };

  const handleTimeUpdate = (
    event
  ) => {
    setProgress(
      event.currentTarget.currentTime
    );
  };

  /* =======================================================
     WALLPAPER
  ======================================================= */

  const handleWallpaperChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const imageUrl =
      URL.createObjectURL(file);

    setWallpaper(imageUrl);
  };

  /* =======================================================
     WALLPAPER CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      if (
        wallpaper?.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          wallpaper
        );
      }
    };
  }, [wallpaper]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loadingMusic) {
    return (
      <main className="page loading-page">
        <div className="loading-content">
          <Code2 size={18} />

          <span>
            loading playlist...
          </span>
        </div>
      </main>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main
      className="page"
      style={{
        "--wallpaper": `url("${wallpaper}")`,
      }}
    >
      <div className="bg-image" />
      <div className="bg-vignette" />
      <div className="grain" />

      {/* =================================================
          WALLPAPER
      ================================================= */}

      <input
        id="wallpaper-input"
        className="wallpaper-input"
        type="file"
        accept="image/*"
        onChange={handleWallpaperChange}
      />

      {/* =================================================
          TOPBAR
      ================================================= */}

      <header className="topbar">
        <div className="brand">
          <Code2 size={15} />
          <span>DEV MODE</span>
        </div>

        <div className="status">
          <span className="status-dot" />

          {keyboardOn
            ? officeText
            : "focus mode"}
        </div>

        <button
          type="button"
          className={`office-top-button ${
            keyboardOn ? "on" : ""
          }`}
          onClick={() =>
            setKeyboardOn(
              (value) => !value
            )
          }
          aria-label="Toggle office sounds"
          aria-pressed={keyboardOn}
        >
          <Keyboard size={15} />

          <span>
            Office sounds
          </span>

          <span className="office-status">
            {keyboardOn
              ? "ON · 50%"
              : "OFF"}
          </span>
        </button>
      </header>

      {/* =================================================
          HERO
      ================================================= */}

      <section className="hero">
        <div className="hero-grid">

          <div className="hero-copy">

            <div className="hero-kicker">
              <span className="live-dot" />

              SOFTWARE DEVELOPER · SESSION 01
            </div>

            <h1>
              Build in silence.
              <br />
              <em>
                Ship with sound.
              </em>
            </h1>

            <p className="intro">
              Your private workspace for late-night debugging,
              focused coding and the soundtrack that keeps
              the terminal moving.
            </p>

            {/* =================================================
                CORRECT GLOBAL COUNTS
            ================================================= */}

            <div className="hero-meta">

              <div className="meta-card">
                <span>
                  SESSION
                </span>

                <strong>
                  DEEP WORK
                </strong>
              </div>

              <div className="meta-card">
                <span>
                  PLAYLISTS
                </span>

                <strong>
                  {playlists.length
                    .toString()
                    .padStart(2, "0")}
                </strong>
              </div>

              <div className="meta-card">
                <span>
                  TRACKS
                </span>

                <strong>
                  {totalTracks}
                </strong>
              </div>

            </div>

            <div className="hero-note">
              <Activity size={14} />

              <span>
                focus mode / distraction level: low
              </span>
            </div>

          </div>

          {/* =================================================
              WORKSPACE
          ================================================= */}

          <div className="workspace">

            {/* =================================================
                TERMINAL
            ================================================= */}

            <div className="terminal">

              <div className="terminal-head">

                <span className="dots">
                  <i />
                  <i />
                  <i />
                </span>

                <span>
                  ~/workspace
                </span>

                <span className="mac">
                  ●
                </span>

              </div>

              <div className="terminal-body">

                <div>
                  <b>$</b>{" "}
                  {terminalCommand.command}
                </div>

                <div className="output">
                  {terminalCommand.output}
                </div>

                <div>
                  <b>$</b>{" "}
                  ./playlist --start
                </div>

                <div className="output">
                  {officeText}
                </div>

                <div>
                  <b>$</b>{" "}
                  {terminalCommands[
                    (terminalIndex + 1) %
                      terminalCommands.length
                  ].command}
                </div>

                <div className="cursor-line">
                  <span className="prompt">
                    ›
                  </span>

                  <span className="blink">
                    █
                  </span>
                </div>

              </div>
            </div>

            {/* =================================================
                PLAYER
            ================================================= */}

            <div className="player-card">

              {/* =================================================
                  COVER
              ================================================= */}

              <div
                className="cover"
                style={
                  currentSong?.picture
                    ? {
                        backgroundImage:
                          `url("${currentSong.picture}")`,
                        backgroundSize:
                          "cover",
                        backgroundPosition:
                          "center",
                      }
                    : undefined
                }
              >

                {!currentSong?.picture && (
                  <>
                    <div className="label">
                      DEV
                      <br />
                      MIX
                    </div>

                    <div className="cover-code">
                      {"{ }"}
                    </div>

                    <div className="cover-title">
                      DEEP
                      <br />
                      <span>
                        WORK
                      </span>
                    </div>

                    <div className="cover-small">
                      BUILD · SHIP · REPEAT
                    </div>
                  </>
                )}

              </div>

              {/* =================================================
                  PLAYER
              ================================================= */}

              <div className="player">

                <div className="now">

                  <div className="now-text">

                    <div className="tiny">
                      NOW PLAYING
                    </div>

                    <h2>
                      {currentSong?.title ||
                        "No song selected"}
                    </h2>

                    <p>
                      {currentSong?.artist ||
                        "DEV MODE"}
                    </p>

                    {currentSong?.album && (
                      <small className="now-album">
                        {currentSong.album}
                      </small>
                    )}

                  </div>

                  <Coffee
                    size={19}
                    strokeWidth={1.5}
                  />

                </div>

                {/* =================================================
                    AUDIO
                ================================================= */}

                {currentSong?.file && (
                  <audio
                    ref={audioRef}
                    src={currentSong.file}
                    preload="metadata"

                    onLoadedMetadata={
                      handleLoadedMetadata
                    }

                    onDurationChange={
                      handleDurationChange
                    }

                    onTimeUpdate={
                      handleTimeUpdate
                    }

                    onPlay={() =>
                      setPlaying(true)
                    }

                    onPause={() =>
                      setPlaying(false)
                    }

                    onEnded={next}

                    onError={() => {
                      console.error(
                        "Could not load audio:",
                        currentSong.file
                      );

                      setPlaying(false);

                      setMusicError(
                        "This audio file could not be played."
                      );
                    }}
                  />
                )}

                {/* =================================================
                    OFFICE AUDIO
                ================================================= */}

                <audio
                  ref={keyboardRef}
                  src="/sounds/keyboard.mp3"
                  preload="auto"
                  loop
                />

                {/* =================================================
                    SEEK
                ================================================= */}

                <input
                  className="seek"
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={Math.min(
                    progress,
                    duration || 0
                  )}
                  disabled={
                    !currentSong ||
                    !duration
                  }
                  onChange={(event) => {
                    const value =
                      Number(
                        event.target.value
                      );

                    if (
                      audioRef.current
                    ) {
                      audioRef.current.currentTime =
                        value;
                    }

                    setProgress(value);
                  }}
                  style={{
                    "--value": `${
                      duration
                        ? Math.min(
                            100,
                            (progress /
                              duration) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                  aria-label="Song progress"
                />

                {/* =================================================
                    TIMES
                ================================================= */}

                <div className="times">

                  <span>
                    {formatTime(progress)}
                  </span>

                  <span>
                    {formatTime(duration)}
                  </span>

                </div>

                {/* =================================================
                    CONTROLS
                ================================================= */}

                <div className="controls">

                  <button
                    type="button"
                    onClick={previous}
                    aria-label="Previous track"
                  >
                    <SkipBack size={19} />
                  </button>

                  <button
                    type="button"
                    className="play"
                    onClick={togglePlay}
                    aria-label={
                      playing
                        ? "Pause"
                        : "Play"
                    }
                  >

                    {playing ? (
                      <Pause
                        size={21}
                        strokeWidth={2}
                      />
                    ) : (
                      <Play
                        size={21}
                        strokeWidth={2}
                      />
                    )}

                  </button>

                  <button
                    type="button"
                    onClick={next}
                    aria-label="Next track"
                  >
                    <SkipForward size={19} />
                  </button>

                </div>

                {/* =================================================
                    BOTTOM CONTROLS
                ================================================= */}

                <div className="bottom-controls">

                  <button
                    type="button"
                    className="playlist-button"
                    onClick={() =>
                      setShowPlaylist(true)
                    }
                    disabled={
                      !playlists.length
                    }
                  >

                    <ListMusic size={16} />

                    <span>
                      {currentPlaylist?.name ||
                        "No playlists"}
                    </span>

                    <ChevronDown size={15} />

                  </button>

                  <div className="volume">

                    <button
                      type="button"
                      className="volume-button"
                      onClick={() =>
                        setMuted(
                          (value) => !value
                        )
                      }
                      aria-label={
                        muted
                          ? "Unmute"
                          : "Mute"
                      }
                    >

                      {muted ? (
                        <VolumeX size={17} />
                      ) : (
                        <Volume2 size={17} />
                      )}

                    </button>

                    <input
                      className="volume-slider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={
                        muted
                          ? 0
                          : volume
                      }
                      style={{
                        "--volume": `${
                          (muted
                            ? 0
                            : volume) * 100
                        }%`,
                      }}
                      onChange={(event) => {
                        const newVolume =
                          Number(
                            event.target.value
                          );

                        setVolume(
                          newVolume
                        );

                        setMuted(
                          newVolume === 0
                        );

                        if (
                          audioRef.current
                        ) {
                          audioRef.current.volume =
                            newVolume;

                          audioRef.current.muted =
                            false;
                        }
                      }}
                      aria-label="Music volume"
                    />

                  </div>
                </div>

                {/* =================================================
                    PLAYLIST SUMMARY
                ================================================= */}

                <div className="playlist-summary">

                  <span>
                    {currentPlaylist?.tracks
                      ?.length || 0}{" "}
                    tracks
                  </span>

                  <span>
                    {currentPlaylist?.name ||
                      "Playlist"}
                  </span>

                </div>

                {/* =================================================
                    WALLPAPER
                ================================================= */}

                <label
                  htmlFor="wallpaper-input"
                  className="add-wallpaper"
                >
                  <span>
                    Choose Wallpaper
                  </span>
                </label>

                {musicError && (
                  <div className="music-error">
                    {musicError}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          PLAYLIST MODAL
      ================================================= */}

      {showPlaylist && (
        <div
          className="playlist-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowPlaylist(false);
            }
          }}
        >

          <div
            className="playlist-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Playlist selector"
          >

            <div className="playlist-modal-header">

              <div>

                <div className="tiny">
                  PLAYLISTS
                </div>

                <h3>
                  Choose your session
                </h3>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setShowPlaylist(false)
                }
                aria-label="Close playlist"
              >
                <X size={18} />
              </button>

            </div>

            {/* =================================================
                PLAYLIST TABS
            ================================================= */}

            <div className="playlist-tabs">

              {playlists.map(
                (playlist) => (

                  <button
                    type="button"
                    key={playlist.id}
                    className={`playlist-tab ${
                      playlist.id ===
                      selectedPlaylistId
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      changePlaylist(
                        playlist.id
                      )
                    }
                  >

                    <span>
                      {playlist.name}
                    </span>

                    <small>
                      {playlist.tracks?.length ||
                        0}
                    </small>

                  </button>
                )
              )}

            </div>

            {/* =================================================
                SONG HEADER
            ================================================= */}

            <div className="modal-song-heading">

              <span>
                {currentPlaylist?.name ||
                  "Songs"}
              </span>

              <small>
                {currentPlaylist?.tracks
                  ?.length || 0}{" "}
                songs
              </small>

            </div>

            {/* =================================================
                SONG LIST
            ================================================= */}

            <div className="modal-song-list">

              {currentPlaylist?.tracks?.map(
                (item, index) => (

                  <button
                    type="button"
                    key={
                      item.id ||
                      item.file ||
                      `${item.title}-${index}`
                    }
                    className={`modal-track ${
                      item.id ===
                      currentSong?.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      changeSong(
                        index,
                        true
                      );

                      setShowPlaylist(
                        false
                      );
                    }}
                  >

                    <span className="track-number">
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                    </span>

                    <span className="track-details">

                      <strong>
                        {item.title ||
                          "Unknown title"}
                      </strong>

                      <small>
                        {item.artist ||
                          "Unknown artist"}
                      </small>

                      {item.album && (
                        <em>
                          {item.album}
                        </em>
                      )}

                    </span>

                    <span className="track-action">

                      {item.id ===
                        currentSong?.id &&
                        playing ? (

                        <span className="bars">
                          <i />
                          <i />
                          <i />
                        </span>

                      ) : (

                        <Play size={15} />

                      )}

                    </span>

                  </button>
                )
              )}

              {!currentPlaylist?.tracks
                ?.length && (

                <div className="empty-playlist">
                  No songs found in this
                  playlist.
                </div>

              )}

            </div>
          </div>
        </div>
      )}

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer>

        <span>
          COFFEE · CODE · MUSIC
        </span>

        <span>
          SESSION 01 · 2026
        </span>

      </footer>

    </main>
  );
}

