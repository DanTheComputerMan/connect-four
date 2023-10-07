An NPM package for _human vs human_ or _human vs computer_ play for the game Connect 4 aka Four in a row.

# **Install**
Install this package with **`npm i connectfourai`** or **`npm install connectfourai`**.

# **Setup**
```js
// Load the module and store it in a variable.
const AI = require("connectfourai");
```

# **Usage**
```js
const AI = require("connectfourai");

// To start a new game.
AI.new_game();

// To see the board.
AI.display_board();

// Makes a move for the player. Note that columns are 0-indexed, so if you want the first column then use 0, and if you want the last column use 6.
AI.play_human(4);
// Makes a move for the AI.
AI.play_ai();
// You can also specify a column for the AI to play in.
AI.play_ai(2);
// You can also specify a depth to play against. The higher the number, the longer the bot will take to calculate. A depth of 7 or 8 is suggested.
AI.play_ai(false, 8);

// To check if a column can be played.
AI.can_play(3);

// To see which columns can be played in.
AI.get_valid_locations();
```

# **Built-in variables**
For information on the state of the game.
```js
COLORS                          // A collection of unicode colors to choose from.
COLORS.blue                     // One example.
GAME.full                       // If the board is full.
GAME.over                       // If the game is over (full or someone won).
GAME.victor or GAME.winner      // Who won the game.
GAME.won                        // If someone won the game.
```

# **Customization**
```js
const AI = require("connectfourai");

// If desired, customize the pieces. They can be anything you want!
AI.set_ai_piece("⚪");          // Default: ⚫
AI.set_player_piece("🔵");      // Default: 🔴
AI.set_empty_piece("🟢");       // Default: 🟡

// You can also use the provided color object.
AI.set_ai_piece(COLORS.white);
AI.set_player_piece(COLORS.blue);
AI.set_empty_piece(COLORS.green);

// You can change the rows, columns, and even the connect length.
AI.set("columns", 10);          // Minimum 3
AI.set("rows", 9);              // Minimum 3
AI.set("length", 5);            // Minimum 3

// You can setup a specific position. The board is setup by placing a piece in each column, from left-to-right.
AI.set_pos("4,4,4,4,4,3,3,3,6");
```