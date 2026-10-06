/// Useful for dev debugging.
// const random = require("random-bigint"), util = require("util"); // Call random(num) where num is the number of bits in the BigInt.

const { __bit_move, __popcount } = require("./bitwise.js");
const { __create_transposition_table, __get_transposition_entry, __store_transposition_entry } = require("./ttable.js");
const { __add_killer_move, __create_killer_moves } = require("./killer_moves.js");

/*
	STRIDE is the number of bits in each file. The final bit in the bitboard is a sentinel bit and unplayable.
				Col 0	Col 1	Col 2	Col 3	Col 4	Col 5	Col 6
	bit 6		.		.		.		.		.		.		.
	bit 5		X		.		.		.		.		.		.
	bit 4		O		.		.		.		.		.		.
	bit 3		X		.		.		.		.		.		.
	bit 2		O		.		.		.		.		.		.
	bit 1		X		.		.		.		.		.		.
	bit 0		X		.		.		.		.		.		.


				Col 0	Col 1	Col 2	Col 3	Col 4	Col 5	Col 6
				6		13		20		27		34		41		48
				5		12		19		26		33		40		47
				4		11		18		25		32		39		46
				3		10		17		24		31		38		45
				2		9		16		23		30		37		44
				1		8		15		22		29		36		43
				0		7		14		21		28		35		42
*/
// AVAILABLE_FILES is used in debugging (display_board function) for a named column instead of numeric.
const AVAILABLE_FILES = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()-_=+[]{};:'",./<>?\\|\`~`, CONFIG = {
	columns: 7, connectLength: 4n, exitOnError: false, depth: 6, nodes: -1n, players: [ "🔴", "🟡" ], rows: 6, time: -1
};

COLORS = {
	black: "⚫",
	blue: "🔵",
	brown: "🟤",
	green: "🟢",
	orange: "🟠",
	purple: "🟣",
	red: "🔴",
	white: "⚪",
	yellow: "🟡",
}, LAYOUT_FILE = 2, LAYOUT_FILE_LETTERS = false, LAYOUT_RANK = 3, NUMBER_FILES = 7n, NUMBER_RANKS = 6n, STRIDE = NUMBER_FILES;
CENTER_COLUMN = (NUMBER_FILES / 2n) + 1n;
DIR_DIAGONAL_DOWN = STRIDE - 1n /* Direction: \ */, DIR_DIAGONAL_UP = STRIDE + 1n /* Direction: / */, DIR_HORIZONTAL = STRIDE /* Direction: — */, DIR_VERTICAL = 1n; /* Direction: | */
// Deprecated: MASKS_BOTTOM.
MASKS_BOTTOM = Array.from({ length: Number(NUMBER_FILES) }, (_, col) =>
	1n << (BigInt(col) * STRIDE)
);
MASKS_COLUMN = Array.from({ length: Number(NUMBER_FILES) }, (_, col) =>
	((1n << NUMBER_RANKS) - 1n) << (BigInt(col) * (NUMBER_RANKS + 1n))
);
MOVE_ORDER = [ 3, 2, 4, 1, 5, 0, 6 ];
TIME_END = null, TIME_START = (new Date).toLocaleString([], { timeZoneName: "long" });
let EMPTY = COLORS.black, TURN = 0;

/** 
 * @description				Scores a position for the specified player in the given position.
 * @param {object} board	A board object created from create_board().
 * @param {number} player	The player index to evaluate for.
 * @returns {number}		The score for the specified player in the given position.
 * */
