A zero dependency NPM package for any combination of human and computer play for the game Connect 4 aka Four in a row.

This package supports custom column & row dimensions, connect length, and number of players, as well as having an AI that works with it all, and using depth, nodes, and time limits. You can also have unlimited concurrent games.

# **UPDATE**
Version 2.0.0 is a large breaking change from version 1.3.0. You should update your existing code accordingly. Check the included changelog for details.

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

// To reset all game state values as if you just ran the code for the first time.
AI.reset_game();
// To start a new game. Use this after modifying game state or calling the set() function, changing the game state. NOTE: If you change the game state, all existing boards in memory may break. You should only do this before using a board.
AI.new_game();

// Create a board first. You can have unlimited boards in play. Anytime you modify the board state, set the board variable to the output of the function.
BOARD = create_board();

// To see the board. You can display the legends using set().
/*
	2 player example:
    ------------------
   |⚫⚫⚫⚫⚫⚫⚫|   
    ------------------
   |⚫⚫⚫⚫⚫⚫⚫|   
    ------------------
   |⚫⚫⚫⚫🔴⚫⚫|   
    ------------------
   |⚫🔴⚫⚫🟡⚫⚫|   
    ------------------
   |🔴🔴⚫⚫🟡🔴🟡|   
    ------------------
   |🟡🔴🔴🟡🔴🟡🟡|   
    ------------------
	
	3 player example:
    ------------------
   |⚫⚫⚫⚫⚫⚫⚫|   
    ------------------
   |⚫⚫⚫⚫⚫⚫⚫|   
    ------------------
   |⚫⚫⚫⚫🟡⚫⚫|   
    ------------------
   |🟢🟡⚫⚫🔴⚫⚫|   
    ------------------
   |🔴🟢⚫⚫🟡⚫🟡|   
    ------------------
   |🔴🔴🟢🟢🔴🟢🟡|   
    ------------------
	
*/
AI.display_board(BOARD);

// If you need a 2D array of the board.
AI.get_boards_as_array(BOARD);

// Makes a move for the current player. Note that columns are 0-indexed, so if you want the first column then use 0, and if you want the last column (by default) use 6.
BOARD = AI.play_move(BOARD, 3);

// You can also have the AI play a move. The settings are based on CONFIG. To change them, run set()
BOARD = AI.play_move(BOARD, null);

// To check if a column can be played.
AI.can_play(BOARD, 3);

// To see which columns can be played in. Ex: [ 0, 2, 3, 5 ]
AI.get_valid_locations(BOARD);

// To see which column is the best for the current player. Can be used as a hint.
AI.get_best_move(BOARD);
```

# **Built-in variables**
For ease of use.
```js
COLORS                          // 9 unicode colors have been provided to choose from, though you can use your own symbols as well.
COLORS.red                      // 🔴
COLORS.yellow                   // 🟡
COLORS.blue                     // 🔵
```

# **Customization**
```js
const AI = require("connectfourai");

// If desired, customize the pieces. They can be anything you want!
AI.set("players", 3);                   // Default: 2, minimum 1. You can have unlimited players.
AI.set("pieceEmpty", "🟢");            // Default: ⚫
AI.set("piecePlayer1", "⚪");          // Default: 🔴
AI.set("piecePlayer2", "🔵");          // Default: 🟡
AI.set("piecePlayer3", "🟠");
AI.set("depth", 3);                    // Default: 6, minimum 1.
AI.set("nodes", 3);                    // Default: -1 (n/a) Number of nodes/positions to think about per move.
AI.set("time", 1_000);                 // Default: -1 (n/a). Number of milliseconds to think per move.
AI.set("connectLength", 3);            // Default: 4, minimum 2. The number of pieces to get in a row to win.
AI.set("columns", 5);                  // Default: 7, minimum 3.
AI.set("rows", 7);                     // Default: 6, minimum 3.
AI.set("exitOnError", true);           // Default: false. Controls whether system exits program execution when encountering a config error, or attempts to continue.
// These only apply when using the display_board() function.
AI.set("layoutFile", 2);               // Default: 2. Controls where file legend should appear. 0 = none, 1 = top, 2 = bottom, 3 = both.
AI.set("layoutRank", 2);               // Default: 2. Controls where rank legend should appear. 0 = none, 1 = left, 2 = right, 3 = both.
```

# **Game position**
```js
const AI = require("connectfourai");

// You can setup a specific position. The board is setup by placing a piece in each column, from left-to-right. This will implicitly call new_game().
BOARD = AI.set_pos(BOARD, "2,7,2,1,2,4,5,5,3,5,5,6");
// You can also use an array.
BOARD = AI.set_pos(BOARD, [ 2, 7, 2, 1, 2, 4, 5, 5, 3, 5, 5, 6 ]);

// Get the current position. Returns an array of moves that have been played on this board.
AI.get_pos(BOARD);

// Get a PGN of a board's game. Returns a PGN string.
AI.get_pgn(BOARD);
```


# **Game state**
```js
const AI = require("connectfourai");

// Get the winner of the current board. If there is a winner, it returns their symbol, otherwise it returns an empty string.
AI.get_winner(BOARD);
// You can also get the player index. If a winner, their index or -1 if no winner.
AI.get_winner(BOARD, true);

// Checks if the board is full (drawn).
AI.is_draw(BOARD);

// Checks if the board has been won. Returns a boolean.
AI.is_win(BOARD);
```
