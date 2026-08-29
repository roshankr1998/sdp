
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef, useState } from "react";

import {
  ChevronDown,
  Code2,
  Coffee,
  Headphones,
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

/* =========================================================
   OFFICE TEXT
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
   FORMAT TIME
========================================================= */

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  return `${Math.floor(seconds / 60)}:${Math.floor(
    seconds % 60
  )
    .toString()
    .padStart(2, "0")}`;
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

  /* =======================================================
     STATE
  ======================================================= */

  const [wallpaper, setWallpaper] = useState("/wallpaper.jpg");

  /* -------------------------------------------------------
     MUSIC DATA
  ------------------------------------------------------- */

  const [playlists, setPlaylists] = useState([]);
  const [loadingMusic, setLoadingMusic] = useState(true);
  const [musicError, setMusicError] = useState("");

  /* -------------------------------------------------------
     PLAYLIST
  ------------------------------------------------------- */

  const [selectedPlaylistId, setSelectedPlaylistId] =
    useState(null);

  const [current, setCurrent] = useState(0);

  const [showPlaylist, setShowPlaylist] = useState(false);

  /* -------------------------------------------------------
     PLAYER
  ------------------------------------------------------- */

  const [playing, setPlaying] = useState(false);

  const [progress, setProgress] = useState(0);

  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(0.82);

  const [muted, setMuted] = useState(false);

  /* -------------------------------------------------------
     KEYBOARD AMBIENCE
  ------------------------------------------------------- */

  const [keyboardOn, setKeyboardOn] = useState(false);

  const [activeKeys, setActiveKeys] = useState([]);

  const [officeText, setOfficeText] = useState("ready.");

  /* -------------------------------------------------------
     WALLPAPER
  ------------------------------------------------------- */

  const [wallpaperInput, setWallpaperInput] = useState(null);

  /* =======================================================
     LOAD MUSIC FROM API
     
     The API scans:
     
       public/music/
          playlist-folder/
              song.mp3
              another-song.mp3
     
     No songs are hardcoded here.
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

        const loadedPlaylists = Array.isArray(
          data.playlists
        )
          ? data.playlists
          : [];

        setPlaylists(loadedPlaylists);

        if (loadedPlaylists.length > 0) {
          setSelectedPlaylistId(
            loadedPlaylists[0].id
          );
        }
      } catch (error) {
        console.error(
          "Failed to load music:",
          error
        );

        if (!cancelled) {
          setMusicError(
            "Unable to load music from public/music."
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
     CURRENT PLAYLIST
  ======================================================= */

  const currentPlaylist =
    playlists.find(
      (playlist) =>
        playlist.id === selectedPlaylistId
    ) || null;

  /* =======================================================
     CURRENT SONG
  ======================================================= */

  const song =
    currentPlaylist?.tracks?.[current] || null;

  /* =======================================================
     AUDIO VOLUME
  ======================================================= */

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.volume = volume;
    audioRef.current.muted = muted;
  }, [volume, muted]);

  /* =======================================================
     LOAD CURRENT SONG
     
     Important:
     audio is only rendered when song.file exists.
  ======================================================= */

  useEffect(() => {
    if (!audioRef.current || !song?.file) {
      return;
    }

    audioRef.current.load();

    setProgress(0);
    setDuration(0);
  }, [song?.file]);

  /* =======================================================
     KEYBOARD AUDIO
     
     ALWAYS 18%
  ======================================================= */

  useEffect(() => {
    if (!keyboardRef.current) {
      return;
    }

    keyboardRef.current.volume = 0.60;
    keyboardRef.current.loop = true;

    if (keyboardOn) {
      keyboardRef.current
        .play()
        .catch((error) => {
          console.warn(
            "Keyboard ambience could not start:",
            error
          );
        });
    } else {
      keyboardRef.current.pause();
      keyboardRef.current.currentTime = 0;
    }
  }, [keyboardOn]);

  /* =======================================================
     KEYBOARD VISUAL ANIMATION
  ======================================================= */

  useEffect(() => {
    if (!keyboardOn) {
      setActiveKeys([]);
      return;
    }

    let timer;

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
        chars[
          Math.floor(
            Math.random() * chars.length
          )
        ];

      setActiveKeys([selected]);

      setOfficeText(
        officeLines[
          Math.floor(
            Math.random() *
              officeLines.length
          )
        ]
      );

      timer = setTimeout(() => {
        setActiveKeys([]);

        timer = setTimeout(
          cycle,
          120 + Math.random() * 800
        );
      }, 55 + Math.random() * 130);
    };

    cycle();

    return () => {
      clearTimeout(timer);
    };
  }, [keyboardOn]);

  /* =======================================================
     CHANGE PLAYLIST
  ======================================================= */

  const changePlaylist = (playlistId) => {
    const newPlaylist = playlists.find(
      (item) => item.id === playlistId
    );

    if (!newPlaylist) {
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setSelectedPlaylistId(playlistId);
    setCurrent(0);
    setProgress(0);
    setDuration(0);
    setPlaying(false);
  };

  /* =======================================================
     CHANGE SONG
  ======================================================= */

  const changeSong = (
    index,
    autoPlay = true
  ) => {
    if (!currentPlaylist?.tracks?.length) {
      return;
    }

    if (
      index < 0 ||
      index >= currentPlaylist.tracks.length
    ) {
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setCurrent(index);
    setProgress(0);
    setDuration(0);

    if (autoPlay) {
      setTimeout(() => {
        audioRef.current
          ?.play()
          .then(() => {
            setPlaying(true);
          })
          .catch((error) => {
            console.warn(
              "Audio playback failed:",
              error
            );

            setPlaying(false);
          });
      }, 100);
    } else {
      setPlaying(false);
    }
  };

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  const togglePlay = () => {
    if (!audioRef.current || !song?.file) {
      return;
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    audioRef.current
      .play()
      .then(() => {
        setPlaying(true);
      })
      .catch((error) => {
        console.error(
          "Unable to play song:",
          error
        );

        setPlaying(false);
      });
  };

  /* =======================================================
     NEXT
  ======================================================= */

  const next = () => {
    if (!currentPlaylist?.tracks?.length) {
      return;
    }

    const nextIndex =
      (current + 1) %
      currentPlaylist.tracks.length;

    changeSong(nextIndex, true);
  };

  /* =======================================================
     PREVIOUS
  ======================================================= */

  const previous = () => {
    if (!currentPlaylist?.tracks?.length) {
      return;
    }

    if (
      audioRef.current &&
      audioRef.current.currentTime > 3
    ) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      return;
    }

    const previousIndex =
      (current -
        1 +
        currentPlaylist.tracks.length) %
      currentPlaylist.tracks.length;

    changeSong(previousIndex, true);
  };

  /* =======================================================
     WALLPAPER
  ======================================================= */

  const handleWallpaperChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (wallpaperInput) {
      URL.revokeObjectURL(wallpaperInput);
    }

    const imageUrl =
      URL.createObjectURL(file);

    setWallpaperInput(imageUrl);
    setWallpaper(imageUrl);
  };

  /* =======================================================
     PLAYLIST POPUP
  ======================================================= */

  const openPlaylist = () => {
    setShowPlaylist(true);
  };

  const closePlaylist = () => {
    setShowPlaylist(false);
  };

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
      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="bg-image" />

      <div className="bg-vignette" />

      <div className="grain" />

      {/* =================================================
          WALLPAPER INPUT
      ================================================= */}

      <input
        id="wallpaper-input"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleWallpaperChange}
      />

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="topbar">
        <div className="brand">
          <Code2 size={15} />

          <span>DEV MODE</span>
        </div>

        <div className="status">
          <span />

          {keyboardOn
            ? officeText
            : "focus mode"}
        </div>

        <div className="top-actions" />
      </header>

      {/* =================================================
          HERO
      ================================================= */}

      <section className="hero">
        <div className="eyebrow">
          SOFTWARE DEVELOPER PLAYLIST · SESSION 01
        </div>

        <h1>
          Code hard.
          <br />
          <em>Listen harder.</em>
        </h1>

        <p className="intro">
          A soundtrack for debugging at
          2 AM, shipping at 5 PM, staring
          at a terminal and convincing
          yourself the bug is not in
          production.
        </p>

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

              <span>~/workspace</span>

              <span className="mac">●</span>
            </div>

            <div className="terminal-body">
              <div>
                <b>$</b> whoami
              </div>

              <div className="output">
                software_developer
              </div>

              <div>
                <b>$</b> status
              </div>

              <div className="output">
                building something good...
              </div>

              <div>
                <b>$</b> ./playlist --start
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

            <div className="cover">
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
                <span>WORK</span>
              </div>

              <div className="cover-small">
                BUILD · SHIP · REPEAT
              </div>
            </div>

            {/* =================================================
                PLAYER BODY
            ================================================= */}

            <div className="player">
              {/* =================================================
                  NOW PLAYING
              ================================================= */}

              <div className="now">
                <div>
                  <div className="tiny">
                    NOW PLAYING
                  </div>

                  <h2>
                    {loadingMusic
                      ? "Loading..."
                      : song?.title ||
                        "No song selected"}
                  </h2>

                  <p>
                    {song?.artist ||
                      "DEV MODE"}
                  </p>
                </div>

                <Coffee
                  size={19}
                  strokeWidth={1.5}
                />
              </div>

              {/* =================================================
                  MAIN AUDIO

                  IMPORTANT:
                  No empty src is ever rendered.
              ================================================= */}

              {song?.file ? (
                <audio
                  ref={audioRef}
                  src={song.file}
                  preload="metadata"
                  onLoadedMetadata={(event) => {
                    setDuration(
                      event.currentTarget.duration
                    );
                  }}
                  onTimeUpdate={(event) => {
                    setProgress(
                      event.currentTarget.currentTime
                    );
                  }}
                  onPlay={() => {
                    setPlaying(true);
                  }}
                  onPause={() => {
                    setPlaying(false);
                  }}
                  onEnded={() => {
                    next();
                  }}
                  onError={(event) => {
                    console.error(
                      "Could not load audio:",
                      event
                    );

                    setPlaying(false);
                  }}
                />
              ) : null}

              {/* =================================================
                  KEYBOARD AUDIO
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
                disabled={!song?.file}
                onChange={(event) => {
                  const value =
                    Number(
                      event.target.value
                    );

                  if (audioRef.current) {
                    audioRef.current.currentTime =
                      value;
                  }

                  setProgress(value);
                }}
                style={{
                  "--value": `${
                    duration
                      ? (progress /
                          duration) *
                        100
                      : 0
                  }%`,
                }}
              />

              {/* =================================================
                  TIME
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
                  disabled={!song?.file}
                  aria-label="Previous track"
                >
                  <SkipBack />
                </button>

                <button
                  type="button"
                  className="play"
                  onClick={togglePlay}
                  disabled={!song?.file}
                  aria-label={
                    playing
                      ? "Pause"
                      : "Play"
                  }
                >
                  {playing ? (
                    <Pause
                      fill="currentColor"
                    />
                  ) : (
                    <Play
                      fill="currentColor"
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={next}
                  disabled={!song?.file}
                  aria-label="Next track"
                >
                  <SkipForward />
                </button>
              </div>

              {/* =================================================
                  BOTTOM CONTROLS
              ================================================= */}

              <div className="bottom-controls">
                {/* OFFICE */}

                <button
                  type="button"
                  className={`office-button ${
                    keyboardOn ? "on" : ""
                  }`}
                  onClick={() => {
                    setKeyboardOn(
                      (value) => !value
                    );
                  }}
                >
                  <Keyboard size={16} />

                  <span>
                    Office sounds
                  </span>

                  <span className="switch">
                    {keyboardOn
                      ? "ON"
                      : "OFF"}
                  </span>
                </button>

                {/* VOLUME */}

                <div className="volume">
                  <button
                    type="button"
                    onClick={() => {
                      setMuted(
                        (value) => !value
                      );
                    }}
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
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={
                      muted ? 0 : volume
                    }
                    onChange={(event) => {
                      setVolume(
                        Number(
                          event.target.value
                        )
                      );

                      setMuted(false);
                    }}
                    aria-label="Music volume"
                  />
                </div>
              </div>

              {/* =================================================
                  OFFICE CONSOLE
              ================================================= */}

              {keyboardOn && (
                <div className="office-console">
                  <div className="console-top">
                    <Headphones size={13} />

                    <span>
                      AMBIENCE
                    </span>

                    <span>
                      LIVE · 18%
                    </span>
                  </div>

                  <div className="fake-keyboard">
                    {[
                      "ESC",
                      "Q",
                      "W",
                      "E",
                      "R",
                      "T",
                      "Y",
                      "U",
                      "I",
                      "O",
                      "P",
                      "A",
                      "S",
                      "D",
                      "F",
                      "G",
                      "H",
                      "J",
                      "K",
                      "L",
                      "⌘",
                      "SHIFT",
                      "SPACE",
                      "ENTER",
                    ].map((key) => (
                      <span
                        key={key}
                        className={
                          activeKeys.includes(
                            key
                          )
                            ? "key active"
                            : "key"
                        }
                      >
                        {key}
                      </span>
                    ))}
                  </div>

                  <div className="typing-line">
                    <span>
                      ~/workspace
                    </span>

                    <b>
                      {officeText}
                    </b>
                  </div>

                  <p>
                    keyboard.mp3 · ambience
                    volume 18%
                  </p>
                </div>
              )}

              {/* =================================================
                  PLAYLIST BUTTON
              ================================================= */}

              <button
                type="button"
                className="playlist-button"
                onClick={openPlaylist}
              >
                <ListMusic size={16} />

                <span>
                  {currentPlaylist?.name ||
                    "No playlist"}
                </span>

                <ChevronDown
                  size={15}
                  className={
                    showPlaylist
                      ? "rotate"
                      : ""
                  }
                />
              </button>

              {/* =================================================
                  WALLPAPER
              ================================================= */}

              <button
                type="button"
                className="add-wallpaper"
                onClick={() => {
                  document
                    .getElementById(
                      "wallpaper-input"
                    )
                    ?.click();
                }}
              >
                Add Your Wallpaper
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          PLAYLIST POPUP
      ================================================= */}

      {showPlaylist && (
        <div
          className="playlist-overlay"
          onClick={closePlaylist}
        >
          <div
            className="playlist-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* HEADER */}

            <div className="playlist-modal-header">
              <div>
                <div className="playlist-modal-label">
                  PLAYLIST
                </div>

                <h3>
                  {currentPlaylist?.name ||
                    "Playlist"}
                </h3>

                <p>
                  {currentPlaylist?.tracks
                    ?.length || 0}{" "}
                  tracks
                </p>
              </div>

              <button
                type="button"
                className="playlist-close"
                onClick={closePlaylist}
                aria-label="Close playlist"
              >
                <X size={18} />
              </button>
            </div>

            {/* PLAYLIST SELECTOR */}

            <div className="playlist-tabs">
              {playlists.map(
                (playlist) => (
                  <button
                    type="button"
                    key={playlist.id}
                    className={
                      playlist.id ===
                      selectedPlaylistId
                        ? "playlist-tab active"
                        : "playlist-tab"
                    }
                    onClick={() => {
                      changePlaylist(
                        playlist.id
                      );
                    }}
                  >
                    <span>
                      {playlist.name}
                    </span>

                    <small>
                      {
                        playlist.tracks
                          .length
                      }
                    </small>
                  </button>
                )
              )}
            </div>

            {/* SONGS */}

            <div className="playlist-modal-list">
              {loadingMusic && (
                <div className="playlist-empty">
                  Loading music...
                </div>
              )}

              {!loadingMusic &&
                musicError && (
                  <div className="playlist-empty error">
                    {musicError}
                  </div>
                )}

              {!loadingMusic &&
                !musicError &&
                currentPlaylist?.tracks
                  ?.length === 0 && (
                  <div className="playlist-empty">
                    This playlist is empty.
                  </div>
                )}

              {!loadingMusic &&
                !musicError &&
                currentPlaylist?.tracks?.map(
                  (item, index) => (
                    <button
                      type="button"
                      key={
                        item.file ||
                        `${item.title}-${index}`
                      }
                      className={`playlist-track ${
                        index === current
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        changeSong(
                          index,
                          true
                        );

                        closePlaylist();
                      }}
                    >
                      <span className="playlist-track-number">
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </span>

                      <span className="playlist-track-main">
                        <strong>
                          {item.title ||
                            "Unknown title"}
                        </strong>

                        <small>
                          {item.artist ||
                            "Unknown artist"}
                        </small>
                      </span>

                      {index === current &&
                        playing && (
                          <span className="bars">
                            <i />
                            <i />
                            <i />
                          </span>
                        )}
                    </button>
                  )
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