function __evaluate_player(board, player) {
	const playerBits = board.players[player];
	
	let score = 0;
	
	// Center control
	const centerColumn = NUMBER_FILES / 2n, centerMask = MASKS_COLUMN[centerColumn], centerPieces = __popcount(playerBits & centerMask);
	
	score += centerPieces * 10; // 10 = center score.
	
	// Horizontal windows.
	for (let row = 0; row < Number(NUMBER_RANKS); row++) {
		for (let column = 0; column <= Number(NUMBER_FILES) - CONFIG.players.length; column++) {
			score += __evaluate_window(board, player, column, row, 1, 0);
		}
	}
	
	// Vertical windows.
	for (let row = 0; row <= Number(NUMBER_RANKS) - CONFIG.players.length; row++) {
		for (let column = 0; column < Number(NUMBER_FILES); column++) {
			score += __evaluate_window(board, player, column, row, 0, 1);
		}
	}
	
	// Diagonal windows: /.
	for (let row = 0; row <= Number(NUMBER_RANKS) - CONFIG.players.length; row++) {
		for (let column = 0; column <= Number(NUMBER_FILES) - CONFIG.players.length; column++) {
			score += __evaluate_window(board, player, column, row, 1, 1);
		}
	}
	
	// Diagonal windows: \.
	for (let row = CONFIG.players.length - 1; row < Number(NUMBER_RANKS); row++) {
		for (let column = 0; column <= Number(NUMBER_FILES) - CONFIG.players.length; column++) {
			score += __evaluate_window(board, player, column, row, 1, -1);
		}
	}
	
	return score;
}

/** 
 * @description						Scores a section of the bitboard.
 * @param {object} board			A board object created from create_board().
 * @param {number} column			The column the piece is in.
 * @param {number} row				The row the piece is in.
 * @param {number} columnDirection	Determines which direction to look at.
 * @param {number} rowDirection		Determines which direction to look at.
 * @returns {number}
 * */
function __evaluate_window(board, player, column, row, columnDirection, rowDirection) {
	const opponentCounts = Array(CONFIG.players.length).fill(0n), playerBits = board.players[player];
	let emptyCount = 0, occupied = false, playerCount = 0n;
	
	for (let index = 0; index < CONFIG.connectLength; index++) {
		const currentColumn = column + columnDirection * index, currentRow = row + rowDirection * index, theBit = 1n << (BigInt(currentColumn) * STRIDE + BigInt(currentRow));
		
		if ((playerBits & theBit) !== 0n) {
			playerCount++;
			continue;
		}
		
		occupied = false;
		for (let otherPlayer = 0; otherPlayer < CONFIG.players.length; otherPlayer++) {
			if (otherPlayer === player) continue;
			if ((board.players[otherPlayer] & theBit) !== 0n) {
				opponentCounts[otherPlayer]++;
				occupied = true;
				break;
			}
		}
		
		if (!occupied) emptyCount++;
	}
	
	if (playerCount === CONFIG.connectLength) return 1000000;
	
	// Another player is occupying one of its squares.
	if (emptyCount === 0) return 0;
	
	/// TODO: Add dynamic evaluations instead of 2 and 3, for custom connect length.
	// Three in a row with one empty.
	if (playerCount === CONFIG.connectLength - 1n && emptyCount === 1) return 100;
	
	// Two in a row with two empty.
	if (playerCount === CONFIG.connectLength - 2n && emptyCount === 2) return 10;
	
	// Penalize threats from other players.
	for (let otherPlayer = 0; otherPlayer < CONFIG.players.length; otherPlayer++) {
		if (otherPlayer === player) continue;
		if (opponentCounts[otherPlayer] === CONFIG.connectLength - 1n && emptyCount === 1) return -100;
		if (opponentCounts[otherPlayer] === CONFIG.connectLength - 2n && emptyCount === 2) return -10;
	}
	
	return 0;
};

/** 
 * @description				Finds the best move for the current player.
 * @param {object} board	A board object created from create_board().
 * @returns {object}		An object containing move, score, and nodes.
 * */
