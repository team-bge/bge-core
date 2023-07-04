# bge-core
Core TypeScript library for writing games.

## Requirements
* Node / npm >= 9.0.0

## Building
After cloning / pulling changes, run this to make sure all required packages are installed:

```bash
npm install
```

You can then build with:

```bash
npm run build
```

## Testing
When making changes to `bge-core`, you'll need a local game to test with. Let's use `bge-test` as an example.

Clone the game project so its directory is next to the directory for `bge-core`:

```bash
git clone https://github.com/team-bge/bge-test.git
```

Change to the newly cloned game's directory, then link to `bge-core`:

```bash
cd bge-test
npm link ../bge-core
```

Now you can test the game, and with it test `bge-core`:

```bash
npm start
```

This should open a browser window showing the running game.
Any changes you make to the game code will be compiled and loaded immediately, but if you change `bge-core` make sure you recompile that too!
