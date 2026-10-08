// Each thing a visitor can discover on the board grows one leaf on the plant.
// Order = bottom node to top node. `hint` shows on hover before it's found;
// `done` shows after. Find all of them and the plant blooms.
const discoveries = [
  {
    id: 'record',
    hint: 'Put a record on the player',
    done: 'You spun a record',
  },
  {
    id: 'books',
    hint: 'Take a closer look at my books',
    done: 'You browsed my bookshelf',
  },
  {
    id: 'happy',
    hint: 'Tell the note something nice',
    done: 'You made me smile',
  },
  {
    id: 'sad',
    hint: 'Tell the note something rotten',
    done: 'You made me sad (rude)',
  },
  {
    id: 'secret',
    hint: 'Write the First Ideal on the note',
    done: 'Journey before destination.',
  },
  {
    id: 'x',
    hint: 'Come say hi on X',
    done: 'You stopped by on X',
  },
];

export default discoveries;