function __get_best_move(board) {
	const killerMoves = __create_killer_moves(board), rootPlayer = board.currentPlayer, stats = {
		nodes: 0n
	}, table = __create_transposition_table(), time = Date.now();
	let bestMove = -1, bestScore = -Infinity, score;
	
	for (let depth = 1; (depth <= CONFIG.depth) && (stats.nodes !== -1n && stats.nodes <= CONFIG.nodes) && (CONFIG.time !== -1 && (Date.now() - time) <= CONFIG.time); depth++) {
		const moves = __get_ordered_moves(board, killerMoves, depth, bestMove);
		let alpha = -Infinity, child, currentBestMove = -1, currentBestScore = -Infinity;
		
		for (const column of moves) {
			child = play_move(board, column);
			
			if (!child) continue;
			score = __paranoid_search(child, depth - 1, alpha, Infinity, rootPlayer, table, stats, 1, killerMoves, 0, time);
			
			if (currentBestMove == -1 || score > currentBestScore) {
				currentBestMove = column;
				currentBestScore = score;
			}
			alpha = Math.max(alpha, currentBestScore);
		}
		
		// Only keep a result from a completely searched iteration.
		if (currentBestMove !== -1) {
			bestMove = currentBestMove;
			bestScore = currentBestScore;
		}
	}
	
	return {
		move: bestMove,
		score: bestScore,
		nodes: stats.nodes
	};
};

/** 
 * @description				Generates a move order array starting from the middle column, and alternates left and right columns.
 * */
function __generate_move_order() {
	const center = Number(NUMBER_FILES / 2n), order = [ center ];
	
	for (let offset = 1; offset < NUMBER_FILES; offset++) {
		const left = center - offset, right = center + offset;
		
		if (left >= 0) order.push(left);
		if (right < NUMBER_FILES) order.push(right);
	}
	
	MOVE_ORDER = order;
};

/** 
 * @param {object} board	A board object created from create_board().
 * @returns {array<number>}
 * */
function __get_ordered_moves(board, killerMoves, depth, bestMove) {
	const add_move = move => {
		if (move === -1 || added.has(move) || __bit_move(board, move) === 0n) return;
		
		added.add(move);
		moves.push(move);
	}, added = new Set(), moves = [];
	
	// Previous iteration's best move goes next.
	add_move(bestMove);
	
	if (depth && depth < killerMoves.length) {
		for (const move of killerMoves[depth]) {
			add_move(move);
		}
	}
	
	for (const move of MOVE_ORDER) {
		add_move(move);
	}
	
	return moves;
}

/** 
 * @description				Checks if the specified player has a winning move in this position.
 * @param {object} board	A board object created from create_board().
 * @param {number} player	The player index of the player.
 * @returns {boolean}
 * */
function __has_winning_move(board, player) {
	for (let column = 0; column < CONFIG.columns; column++) {
		const bit = __bit_move(board, column);
		
		if (bit === 0n) continue;
		if (__has_won(board.players[player] | bit)) return true;
	}
	
	return false;
};

/** 
 * @description				Checks all four directions in the bitboard for a win.
 * @param {bigint} bitboard	A board's occupancies for a player.
 * @returns {boolean}
 * */
function __has_won(bitboard) {
	let matches = bitboard & (bitboard >> STRIDE);
	
	// Horizontal
	if ((matches & (matches >> ((CONFIG.connectLength - 2n) * (NUMBER_RANKS + 1n))))) return true;
	
	// Vertical
	matches = bitboard & (bitboard >> 1n);
	if ((matches & (matches >> (CONFIG.connectLength - 2n)))) return true;
	
	// Diagonal /
	matches = bitboard & (bitboard >> DIR_DIAGONAL_DOWN);
	if ((matches & (matches >> ((CONFIG.connectLength - 2n) * (STRIDE - 1n))))) return true;
	
	// Diagonal \
	matches = bitboard & (bitboard >> DIR_DIAGONAL_UP);
	if ((matches & (matches >> (CONFIG.connectLength - 2n) * (STRIDE + 1n)))) return true;
	
	return false;
};

// Debug.
function __leftpad(str, num, chr=" ") {
	return chr.repeat(Math.max(0, num - str.length)) + str;
}

/** 
 * @description					Gets the PGN string containing all tags and moves.
 * @param {array<number>} moves	An array of moves containing each column a move was played in.
 * @returns {string}			PGN string contains all tags and moves.
 * */
