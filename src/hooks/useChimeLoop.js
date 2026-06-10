import { useEffect, useRef, useState } from 'react';

/**
 * useChimeLoop — a tiny self-contained music source.
 *
 * Rather than ship an audio file, this synthesizes a gentle, looping
 * lo-fi arpeggio with the Web Audio API so the record player "just plays"
 * anywhere. Swap this out for an <audio> element + real track whenever
 * you have one — the on/off contract stays the same.
 *
 * Returns { isPlaying, toggle, stop }.
 */
export function useChimeLoop() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const timerRef = useRef(null);
  const stepRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // A warm pentatonic pattern (Hz). Repeats with small octave lifts.
  const pattern = [
    261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 349.23,
    440.0, 523.25, 440.0, 392.0,
  ];

  const ensureContext = () => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    return ctxRef.current;
  };

  const playNote = (freq, time) => {
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    // Soft pluck envelope.
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.5, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.55);

    osc.connect(gain);
    gain.connect(masterRef.current);
    osc.start(time);
    osc.stop(time + 0.6);

    // A quiet fifth above adds shimmer.
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.5;
    gain2.gain.setValueAtTime(0.0001, time);
    gain2.gain.exponentialRampToValueAtTime(0.16, time + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
    osc2.connect(gain2);
    gain2.connect(masterRef.current);
    osc2.start(time);
    osc2.stop(time + 0.45);
  };

  const start = () => {
    const ctx = ensureContext();
    if (ctx.state === 'suspended') ctx.resume();

    // Fade master in.
    const now = ctx.currentTime;
    masterRef.current.gain.cancelScheduledValues(now);
    masterRef.current.gain.setValueAtTime(masterRef.current.gain.value, now);
    masterRef.current.gain.linearRampToValueAtTime(0.22, now + 0.4);

    const stepMs = 300;
    const tick = () => {
      const t = ctxRef.current.currentTime + 0.02;
      const note = pattern[stepRef.current % pattern.length];
      playNote(note, t);
      stepRef.current += 1;
    };
    tick();
    timerRef.current = setInterval(tick, stepMs);
    setIsPlaying(true);
  };

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (masterRef.current && ctxRef.current) {
      const now = ctxRef.current.currentTime;
      masterRef.current.gain.cancelScheduledValues(now);
      masterRef.current.gain.setValueAtTime(masterRef.current.gain.value, now);
      masterRef.current.gain.linearRampToValueAtTime(0.0001, now + 0.25);
    }
    setIsPlaying(false);
  };

  const toggle = () => {
    if (isPlaying) stop();
    else start();
  };

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (ctxRef.current) ctxRef.current.close();
    };
  }, []);

  return { isPlaying, toggle, stop };
}
