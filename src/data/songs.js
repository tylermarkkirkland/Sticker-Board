// Single source of truth for the record player's songs.
//
// Each entry drives a record sticker, the dock, and the streaming link.
// `file` points to the audio file in public/audio/. `start`/`end` define the
// preview window (seconds) — the player loops only that section. `color` tints
// the record label; `streamUrl` is the optional "listen on Spotify" link.
const songs = [
  {
    id: 'bloodletting',
    title: 'Bloodletting',
    artist: 'Tyler Mark',
    file: '/audio/bloodletting.m4a',
    start: 120,
    end: 161,
    color: '#ff6b5e',
    labelImage: '/images/bloodletting.png',
    streamUrl: 'https://open.spotify.com/track/6SGhtQFhVx7vhgEMDxSGG6?si=e568402a4cec49b5',
  },
  {
    id: 'wait',
    title: 'Wait',
    artist: 'Tyler Mark',
    file: '/audio/wait.m4a',
    start: 0,
    end: 30,
    color: '#5cc6ff',
    labelImage: '/images/wait.png',
    // No streamUrl - this track has no Spotify link
  },
  {
    id: 'third-times-the-charm',
    title: "Third Time's the Charm",
    artist: 'Tyler Mark',
    file: '/audio/third-times-the-charm.m4a',
    start: 165,
    end: 202,
    color: '#c5d72c',
    labelImage: '/images/third-times-the-charm.png',
    streamUrl: 'https://open.spotify.com/track/5r9JQTf3Ejg669wslwyxvi?si=93c243f721294cdc',
  },
];

export default songs;