function __moves_to_pgn(moves) {
	let _str = "";
	
	for (let i = 0, _len = moves.length; i < _len; i++) {
		// If player 1, prepend number notation.
		_str += `${!(i % CONFIG.players.length) ? (i / CONFIG.players.length) + 1 + ". " : ""}${moves[i]} `;
	}

	return _str.trim();
}

/** 
 * @description				Checks if a check extension is needed.
 * @param {object} board	A board object created from create_board().
 * @returns {boolean}		Whether a check extension is warranted.
 * */
function __needs_check_extension(board) {
	for (let player = 0, _len = CONFIG.players.length; player < _len; player++) {
		if (__has_winning_move(board, player)) return true;
	}
	
	return false;
};

/** 
 * @description							Assumes all other players are conspiring against it (worst-case scenario). This is "the engine".
 * @param {object} board				A board object created from create_board().
 * @param {number} depth				A depth to search to.
 * @param {number} alpha				Lower/upper bound of score.
 * @param {number} beta					Lower/upper bound of score.
 * @param {map} table					A transposition table map() object.
 * @param {number} rootPlayer			
 * @param {object} stats				An object containing nodes.
 * @param {number} extensionsRemaining	Number of check extensions left.
 * @param {array} killerMoves			Array of killer moves in the position.
 * @param {number} extensionNode		
 * @param {number} startTime			The start time of the search.
 * */
function __paranoid_search(board, depth, alpha, beta, rootPlayer, table, stats, extensionsRemaining, killerMoves, extensionNode, startTime) {
	const origAlpha = alpha, origBeta = beta;
	let bestScore, cached, maximizingPlayer, previousPlayer;
	
	stats.nodes++;
	
	// The player who just moved.
	previousPlayer = (Number(board.currentPlayer) - 1 + CONFIG.players.length) % CONFIG.players.length;
	
	// Root (previous) player has won.
	if (__has_won(board.players[previousPlayer])) return (previousPlayer === rootPlayer) ? 1000000 + depth : -1000000 - depth;
	
	if (is_draw(board)) return 0;
	if (!depth) return __evaluate_player(board, rootPlayer);
	
	cached = __get_transposition_entry(table, board, depth, rootPlayer, extensionsRemaining, alpha, beta);
	if (cached.found) return cached.score;
	alpha = cached.alpha;
	beta = cached.beta;
	
	if (!depth && !extensionNode) {
		if (!(extensionsRemaining && __needs_check_extension(board))) return __evaluate_player(board, rootPlayer);
		extensionsRemaining--;
		extensionNode = true;
	}
	
	maximizingPlayer = board.currentPlayer === rootPlayer, moves = __get_ordered_moves(board, killerMoves, depth, -1);
	bestScore = maximizingPlayer ? -Infinity : Infinity;
	
	for (const column of moves) {
		const child = play_move(board, column), childDepth = extensionNode ? 0 : depth - 1;
		let score;
		
		if (child === null) continue;
		if (!(stats.nodes % 2048n) && ((CONFIG.nodes !== -1n && stats.nodes >= CONFIG.nodes) || (CONFIG.time !== -1 && ((Date.now() - startTime) >= CONFIG.time)))) return 0; /// TODO: Properly evaluate if this produces a bug where a bad move is suddenly considered the best if the search is stopped.
	
		score = __paranoid_search(child, childDepth, alpha, beta, rootPlayer, table, stats, extensionsRemaining, killerMoves, extensionNode, startTime);
		if (maximizingPlayer) {
			if (score > bestScore) {
				bestMove = column;
				bestScore = score;
			}
			alpha = Math.max(alpha, bestScore);
			if (alpha >= beta) {
				__add_killer_move(killerMoves, depth, column);
				break;
			}
		} else {
			if (score < bestScore) {
				bestMove = column;
				bestScore = score;
			}
			
			beta = Math.min(beta, bestScore);
			
			if (alpha >= beta) {
				__add_killer_move(killerMoves, depth, column);
				break;
			}
		}
	}
	
	let flag = 0; // Exact.
	
	if (bestScore <= origAlpha) {
		flag = 2; // Upper bound.
	} else if (bestScore >= origBeta) {
		flag = 1; // Lower bound.
	}
	
	__store_transposition_entry(table, board, depth, rootPlayer, extensionsRemaining, bestScore, flag);
	
	return bestScore;
}

