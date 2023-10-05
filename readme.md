To use this, run:
```
const ai = require("connectfourai");
```

To make a move for the player:
```
const ai = require("connectfourai");
ai.play(BOARD, 3, PLP);
console.table(ai.display_board());
```

To make a move for the AI:
```
const ai = require("connectfourai");

// Choose desired depth as 2nd argument of minimax.
ai.play(BOARD, ai.minimax(BOARD, 7, -Infinity, Infinity, true)[0], AIP);
console.table(ai.display_board());
```