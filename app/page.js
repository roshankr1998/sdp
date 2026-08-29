
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef, useState } from "react";

import {
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

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

export default function Home() {
  const audioRef = useRef(null);
  const keyboardRef = useRef(null);

  const [wallpaper, setWallpaper] = useState("/wallpaper.jpg");

  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [current, setCurrent] = useState(0);

  const [loadingMusic, setLoadingMusic] = useState(true);
  const [musicError, setMusicError] = useState("");

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(0.82);
  const [muted, setMuted] = useState(false);

  const [keyboardOn, setKeyboardOn] = useState(false);
  const [activeKeys, setActiveKeys] = useState([]);

  const [showPlaylist, setShowPlaylist] = useState(false);

  const currentPlaylist =
    playlists.find((item) => item.id === selectedPlaylistId) ||
    playlists[0] ||
    null;

  const tracks = currentPlaylist?.tracks || [];

  const song = tracks[current] || tracks[0] || null;

  /*
   * Load playlists from /api/music
   */
  useEffect(() => {
    let mounted = true;

    async function loadMusic() {
      try {
        setLoadingMusic(true);
        setMusicError("");

        const response = await fetch("/api/music", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load music");
        }

        const data = await response.json();

        if (!mounted) return;

        const loadedPlaylists = Array.isArray(data)
          ? data
          : data.playlists || [];

        setPlaylists(loadedPlaylists);

        if (loadedPlaylists.length > 0) {
          setSelectedPlaylistId(loadedPlaylists[0].id);
        }
      } catch (error) {
        console.error(error);

        if (mounted) {
          setMusicError(
            "Unable to load playlists from public/music."
          );
        }
      } finally {
        if (mounted) {
          setLoadingMusic(false);
        }
      }
    }

    loadMusic();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Music volume
   */
  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.volume = volume;
    audioRef.current.muted = muted;
  }, [volume, muted]);

  /*
   * Keyboard ambience
   *
   * EXACTLY 50%
   */
  useEffect(() => {
    if (!keyboardRef.current) return;

    keyboardRef.current.volume = 0.5;
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

  /*
   * Fake keyboard animation
   */
  useEffect(() => {
    if (!keyboardOn) {
      setActiveKeys([]);
      return;
    }

    const chars = [
      "A",
      "S",
      "D",
      "F",
      "J",
      "K",
      "L",
      "⌘",
      "SHIFT",
      "SPACE",
      "ENTER",
    ];

    let timer;

    function animate() {
      const key =
        chars[Math.floor(Math.random() * chars.length)];

      setActiveKeys([key]);

      timer = setTimeout(() => {
        setActiveKeys([]);

        timer = setTimeout(
          animate,
          120 + Math.random() * 650
        );
      }, 70 + Math.random() * 140);
    }

    animate();

    return () => {
      clearTimeout(timer);
    };
  }, [keyboardOn]);

  /*
   * Change playlist
   */
  function changePlaylist(playlistId) {
    const playlist = playlists.find(
      (item) => item.id === playlistId
    );

    if (!playlist) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setSelectedPlaylistId(playlistId);
    setCurrent(0);
    setProgress(0);
    setDuration(0);
    setPlaying(false);
  }

  /*
   * Change song
   */
  function changeSong(index, autoPlay = true) {
    if (
      !currentPlaylist ||
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

    if (!autoPlay) {
      setPlaying(false);
      return;
    }

    /*
     * Wait until React has rendered the new src.
     */
    setTimeout(() => {
      if (!audioRef.current) return;

      audioRef.current
        .play()
        .then(() => {
          setPlaying(true);
        })
        .catch((error) => {
          console.error(
            "Audio playback failed:",
            error
          );
          setPlaying(false);
        });
    }, 100);
  }

  /*
   * Play / pause
   */
  function togglePlay() {
    if (!audioRef.current || !song) return;

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
  }

  /*
   * Next
   */
  function next() {
    if (!tracks.length) return;

    const nextIndex =
      (current + 1) % tracks.length;

    changeSong(nextIndex, true);
  }

  /*
   * Previous
   */
  function previous() {
    if (!tracks.length) return;

    if (
      audioRef.current &&
      audioRef.current.currentTime > 3
    ) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      return;
    }

    const previousIndex =
      (current - 1 + tracks.length) %
      tracks.length;

    changeSong(previousIndex, true);
  }

  /*
   * Wallpaper
   */
  function handleWallpaperChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    setWallpaper(imageUrl);
  }

  return (
    <main
      className="page"
      style={{
        "--wallpaper": `url("${wallpaper}")`,
      }}
    >
      {/* =====================================================
          SHARP BACKGROUND
      ===================================================== */}

      <div className="bg-image" />
      <div className="bg-vignette" />
      <div className="grain" />

      {/* =====================================================
          HIDDEN WALLPAPER INPUT

          IMPORTANT:
          This is deliberately hidden.
          Users click the custom button instead.
      ===================================================== */}

      <input
        id="wallpaper-input"
        className="wallpaper-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleWallpaperChange}
      />

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="topbar">
        <div className="brand">
          <Code2 size={15} />
          <span>DEV MODE</span>
        </div>

        <div className="status">
          <span />
          {keyboardOn
            ? "office ambience · 50%"
            : "focus mode"}
        </div>

        {/* =================================================
            OFFICE SOUNDS — TOP RIGHT
        ================================================= */}

        <button
          type="button"
          className={`office-toggle ${
            keyboardOn ? "on" : ""
          }`}
          onClick={() =>
            setKeyboardOn((value) => !value)
          }
          aria-pressed={keyboardOn}
        >
          <Keyboard size={15} />

          <span>Office sounds</span>

          <span className="office-state">
            {keyboardOn ? "ON" : "OFF"}
          </span>
        </button>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

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
          A soundtrack for debugging at 2 AM,
          shipping at 5 PM, staring at a terminal
          and convincing yourself the bug is not
          in production.
        </p>

        {/* ===================================================
            WORKSPACE
        =================================================== */}

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
                <span className="prompt">›</span>
                <span className="blink">█</span>
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
                    {song?.title || "No song selected"}
                  </h2>

                  <p>
                    {song?.artist || "DEV MODE"}
                  </p>
                </div>

                <Coffee
                  size={19}
                  strokeWidth={1.5}
                />
              </div>

              {/* =================================================
                  MUSIC AUDIO

                  Never render an empty src.
              ================================================= */}

              {song?.file && (
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
                  onEnded={next}
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
                  SEEK BAR
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
                onChange={(event) => {
                  const value = Number(
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
                      ? (progress / duration) * 100
                      : 0
                  }%`,
                }}
              />

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
                  <SkipBack />
                </button>

                <button
                  type="button"
                  className="play"
                  onClick={togglePlay}
                  aria-label={
                    playing ? "Pause" : "Play"
                  }
                  disabled={!song}
                >
                  {playing ? (
                    <Pause fill="currentColor" />
                  ) : (
                    <Play fill="currentColor" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={next}
                  aria-label="Next track"
                >
                  <SkipForward />
                </button>
              </div>

              {/* =================================================
                  BOTTOM CONTROLS
              ================================================= */}

              <div className="bottom-controls">

                <div className="player-volume">
                  <button
                    type="button"
                    onClick={() =>
                      setMuted((value) => !value)
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
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={
                      muted ? 0 : volume
                    }
                    onChange={(event) => {
                      setVolume(
                        Number(event.target.value)
                      );

                      setMuted(false);
                    }}
                    aria-label="Music volume"
                  />
                </div>
              </div>

              {/* =================================================
                  PLAYLIST BUTTON
              ================================================= */}

              <div className="playlist-switcher">
                <button
                  type="button"
                  className="playlist-button"
                  onClick={() =>
                    setShowPlaylist(true)
                  }
                  disabled={
                    loadingMusic ||
                    playlists.length === 0
                  }
                >
                  <ListMusic size={16} />

                  <span>
                    {loadingMusic
                      ? "Loading playlists..."
                      : currentPlaylist?.name ||
                        "No playlists"}
                  </span>

                  <ChevronDown size={15} />
                </button>
              </div>

              {/* =================================================
                  WALLPAPER BUTTON
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

              {musicError && (
                <div className="music-error">
                  {musicError}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          PLAYLIST MODAL

          Clicking playlist now opens a real popup.
      ===================================================== */}

      {showPlaylist && (
        <div
          className="playlist-overlay"
          onClick={() =>
            setShowPlaylist(false)
          }
        >
          <div
            className="playlist-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="playlist-modal-header">
              <div>
                <div className="modal-kicker">
                  PLAYLIST
                </div>

                <h3>
                  {currentPlaylist?.name ||
                    "Playlist"}
                </h3>

                <p>
                  {tracks.length}{" "}
                  {tracks.length === 1
                    ? "track"
                    : "tracks"}
                </p>
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
                PLAYLIST SELECTOR
            ================================================= */}

            <div className="modal-playlists">
              {playlists.map((playlist) => (
                <button
                  type="button"
                  key={playlist.id}
                  className={
                    playlist.id ===
                    selectedPlaylistId
                      ? "modal-playlist active"
                      : "modal-playlist"
                  }
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
                    {playlist.tracks.length}
                  </small>
                </button>
              ))}
            </div>

            {/* =================================================
                SONG LIST

                This area scrolls independently.
            ================================================= */}

            <div className="modal-song-list">
              {tracks.length === 0 ? (
                <div className="empty-playlist">
                  No songs found in this playlist.
                </div>
              ) : (
                tracks.map((item, index) => (
                  <button
                    type="button"
                    key={
                      item.file ||
                      `${item.title}-${index}`
                    }
                    className={
                      index === current
                        ? "modal-song active"
                        : "modal-song"
                    }
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
                    <span className="song-number">
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                    </span>

                    <span className="song-details">
                      <strong>
                        {item.title ||
                          "Untitled"}
                      </strong>

                      <small>
                        {item.artist ||
                          "Unknown artist"}
                      </small>
                    </span>

                    {index === current &&
                      playing && (
                        <span className="playing-bars">
                          <i />
                          <i />
                          <i />
                        </span>
                      )}
                  </button>
                ))
              )}
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