/** 
 * @description				Plays a move in the column.
 * @param {object} board	An object created by create_board().
 * @param {number} column	The column to play a piece in.
 * @returns {object}		Containing current bitboard, bitboard mask, and # of moves.
 * */
function __play_move(board, column) {
	let bit, players = [...board.players];
	
	if (!can_play(board, column)) {
		if (CONFIG.exitOnError) throw `Illegal move made in column: ${column + 1} on move ${board.moveNum}.\nSuspected reason: ${is_win(board) ? "Board has a winner." : (is_draw(board) ? "Board is full." : "Unknown.")}`;
		
		return {
			players, 
			mask: board.mask, 
			currentPlayer: board.currentPlayer,
			moveNum: board.moveNum
		};
	}
	
	bit = __bit_move(board, column);
	
	if (!bit) return null;
	
	players[board.currentPlayer] |= bit;
	board.moves.push({ column, piece: CONFIG.players[TURN] });
	TURN = ++TURN % CONFIG.players.length;
	
	return {
		players, 
		mask: board.mask | bit, 
		currentPlayer: (board.currentPlayer + 1n) % BigInt(CONFIG.players.length),
		moves: board.moves,
		movesNum: board.movesNum + 1
	};
};

/** 
 * @description		Updates the files, ranks, connect length, and all other global constants.
 * @param {boolean} affectCONFIG	You can choose whether to reset all values including CONFIG settings to the default, or only all other values.
 * */
function __reset_constants() {
	NUMBER_FILES = 7n;
	NUMBER_RANKS = 6n;
	// STRIDE = NUMBER_FILES;
	STRIDE = NUMBER_FILES;
	
	/// Deprecated.
	MASKS_BOTTOM = Array.from({ length: Number(NUMBER_FILES) }, (_, col) =>
		1n << (BigInt(col) * STRIDE)
	);
	MASKS_COLUMN = Array.from({ length: Number(NUMBER_FILES) }, (_, col) =>
		((1n << NUMBER_RANKS) - 1n) << (BigInt(col) * (NUMBER_RANKS + 1n))
	);
	
	CENTER_COLUMN = (NUMBER_FILES / 2n) + 1n;
	CONFIG.connectLength = 4n;
	
	DIR_DIAGONAL_DOWN = NUMBER_RANKS - 1n;	// Direction: \
	DIR_DIAGONAL_UP = NUMBER_RANKS + 2n;	// Direction: /
	DIR_HORIZONTAL = NUMBER_RANKS + 1n;		// Direction: —
	DIR_VERTICAL = 1n;						// Direction: |
	
	TIME_END = null;
	TIME_START = (new Date).toLocaleString([], { timeZoneName: "long" });
	
	CONFIG.columns = 7;
	CONFIG.connectLength = 4n;
	CONFIG.depth = 6;
	CONFIG.exitOnError = false;
	CONFIG.nodes = -1n;
	CONFIG.players = [ "🔴", "🟡" ];
	CONFIG.rows = 6;
	CONFIG.time = -1;
	
	__generate_move_order();
}

function __update_constants() {
	NUMBER_FILES = BigInt(CONFIG.columns);
	NUMBER_RANKS = BigInt(CONFIG.rows);
	STRIDE = NUMBER_FILES;
	
	/// Deprecated.
	MASKS_BOTTOM = Array.from({ length: Number(NUMBER_FILES) }, (_, col) =>
		1n << (BigInt(col) * STRIDE)
	);
	MASKS_COLUMN = Array.from({ length: Number(NUMBER_FILES) }, (_, col) =>
		((1n << NUMBER_RANKS) - 1n) << (BigInt(col) * (NUMBER_RANKS + 1n))
	);
	
	CENTER_COLUMN = (NUMBER_FILES / 2n) + 1n;
	
	DIR_DIAGONAL_DOWN = NUMBER_RANKS - 1n;	// Direction: \
	DIR_DIAGONAL_UP = NUMBER_RANKS + 2n;	// Direction: /
	DIR_HORIZONTAL = NUMBER_RANKS + 1n;		// Direction: —
	DIR_VERTICAL = 1n;						// Direction: |
	
	TIME_END = null;
	TIME_START = (new Date).toLocaleString([], { timeZoneName: "long" });
	
}

