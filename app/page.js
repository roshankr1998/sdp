
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

/* =========================================================
   HELPERS
========================================================= */

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);

  return `${minutes}:${remaining
    .toString()
    .padStart(2, "0")}`;
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
   COMPONENT
========================================================= */

export default function Home() {
  /* =======================================================
     REFS
  ======================================================= */

  const audioRef = useRef(null);
  const keyboardRef = useRef(null);
  const resumeAfterTrackChangeRef = useRef(false);

  /* =======================================================
     WALLPAPER
  ======================================================= */

  const [wallpaper, setWallpaper] =
    useState("/wallpaper.jpg");

  /* =======================================================
     MUSIC
  ======================================================= */

  const [playlists, setPlaylists] = useState([]);

  const [loadingMusic, setLoadingMusic] =
    useState(true);

  const [musicError, setMusicError] = useState("");

  /* =======================================================
     CURRENT PLAYLIST
  ======================================================= */

  const [selectedPlaylistId, setSelectedPlaylistId] =
    useState("");

  const [current, setCurrent] = useState(0);

  // The song being played is intentionally independent from the
  // playlist currently being viewed in the playlist panel.
  // This means changing playlist tabs never changes the audio source.
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

  const [showPlaylist, setShowPlaylist] =
    useState(false);

  /* =======================================================
     OFFICE SOUNDS
  ======================================================= */

  const [keyboardOn, setKeyboardOn] =
    useState(false);

  const [activeKeys, setActiveKeys] =
    useState([]);

  const [officeText, setOfficeText] =
    useState("ready.");

  /* =======================================================
     CURRENT PLAYLIST
  ======================================================= */

  const currentPlaylist = useMemo(() => {
    if (!playlists.length) {
      return null;
    }

    return (
      playlists.find(
        (playlist) =>
          playlist.id === selectedPlaylistId
      ) || playlists[0]
    );
  }, [playlists, selectedPlaylistId]);

  /* =======================================================
     CURRENT SONG

     IMPORTANT: this is NOT derived from currentPlaylist.
     Playlist tabs are navigation only; the audio keeps playing
     the exact same song until the user clicks another track.
  ======================================================= */

  const song = currentSong;

  /* =======================================================
     LOAD MUSIC
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadMusic() {
      try {
        setLoadingMusic(true);
        setMusicError("");

        const response = await fetch(
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

        const data = await response.json();

        if (cancelled) {
          return;
        }

        const loadedPlaylists =
          Array.isArray(data.playlists)
            ? data.playlists
            : [];

        setPlaylists(loadedPlaylists);

        if (loadedPlaylists.length > 0) {
          setSelectedPlaylistId(
            loadedPlaylists[0].id
          );

          setCurrent(0);
          setCurrentSong(
            loadedPlaylists[0].tracks?.[0] || null
          );
        }
      } catch (error) {
        console.error(
          "Unable to load music:",
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
     APPLY MUSIC VOLUME
  ======================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.muted = false;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  /* =======================================================
     OFFICE SOUND
     
     ALWAYS 50%
  ======================================================= */

  useEffect(() => {
    const keyboard = keyboardRef.current;

    if (!keyboard) {
      return;
    }

    keyboard.volume = 0.5;
    keyboard.loop = true;

    if (keyboardOn) {
      keyboard
        .play()
        .catch((error) => {
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
        // Ignore browser restrictions.
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
        chars[
        Math.floor(
          Math.random() * chars.length
        )
        ];

      const line =
        officeLines[
        Math.floor(
          Math.random() *
          officeLines.length
        )
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
     PLAYLIST OVERLAY

     Opening/closing the playlist is a UI-only action.
     It must NEVER pause, reset, or replace the current song.
  ======================================================= */

  const openPlaylist = () => {
    setShowPlaylist(true);
  };

  /* =======================================================
     CHANGE PLAYLIST

     This ONLY changes which playlist is displayed in the modal.
     It deliberately does NOT touch audio, current song, progress,
     duration, or playing state.
  ======================================================= */

  const changePlaylist = (playlistId) => {
    const playlist = playlists.find(
      (item) => item.id === playlistId
    );

    if (!playlist) {
      return;
    }

    setSelectedPlaylistId(playlistId);
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

    const nextSong = currentPlaylist.tracks[index];
    const audio = audioRef.current;

    // Only an explicit song click is allowed to replace the audio source.
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Ignore browser restrictions.
      }
    }

    setCurrent(index);
    setCurrentSong(nextSong);
    setProgress(0);
    setDuration(0);
    setPlaying(false);

    resumeAfterTrackChangeRef.current = Boolean(autoPlay);
  };

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio || !song?.file) {
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();

        setPlaying(true);
      } else {
        audio.pause();

        setPlaying(false);
      }
    } catch (error) {
      console.error(
        "Unable to play song:",
        error
      );

      setPlaying(false);
    }
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

    const audio = audioRef.current;

    if (
      audio &&
      audio.currentTime > 3
    ) {
      audio.currentTime = 0;
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
      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="bg-image" />

      <div className="bg-vignette" />

      <div className="grain" />

      {/* =================================================
          WALLPAPER FILE INPUT
      ================================================= */}

      <input
        id="wallpaper-input"
        className="wallpaper-input"
        type="file"
        accept="image/*"
        onChange={
          handleWallpaperChange
        }
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
          className={`office-top-button ${keyboardOn ? "on" : ""
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

          <span>Office sounds</span>

          <span className="office-status">
            {keyboardOn
              ? "ON · 50%"
              : "OFF"}
          </span>
        </button>
      </header>

      {/* =================================================
          MAIN HERO
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
              <em>Ship with sound.</em>
            </h1>

            <p className="intro">
              Your private workspace for late-night debugging,
              focused coding and the soundtrack that keeps
              the terminal moving.
            </p>

            <div className="hero-meta">
              <div className="meta-card">
                <span>SESSION</span>
                <strong>DEEP WORK</strong>
              </div>

              <div className="meta-card">
                <span>PLAYLISTS</span>
                <strong>{playlists.length.toString().padStart(2, "0")}</strong>
              </div>

              <div className="meta-card">
                <span>TRACKS</span>
                <strong>{currentPlaylist?.tracks?.length || 0}</strong>
              </div>
            </div>

            <div className="hero-note">
              <Activity size={14} />
              <span>focus mode / distraction level: low</span>
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
                  <span>WORK</span>
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
              ================================================= */}

                {song?.file ? (
                  <audio
                    ref={audioRef}
                    src={song.file}
                    preload="metadata"
                    onLoadedMetadata={(
                      event
                    ) => {
                      const value =
                        event.currentTarget
                          .duration;

                      if (
                        Number.isFinite(
                          value
                        )
                      ) {
                        setDuration(value);
                      }
                    }}
                    onDurationChange={(
                      event
                    ) => {
                      const value =
                        event.currentTarget
                          .duration;

                      if (
                        Number.isFinite(
                          value
                        )
                      ) {
                        setDuration(value);
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
                        song.file
                      );

                      setPlaying(false);
                      setMusicError(
                        "This audio file could not be played."
                      );
                    }}
                  />
                ) : null}

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
                    !song ||
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
                    "--value": `${duration
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
                  PLAYER CONTROLS
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
                    <SkipForward
                      size={19}
                    />
                  </button>
                </div>

                {/* =================================================
                  BOTTOM CONTROLS
              ================================================= */}

                <div className="bottom-controls">
                  <button
                    type="button"
                    className="playlist-button"
                    onClick={openPlaylist}
                    disabled={
                      !playlists.length
                    }
                  >
                    <ListMusic
                      size={16}
                    />

                    <span>
                      {currentPlaylist?.name ||
                        "No playlists"}
                    </span>

                    <ChevronDown
                      size={15}
                    />
                  </button>

                  {/* =================================================
                    VOLUME
                ================================================= */}

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
                      value={muted ? 0 : volume}
                      style={{
                        "--volume": `${(muted ? 0 : volume) * 100}%`
                      }}
                      onChange={(event) => {
                        const newVolume =
                          Number(
                            event.target
                              .value
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

                {/* =================================================
                  ERROR
              ================================================= */}

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
              playlistWasPlayingRef.current = false;
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
            {/* =================================================
                MODAL HEADER
            ================================================= */}

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
                onClick={() => {
                  setShowPlaylist(false);
                }}
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
                    className={`playlist-tab ${playlist.id ===
                      selectedPlaylistId
                      ? "active"
                      : ""
                      }`}
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
                      {playlist.tracks
                        ?.length || 0}
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
                SONG SCROLLER
            ================================================= */}

            <div className="modal-song-list">
              {currentPlaylist?.tracks?.map(
                (
                  item,
                  index
                ) => (
                  <button
                    type="button"
                    key={
                      item.file ||
                      `${item.title}-${index}`
                    }
                    className={`modal-track ${item.file && song?.file === item.file
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
                      {String(
                        index + 1
                      ).padStart(
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
                      {item.file &&
                        song?.file === item.file &&
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
