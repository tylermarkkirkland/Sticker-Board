import { useEffect, useRef, useState } from 'react';

const FADE_OUT_DURATION = 3;   // seconds
const FADE_IN_DURATION = 1.5;  // seconds

export function useTrackPreview() {
  const audioRef = useRef(null);
  const songRef = useRef(null);
  const fadeInStartRef = useRef(null); // performance.now() when current fade-in window began

  const [currentId, setCurrentId] = useState(null);

  const getAudio = () => {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = 'auto';

      // Stamp the fade-in clock the moment audio actually starts playing.
      // This fires on initial play AND after pause→play, but NOT on loop
      // (audio never pauses on loop, so we stamp manually there instead).
      a.addEventListener('playing', () => {
        if (fadeInStartRef.current === null) {
          fadeInStartRef.current = performance.now();
        }
      });

      a.addEventListener('timeupdate', () => {
        const s = songRef.current;
        if (!s) return;

        // Fade in
        const fadeInVol = fadeInStartRef.current === null
          ? 0
          : Math.min(1, (performance.now() - fadeInStartRef.current) / 1000 / FADE_IN_DURATION);

        // Fade out near end
        const fadeStart = s.end - FADE_OUT_DURATION;
        let fadeOutVol = 1;
        if (a.currentTime >= fadeStart && a.currentTime < s.end) {
          fadeOutVol = Math.max(0, (s.end - a.currentTime) / FADE_OUT_DURATION);
        }

        a.volume = Math.min(fadeInVol, fadeOutVol);

        // Loop: reset position and restart fade-in clock
        if (a.currentTime >= s.end) {
          fadeInStartRef.current = performance.now();
          a.currentTime = s.start;
        }
      });

      audioRef.current = a;
    }
    return audioRef.current;
  };

  const play = (song) => {
    const a = getAudio();
    a.volume = 0;
    fadeInStartRef.current = null; // cleared here; 'playing' event will stamp it
    songRef.current = song;
    const start = song.start || 0;
    // The #t= fragment starts a fresh file at the right spot, so iOS (which
    // ignores volume) never plays a blip from 0:00 before the seek below.
    const src = start ? `${song.file}#t=${start}` : song.file;
    if (a.src !== new URL(src, window.location.href).href) {
      a.src = src;
    }
    const seek = () => {
      try {
        a.currentTime = start;
      } catch {
        /* seek may fail before metadata loads */
      }
    };
    if (a.readyState >= 1) {
      seek();
    } else {
      a.addEventListener('loadedmetadata', seek, { once: true });
    }
    // Call play() right away, inside the drop that triggered it. Safari blocks
    // sound that starts later (e.g. after the file loads), so waiting for
    // metadata first left the record spinning in silence.
    a.play().catch(() => {});
    setCurrentId(song.id);
  };

  const stop = () => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.volume = 1;
    }
    fadeInStartRef.current = null;
    songRef.current = null;
    setCurrentId(null);
  };

  const togglePlayPause = () => {
    const a = audioRef.current;
    if (!a || !songRef.current) return;
    if (a.paused) {
      // Restart the fade-in clock so resuming from pause also fades in
      fadeInStartRef.current = null;
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  };

  const isPlaying = () => {
    const a = audioRef.current;
    return a && !a.paused;
  };

  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.src = '';
      }
    };
  }, []);

  return { currentId, play, stop, togglePlayPause, isPlaying };
}