/** 
 * @description				Checks if a piece can be played in the column.
 * @param {object} board	A board object created from create_board().
 * @param {number} column	The column to check.
 * @returns {boolean}
 * */
function can_play(board, column) {
	return __bit_move(board, column) !== 0n && !is_win(board);
};

/** 
 * @description			Creates a board object.
 * @returns {object}	Contains player bitboards, bitboard mask, current player, and # of moves.
 * */
function create_board() {
	return {
		players: Array.from({ length: CONFIG.players.length }, () => 0n),
		mask: 0n, // All player bitboard occupancies bitwise OR'd together.
		currentPlayer: 0n,
		moves: [],
		movesNum: 0
	};
};

/** 
 * @description				A debug way to display the board in a human-friendly format.
 * @param {object} board	An object containing bitboard and the mask.
 * */
function display_board(board) {
	const fileLegend = `     ${LAYOUT_FILE_LETTERS ? AVAILABLE_FILES.substring(0, CONFIG.columns).split("").map(l => l + " ").join("") : Array.from({ length: CONFIG.columns }, (_, n) => n + 1).join(" ")}`;
	
	process.stdout.write("\n");
	process.stdout.write(LAYOUT_FILE & 1 ? fileLegend : "\n");
	process.stdout.write(`\n   ${"-".repeat(CONFIG.columns * 2 + 2)}\n`);
	for (let row = NUMBER_RANKS - 1n; row >= 0n; row--) {
		process.stdout.write((LAYOUT_RANK & 1) ? "" + (NUMBER_RANKS - row) : " ");
		process.stdout.write("  |");
		for (let col = 0n; col < NUMBER_FILES; col++) {
			const bit = 1n << BigInt(col * STRIDE + row);
			let player = -1;
			
			for (let playerIndex = 0; playerIndex < CONFIG.players.length; playerIndex++) {
				if ((board.players[playerIndex] & bit) !== 0n) {
					player = playerIndex;
					break;
				}
			}
			process.stdout.write(`${player === -1 ? EMPTY : CONFIG.players[player]}`);
		}
		process.stdout.write("|");
		if ((LAYOUT_RANK >> 1) & 1) process.stdout.write("  " + (NUMBER_RANKS - row));
		process.stdout.write(`\n   ${"-".repeat(CONFIG.columns * 2 + 2)}\n`);
	}
	if ((LAYOUT_FILE >> 1) & 1) process.stdout.write(fileLegend);
	process.stdout.write("\n\n");
	/// TODO: Properly evaluate whether to fully remove.
	// process.stdout.write(`\n\n	 Board: ${board}\n\n`);
}

/** 
 * @description				Finds the best move for the current player.
 * @param {object} board	A board object created from create_board().
 * @returns {number}		The column of the best move in the position.
 * */
function get_best_move(board) {
	return __get_best_move(board).move;
};

/** 
 * @param {bigint} bitboard		A BigInt bitboard.
 * @description					Converts a game bitboard into a 2d array representation.
 * */
function get_bitboard_as_array(bitboard) {
	const board = [];
	
	for (let row = NUMBER_RANKS - 1n; row >= 0; row--) {
		const boardRow = [];
		
		for (let column = 0n; column < NUMBER_FILES; column++) {
			const bit = 1n << BigInt(column * STRIDE + row);
			
			boardRow.push(+!!(bitboard & bit));
		}
		board.push(boardRow);
	}
	
	return board;
};

/** 
 * @param {bigint} boards		An object created from create_board().
 * @description					Converts all game bitboards into a 2d array representation, with each player's symbol placed.
 * */
