/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

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

  const minutes =
    Math.floor(seconds / 60);

  const remaining =
    Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");

  return `${minutes}:${remaining}`;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Home() {
  /* =======================================================
     REFS
  ======================================================= */

  const audioRef =
    useRef(null);

  const keyboardRef =
    useRef(null);

  /* =======================================================
     MUSIC
  ======================================================= */

  const [
    playlists,
    setPlaylists,
  ] = useState([]);

  const [
    musicLoading,
    setMusicLoading,
  ] = useState(true);

  const [
    musicError,
    setMusicError,
  ] = useState("");

  /* =======================================================
     WALLPAPER

     Put your wallpaper at:

     public/wallpaper.jpg

     We don't use an empty src.
  ======================================================= */

  const [wallpaper, setWallpaper] =
    useState("/wallpaper.jpg");

  /* =======================================================
     PLAYLIST
  ======================================================= */

  const [
    selectedPlaylistId,
    setSelectedPlaylistId,
  ] = useState("");

  const [
    current,
    setCurrent,
  ] = useState(0);

  const [
    showPlaylist,
    setShowPlaylist,
  ] = useState(false);

  /* =======================================================
     PLAYER
  ======================================================= */

  const [
    playing,
    setPlaying,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    duration,
    setDuration,
  ] = useState(0);

  const [
    volume,
    setVolume,
  ] = useState(0.82);

  const [
    muted,
    setMuted,
  ] = useState(false);

  /* =======================================================
     KEYBOARD AMBIENCE
  ======================================================= */

  const [
    keyboardOn,
    setKeyboardOn,
  ] = useState(false);

  const [
    activeKeys,
    setActiveKeys,
  ] = useState([]);

  const [
    officeText,
    setOfficeText,
  ] = useState("ready.");

  /* =======================================================
     LOAD MUSIC FROM API
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadMusic() {
      try {
        setMusicLoading(true);
        setMusicError("");

        const response =
          await fetch(
            "/api/music",
            {
              cache: "no-store",
            }
          );

        if (!response.ok) {
          throw new Error(
            `Music API returned ${response.status}`
          );
        }

        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        const loadedPlaylists =
          Array.isArray(
            data.playlists
          )
            ? data.playlists
            : [];

        setPlaylists(
          loadedPlaylists
        );

        if (
          loadedPlaylists.length >
            0
        ) {
          setSelectedPlaylistId(
            loadedPlaylists[0].id
          );
        }
      } catch (error) {
        console.error(
          "Could not load playlists:",
          error
        );

        if (!cancelled) {
          setMusicError(
            "Unable to load music from public/music."
          );
        }
      } finally {
        if (!cancelled) {
          setMusicLoading(false);
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
        playlist.id ===
        selectedPlaylistId
    ) ||
    playlists[0] ||
    null;

  /* =======================================================
     CURRENT SONG
  ======================================================= */

  const song =
    currentPlaylist?.tracks?.[
      current
    ] || null;

  /* =======================================================
     RESET CURRENT INDEX WHEN
     PLAYLIST CHANGES
  ======================================================= */

  useEffect(() => {
    setCurrent(0);
    setProgress(0);
    setDuration(0);
    setPlaying(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [selectedPlaylistId]);

  /* =======================================================
     MUSIC VOLUME
  ======================================================= */

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.volume =
      volume;

    audioRef.current.muted =
      muted;
  }, [volume, muted]);

  /* =======================================================
     KEYBOARD AUDIO

     EXACTLY 18%
  ======================================================= */

  useEffect(() => {
    if (!keyboardRef.current) {
      return;
    }

    keyboardRef.current.volume =
      0.18;

    keyboardRef.current.loop =
      true;

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

      keyboardRef.current.currentTime =
        0;
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
            Math.random() *
              chars.length
          )
        ];

      setActiveKeys([
        selected,
      ]);

      setOfficeText(
        officeLines[
          Math.floor(
            Math.random() *
              officeLines.length
          )
        ]
      );

      timer = setTimeout(
        () => {
          setActiveKeys([]);

          timer = setTimeout(
            cycle,
            120 +
              Math.random() *
                800
          );
        },
        55 +
          Math.random() * 130
      );
    };

    cycle();

    return () => {
      clearTimeout(timer);
    };
  }, [keyboardOn]);

  /* =======================================================
     PLAY SPECIFIC TRACK
  ======================================================= */

  const playTrack = (
    playlistId,
    trackIndex
  ) => {
    const targetPlaylist =
      playlists.find(
        (playlist) =>
          playlist.id ===
          playlistId
      );

    if (
      !targetPlaylist ||
      !targetPlaylist.tracks[
        trackIndex
      ]
    ) {
      return;
    }

    /*
      Close popup immediately.
    */

    setShowPlaylist(false);

    /*
      If same song is selected,
      simply play it.
    */

    if (
      selectedPlaylistId ===
        playlistId &&
      current === trackIndex &&
      audioRef.current
    ) {
      audioRef.current
        .play()
        .then(() => {
          setPlaying(true);
        })
        .catch((error) => {
          console.error(
            "Playback failed:",
            error
          );
        });

      return;
    }

    /*
      Stop current audio.
    */

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime =
        0;
    }

    setSelectedPlaylistId(
      playlistId
    );

    setCurrent(
      trackIndex
    );

    setProgress(0);
    setDuration(0);

    /*
      Wait for React to update
      the audio src.
    */

    setTimeout(() => {
      if (!audioRef.current) {
        return;
      }

      audioRef.current
        .play()
        .then(() => {
          setPlaying(true);
        })
        .catch((error) => {
          console.error(
            "Playback failed:",
            error
          );

          setPlaying(false);
        });
    }, 150);
  };

  /* =======================================================
     PLAYLIST CHANGE
  ======================================================= */

  const changePlaylist = (
    playlistId
  ) => {
    const playlist =
      playlists.find(
        (item) =>
          item.id ===
          playlistId
      );

    if (!playlist) {
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime =
        0;
    }

    setSelectedPlaylistId(
      playlistId
    );

    setCurrent(0);
    setProgress(0);
    setDuration(0);
    setPlaying(false);
  };

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  const togglePlay = () => {
    if (
      !audioRef.current ||
      !song
    ) {
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
    if (
      !currentPlaylist ||
      currentPlaylist.tracks.length ===
        0
    ) {
      return;
    }

    const nextIndex =
      (current + 1) %
      currentPlaylist.tracks.length;

    playTrack(
      currentPlaylist.id,
      nextIndex
    );
  };

  /* =======================================================
     PREVIOUS
  ======================================================= */

  const previous = () => {
    if (
      !currentPlaylist ||
      currentPlaylist.tracks.length ===
        0
    ) {
      return;
    }

    if (
      audioRef.current &&
      audioRef.current.currentTime >
        3
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

    playTrack(
      currentPlaylist.id,
      previousIndex
    );
  };

  /* =======================================================
     SEEK

     This is intentionally handled directly
     against the audio element.
  ======================================================= */

  const handleSeek = (
    event
  ) => {
    const value =
      Number(
        event.target.value
      );

    if (
      audioRef.current &&
      Number.isFinite(value)
    ) {
      audioRef.current.currentTime =
        value;
    }

    setProgress(value);
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
     ESCAPE KEY CLOSES PLAYLIST
  ======================================================= */

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === "Escape"
      ) {
        setShowPlaylist(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

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
        className="hidden-input"
        onChange={
          handleWallpaperChange
        }
      />

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="topbar">
        <div className="brand">
          <Code2 size={15} />

          <span>
            DEV MODE
          </span>
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
          MAIN
      ================================================= */}

      <section className="hero">
        <div className="eyebrow">
          SOFTWARE DEVELOPER PLAYLIST · SESSION 01
        </div>

        <h1>
          Code hard.
          <br />

          <em>
            Listen harder.
          </em>
        </h1>

        <p className="intro">
          A soundtrack for debugging
          at 2 AM, shipping at 5 PM,
          staring at a terminal and
          convincing yourself the bug
          is not in production.
        </p>

        {/* =================================================
            ERROR / LOADING
        ================================================= */}

        {musicLoading && (
          <div className="music-status">
            Scanning public/music...
          </div>
        )}

        {!musicLoading &&
          musicError && (
            <div className="music-status error">
              {musicError}
            </div>
          )}

        {!musicLoading &&
          !musicError &&
          playlists.length ===
            0 && (
            <div className="music-status">
              No audio files found.
              <br />
              Add playlist folders
              inside public/music.
            </div>
          )}

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
                whoami
              </div>

              <div className="output">
                software_developer
              </div>

              <div>
                <b>$</b>{" "}
                status
              </div>

              <div className="output">
                building something
                good...
              </div>

              <div>
                <b>$</b>{" "}
                ./playlist --start
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
              PLAYER CARD
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

                <span>
                  WORK
                </span>
              </div>

              <div className="cover-small">
                BUILD · SHIP · REPEAT
              </div>
            </div>

            {/* =================================================
                PLAYER
            ================================================= */}

            <div className="player">
              {/* =================================================
                  NOW PLAYING
              ================================================= */}

              <div className="now">
                <div className="now-text">
                  <div className="tiny">
                    NOW PLAYING
                  </div>

                  <h2>
                    {song?.title ||
                      "Select a song"}
                  </h2>

                  <p>
                    {song?.artist ||
                      "DEV MODE"}
                  </p>

                  {song?.album && (
                    <span className="album">
                      {song.album}
                    </span>
                  )}
                </div>

                <Coffee
                  size={19}
                  strokeWidth={1.5}
                />
              </div>

              {/* =================================================
                  MAIN AUDIO

                  IMPORTANT:
                  src is NEVER an empty string.
              ================================================= */}

              {song?.file && (
                <audio
                  ref={audioRef}
                  src={song.file}
                  preload="metadata"
                  onLoadedMetadata={(
                    event
                  ) => {
                    const newDuration =
                      event.currentTarget
                        .duration;

                    if (
                      Number.isFinite(
                        newDuration
                      )
                    ) {
                      setDuration(
                        newDuration
                      );
                    }
                  }}
                  onDurationChange={(
                    event
                  ) => {
                    const newDuration =
                      event.currentTarget
                        .duration;

                    if (
                      Number.isFinite(
                        newDuration
                      )
                    ) {
                      setDuration(
                        newDuration
                      );
                    }
                  }}
                  onTimeUpdate={(
                    event
                  ) => {
                    setProgress(
                      event.currentTarget
                        .currentTime
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
                  }}
                />
              )}

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
                  PROGRESS
              ================================================= */}

              <input
                className="seek"
                type="range"
                min="0"
                max={duration || 0}
                step="0.01"
                value={Math.min(
                  progress,
                  duration || 0
                )}
                disabled={
                  !song ||
                  !duration
                }
                onChange={
                  handleSeek
                }
                style={{
                  "--value": `${
                    duration
                      ? Math.min(
                          100,
                          Math.max(
                            0,
                            (progress /
                              duration) *
                              100
                          )
                        )
                      : 0
                  }%`,
                }}
                aria-label="Song progress"
              />

              {/* =================================================
                  TIME
              ================================================= */}

              <div className="times">
                <span>
                  {formatTime(
                    progress
                  )}
                </span>

                <span>
                  {formatTime(
                    duration
                  )}
                </span>
              </div>

              {/* =================================================
                  CONTROLS
              ================================================= */}

              <div className="controls">
                <button
                  type="button"
                  onClick={
                    previous
                  }
                  disabled={!song}
                  aria-label="Previous track"
                >
                  <SkipBack />
                </button>

                <button
                  type="button"
                  className="play"
                  onClick={
                    togglePlay
                  }
                  disabled={!song}
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
                  disabled={!song}
                  aria-label="Next track"
                >
                  <SkipForward />
                </button>
              </div>

              {/* =================================================
                  BOTTOM CONTROLS
              ================================================= */}

              <div className="bottom-controls">
                {/* OFFICE SOUNDS */}

                <button
                  type="button"
                  className={`office-button ${
                    keyboardOn
                      ? "on"
                      : ""
                  }`}
                  onClick={() => {
                    setKeyboardOn(
                      (value) =>
                        !value
                    );
                  }}
                >
                  <Keyboard
                    size={16}
                  />

                  <span>
                    Office sounds
                  </span>

                  <span className="switch">
                    {keyboardOn
                      ? "ON"
                      : "OFF"}
                  </span>
                </button>

                {/* MUSIC VOLUME */}

                <div className="volume">
                  <button
                    type="button"
                    onClick={() => {
                      setMuted(
                        (value) =>
                          !value
                      );
                    }}
                    aria-label={
                      muted
                        ? "Unmute"
                        : "Mute"
                    }
                  >
                    {muted ? (
                      <VolumeX
                        size={17}
                      />
                    ) : (
                      <Volume2
                        size={17}
                      />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={
                      muted
                        ? 0
                        : volume
                    }
                    onChange={(
                      event
                    ) => {
                      setVolume(
                        Number(
                          event
                            .target
                            .value
                        )
                      );

                      setMuted(
                        false
                      );
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
                    <Headphones
                      size={13}
                    />

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
                    ].map(
                      (key) => (
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
                      )
                    )}
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
                    keyboard.mp3 ·
                    ambience volume
                    18%
                  </p>
                </div>
              )}

              {/* =================================================
                  PLAYLIST SELECTOR
              ================================================= */}

              <div className="playlist-switcher">
                <button
                  type="button"
                  className="playlist-button"
                  disabled={
                    playlists.length ===
                    0
                  }
                  onClick={() =>
                    setShowPlaylist(
                      true
                    )
                  }
                >
                  <ListMusic
                    size={16}
                  />

                  <span>
                    {currentPlaylist?.name ||
                      "No playlist"}
                  </span>

                  <ChevronDown
                    size={15}
                  />
                </button>
              </div>

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
                <span>
                  Add Your Wallpaper
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          PLAYLIST MODAL
      ===================================================== */}

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
          <div className="playlist-modal">
            {/* MODAL HEADER */}

            <div className="playlist-modal-header">
              <div>
                <div className="modal-eyebrow">
                  YOUR PLAYLISTS
                </div>

                <h3>
                  Choose your session
                </h3>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setShowPlaylist(
                    false
                  )
                }
                aria-label="Close playlist"
              >
                <X size={19} />
              </button>
            </div>

            {/* =================================================
                PLAYLIST TABS
            ================================================= */}

            <div className="playlist-tabs">
              {playlists.map(
                (playlist) => (
                  <button
                    key={
                      playlist.id
                    }
                    type="button"
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
                      {
                        playlist.name
                      }
                    </span>

                    <small>
                      {
                        playlist
                          .tracks
                          .length
                      }
                    </small>
                  </button>
                )
              )}
            </div>

            {/* =================================================
                SONG LIST

                THIS IS THE SCROLLABLE AREA.
            ================================================= */}

            <div className="modal-section-title">
              <span>
                {currentPlaylist?.name ||
                  "Playlist"}
              </span>

              <span>
                {currentPlaylist?.tracks
                  ?.length || 0}{" "}
                tracks
              </span>
            </div>

            <div className="playlist-track-list">
              {currentPlaylist?.tracks?.map(
                (
                  item,
                  index
                ) => (
                  <button
                    type="button"
                    key={
                      item.id ||
                      item.file
                    }
                    className={`modal-track ${
                      index ===
                      current &&
                      selectedPlaylistId ===
                        currentPlaylist.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      playTrack(
                        currentPlaylist.id,
                        index
                      )
                    }
                  >
                    <span className="modal-track-number">
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </span>

                    <span className="modal-track-info">
                      <strong>
                        {item.title}
                      </strong>

                      <small>
                        {item.artist}

                        {item.album
                          ? ` · ${item.album}`
                          : ""}
                      </small>
                    </span>

                    {index ===
                      current &&
                      playing &&
                      selectedPlaylistId ===
                        currentPlaylist.id ? (
                      <span className="bars">
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : (
                      <span className="track-play">
                        <Play
                          size={14}
                          fill="currentColor"
                        />
                      </span>
                    )}
                  </button>
                )
              )}
            </div>

            {/* =================================================
                MODAL FOOTER
            ================================================= */}

            <div className="playlist-modal-footer">
              <span>
                Scroll to browse all
                tracks
              </span>

              <span>
                ESC to close
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          FOOTER
      ===================================================== */}

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