function get_boards_as_array(boards) {
	const board = [];
	let bit, player = EMPTY, rows = [];
	
	boards = boards.players;
	for (let row = NUMBER_RANKS - 1n; row >= 0n; row--) {
		rows = [];
		for (let column = 0n; column < NUMBER_FILES; column++) {
			bit = 1n << BigInt(column * STRIDE + row);
			player = EMPTY;
			for (let playerIndex = 0; playerIndex < boards.length; playerIndex++) {
				if ((boards[playerIndex] & bit) !== 0n) {
					player = CONFIG.players[playerIndex];
					break;
				}
			}
			rows.push(player);
		}
		board.push(rows);
	}
	
	return board;
};

/** 
 * @description				Gets the PGN string containing all tags and moves.
 * @param {object} board	A board object created from create_board().
 * @returns {string}		PGN string contains all tags and moves.
 * */
function get_pgn(board) {
	const indexWinner = get_winner(board, true), isDraw = is_draw(board), result = Array.from({ length: CONFIG.players.length }, () => isDraw ? 0.5 : 0);
	
	if (indexWinner !== -1) result[indexWinner] = 1;
	
	return `[Date "${TIME_START}"]
${CONFIG.players.map((player, i) => `[Player_${i + 1} "${player}"]`).join("\n")}
[Result "${result.join("-")}"]
[Termination "${(new Date).toLocaleString([], { timeZoneName: "long" })}"]
[Length_Columns "${NUMBER_FILES}"]
[Length_Connect "${STRIDE}"]
[Length_Rows "${NUMBER_RANKS}"]

${__moves_to_pgn(board.moves.map(move => move.piece + (move.column + 1)))}`
}

/** 
 * @description				Gets the columns of the moves that were played, in the order they were played.
 * @param {object} board	A board object created from create_board().
 * @returns {array<number>}
 * */
function get_pos(board) {
	return board.moves.map(move => move.column + 1);
}

/** 
 * @param {object} board	A board object created from create_board().
 * @returns {array<number>}	An array of legal moves for the current player.
 * */
function get_valid_locations(board) {
	const moves = [];
	
	for (let column = 0; column < CONFIG.columns; column++) {
		if (__bit_move(board, column) !== 0n) moves.push(column);
	}
	
	return moves;
}

/** 
 * @description					Returns the current winner.
 * @param {object} board		A board object created by create_board().
 * @param {boolean} getIndex	Returns the player index instead of their symbol.
 * @returns {number|string}
 * */
function get_winner(board, getIndex=false) {
	for (let i = 0, _len = CONFIG.players.length; i < _len; i++) {
		if (__has_won(board.players[i])) return getIndex ? i : CONFIG.players[i];
	}
	return getIndex ? -1 : "";
}

/** 
 * @description				Checks if the bitboard is in a drawn state.
 * @param {object} board	A game board created from create_board().
 * @returns {boolean}
 * */
function is_draw(board) {
	return board.movesNum >= NUMBER_FILES * NUMBER_RANKS;
}

/** 
 * @description				Checks if the bitboard is in a won state.
 * @param {object} board	A board object created by create_board().
 * @returns {boolean}
 * */
function is_win(board) {
	return __has_won(board.players[(board.currentPlayer - 1n + BigInt(CONFIG.players.length)) % BigInt(CONFIG.players.length)]);
}

/** 
 * @description						Updates game state. You should call this after changing any CONFIG setting or calling the set() function.
 * */
function new_game() {
	__update_constants();
}

/** 
 * @description						Wrapper function for __play_move. Plays a move in the column.
 * @param {object} board			An object created by create_board().
 * @param {number} column			The column to play a piece in.
 * @returns {object}				Containing current bitboard, bitboard mask, and # of moves.
 * */
function play_move(board, column) {
	return __play_move(board, column === null ? __get_best_move(board) : column);
}

/** 
 * @description						Resets game state. Your board will remain unless you call create_board() and use that value.
 * */
function reset_game() {
	__reset_constants();
}

/** 
 * @description					Sets config properties to a value. Used for customizing the system.
 * @param {string} prop			The config property to set.
 * @param {any} value			The value to set prop to.
 * @returns {undefined|false}
 * */
function set(prop, value) {
	let num;
	
	/// TODO: Properly evaluate whether to fully remove.
	// if (!Object.keys(CONFIG).includes(prop)) return false;
	switch (prop) {
		case "columns":
		case "rows":
			if (!Number.isInteger(value) || value < 3 || value < CONFIG.connectLength) {
				if (CONFIG.exitOnError) throw `Invalid property ${prop} value of: ${value}`;
				return false;
			}
			if (CONFIG.exitOnError) ;
				value = BigInt(value);
				break;
		case "connectLength":
			if (!Number.isInteger(value) || value < 2) {
				if (CONFIG.exitOnError) throw `Invalid property connectLength value of: ${value}`;
				return false;
			}
			value = BigInt(value);
			break;
		case "depth":
		case "nodes":
		case "time":
			if (!Number.isInteger(value) || value < 1) {
				if (CONFIG.exitOnError) throw `Invalid property ${prop} value of: ${value}`;
				return false;
			}
			if (prop == "nodes") value = BigInt(value);
			break;
		case "exitOnError":
			if (!value) {
				if (CONFIG.exitOnError) throw `Invalid property pieceEmpty value of: ${value}`;
				return false;
			}
			CONFIG.exitOnError = !!value;
			break;
		case "layoutFile":
			if (!Number.isInteger(value) || value < 0 || value > 3) {
				if (CONFIG.exitOnError) throw `Invalid property layoutFile value of: ${value}. Range 0 - 3.`;
				return false;
			}
			LAYOUT_FILE = value;
			return true;
		case "layoutRank":
			if (!Number.isInteger(value) || value < 0 || value > 3) {
				if (CONFIG.exitOnError) throw `Invalid property layoutRank value of: ${value}. Range 0 - 3.`;
				return false;
			}
			LAYOUT_RANK = value;
			return true;
		case "pieceEmpty":
			if (!value) {
				if (CONFIG.exitOnError) throw `Invalid property pieceEmpty value of: ${value}`;
				return false;
			}
			EMPTY = value;
			return true;
		case "players":
			let _len = CONFIG.players.length;
			if (!Number.isInteger(value) || value < 2) {
				if (CONFIG.exitOnError) throw `Invalid property players value of: ${value}`;
				return false;
			}
			CONFIG.players = CONFIG.players.slice(0, value);
			CONFIG.players.push(...Array.from({ length: value > _len ? value - _len : 0 }, () => ""));
			break;
	}
	if (prop.startsWith("piecePlayer")) {
		num = Number(prop.slice(11, prop.length));
		if (!value.length || !num || !Number.isInteger(num) || num > CONFIG.players.length) {
			if (CONFIG.exitOnError) throw `Invalid property piecePlayer value of: ${value}`;
			return false;
		}
		CONFIG.players[num - 1] = value;
		
		return true;
	}
	CONFIG[prop] = value;
	return true;
}

/** 
 * @description						Sets the board up from an array or string containing which column each piece was placed, and in which order.
 * @param {object} board			A board object created from create_board().
 * @param {array|string} position	An array or string of moves containing each column a move was played in.
 * @returns {object}				The same board object that was passed in.
 * */
function set_pos(board, position) {
	let _pieces = typeof(position) == "string" ? position.split(",") : position, piece = 0;
	
	new_game();
	if (_pieces.length > CONFIG.columns * CONFIG.rows) return board;
	for (let char = 0, _len = _pieces.length; char < _len; char++) {
		const column = +_pieces[char];
		board = play_move(board, column - 1);
		board.moves.push({ column, piece });
		piece = ++piece % CONFIG.players.length;
	}
	
	return board;
}

reset_game();

module.exports = {
	can_play, create_board, display_board, get_best_move, get_bitboard_as_array, get_boards_as_array, get_pgn, get_pos, get_valid_locations, get_winner, is_draw, is_win, new_game, play_move, reset_game, set, set_pos, 
};