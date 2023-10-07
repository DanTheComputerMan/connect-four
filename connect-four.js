const GAMESTATE = {}, CONFIG = {
	columns: 7,
	rows: 6,
	length: 4
}, handler = {
	get(target, property) {
		switch (property.toLowerCase()) {
			case "full":
				return !BOARD[0].some(c => c === EMPTY);
			case "over":
				return target["full"] || target["won"];
			case "victor":
			case "winner":
				if (winning_move(BOARD, AIP)) return AIP;
				if (winning_move(BOARD, PLP)) return PLP;
				return undefined;
			case "won":
				return winning_move(BOARD, AIP) || winning_move(BOARD, PLP);
			default:
				return target[property];
		}
	}
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
}, GAME = new Proxy(GAMESTATE, handler);

const AIP = COLORS.yellow, EMPTY = COLORS.black, PLP = COLORS.red, TURN = PLP;

let BOARD = [[]];

function can_play(column) {
	return BOARD[0][column] === EMPTY;
}

function display_board() {
	return BOARD;
}

function evaluate_window(window, piece) {
	let score = 0, opponentPiece = (piece === PLP) ? AIP : PLP, _numConnected = window.filter(p => p === piece).length, 
		_numEmpty = window.filter(p => p === EMPTY).length, _numOpponentConnected = window.filter(p => p === opponentPiece).length;
	
	if (_numConnected === CONFIG.length) { // Depth 0 optimization.
		score += 100;
	} else {
		let _windowSize = 1;
		while(_windowSize <= CONFIG.length - 2) { // Score connect 2s at the smallest.
			if (_numConnected === CONFIG.length - _windowSize && _numEmpty === _windowSize) {
				score += 2.5 * _windowSize;
			}
			if (_numOpponentConnected === CONFIG.length - _windowSize && _numEmpty === _windowSize) {
				score -= 2 * _windowSize;
			}
			_windowSize++;
		}
	}
	
	return score;
}

function get_valid_locations(board) {
	// Move-order optimization for improved alpha beta pruning. Explores center column outwards.
	let validLocations = [], middle = Math.floor(validLocations.length / 2);
	for (let col = 0; col < CONFIG.columns; col++) {
		if (board[0][col] === EMPTY) validLocations.push(col);
	}
	
	return validLocations.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));
}

function is_terminal_node(board) {
	return get_valid_locations(board).length === 0 || winning_move(board, AIP) || winning_move(board, PLP);
}

function minimax(board, depth, alpha, beta, maximizingPlayer) {
	let validLocations = get_valid_locations(board), isTerminal = is_terminal_node(board);
	if (depth === 0 || isTerminal) {
		if (isTerminal) {
			if (winning_move(board, AIP)) {
				return [ null, 1000000 ];
			} else if (winning_move(board, PLP)) {
				return [ null, -1000000 ];
			} else {
				return [ null, 0 ];
			}
		} else {
			return [ null, score_position(board, AIP) ];
		}
	}
	if (maximizingPlayer) {
		let value = -Infinity, column = 0;
		for (let col of validLocations) {
			let copy = board.map((a) => a.slice());
			
			play(copy, col, AIP);
			
			let newScore = minimax(copy, depth - 1, alpha, beta, false)[1];
			if (newScore > value) {
				value = newScore;
				column = col;
			}
			alpha = Math.max(value, alpha);
			if (alpha >= beta) break;
		}
		return [ column, value ];
	} else {
		let value = Infinity, column = 0;
		for (let col of validLocations) {
			let copy = board.map((a) => a.slice());
			
			play(copy, col, PLP);
			let newScore = minimax(copy, depth - 1, alpha, beta, true)[1];
			if (newScore < value) {
				value = newScore;
				column = col;
			}
			beta = Math.min(value, beta);
			if (alpha >= beta) break;
		}
		return [ column, value ];
	}
}

function new_game() {
	BOARD = Array(CONFIG.rows).fill(EMPTY).map(() => Array(CONFIG.columns).fill(EMPTY));
}

function play(board, col, piece) {
	if (board[0][col] !== EMPTY) return false;
	for (let row = CONFIG.rows - 1; row >= 0; row--) {
		if (board[row][col] === EMPTY) {
			board[row][col] = piece;
			return true;
		}
	}
}

function play_ai(col=false, depth=7) { 
	if (col) return play(BOARD, col, AIP);
	return play(BOARD, minimax(BOARD, depth, -Infinity, Infinity, true)[0], AIP);
}

function play_human(col) { 
	if (BOARD[0][col] !== EMPTY) return false;
	for (let row = CONFIG.rows - 1; row >= 0; row--) {
		if (BOARD[row][col] === EMPTY) {
			BOARD[row][col] = PLP;
			return true;
		}
	}
}

function score_position(board, piece) {
	let score = 0;
	
	// Score center column
	let centeredArray = board.map(p => parseInt(p[Math.floor(CONFIG.columns / 2)])), 
		centeredCount = centeredArray.filter(p => p === piece).length;
	score += 3 * centeredCount;
	
	// Horizontal
	for (let row = 0; row < CONFIG.rows; row++) {
		for (let col = 0; col < CONFIG.columns - CONFIG.length; col++) {
			let window = board[row].slice(col, col + CONFIG.length);
			score += evaluate_window(window, piece);
		}
	}
	
	// Vertical
	for (let col = 0; col < CONFIG.columns; col++) {
		let colArray = board.map(r => r[col]);
		for (let row = 0; row < CONFIG.rows - CONFIG.length; row++) {
			let window = colArray.slice(row, row + CONFIG.length);
			score += evaluate_window(window, piece);
		}
	}
	
	// Negative Diagonal \
	for (let row = 0; row <= CONFIG.rows - CONFIG.length; row++) {
		for (let col = 0; col <= CONFIG.columns - CONFIG.length; col++) {
			if (board[row][col] !== piece) continue;
			let window = board.map((r, i, arr) => (row + i > CONFIG.rows - 1) ? EMPTY : arr[row + i][col + i])
								.filter(p => p !== undefined).slice(0, CONFIG.length);
			
			score += evaluate_window(window, piece);
		}
	}
	
	// Positive Diagonal /
	for (let row = CONFIG.length - 1; row < CONFIG.rows; row++) {
		for (let col = 0; col <= CONFIG.columns - CONFIG.length; col++) {
			if (board[row][col] !== piece) continue;
			let window = board.map((r, i, arr) => (row - i < 0) ? EMPTY : arr[row - i][col + i])
								.filter(p => p !== undefined).slice(0, CONFIG.length);
			
			score += evaluate_window(window, piece);
		}
	}
	
	return score;
}

function set(prop, value) {
	if (!Object.keys(CONFIG).includes(prop)) return false;
	switch (prop) {
		case "columns":
		case "rows":
			if (!Number.isInteger(value) || value < 3 || value < CONFIG.length) return false;
			break;
		case "length":
			if (!Number.isInteger(value) || value < 3 || value < CONFIG.rows || value < CONFIG.columns) return false;
			break;
	}
	CONFIG[prop] = value;
	// QOL feature to create a new board with the new settings.
	if ((BOARD[CONFIG.rows] || [ EMPTY ]).every(c => c === EMPTY)) new_game();
}

function set_ai_piece(piece) {
	AIP = piece;
}

function set_empty_piece(piece) {
	EMPTY = piece;
}

function set_player_piece(piece) {
	PLP = piece;
}

function set_pos(position) { // e.g. "2,7,2,1,2,4,5,5,3,5,5,6"
	let _pieces = position.split(",");
	if (_pieces.length > CONFIG.columns * CONFIG.rows) return false;
	let _t = TURN;
	for (let char = 0; char < _pieces.length; char++) {
		play(BOARD, _pieces[+char] - 1, _t);
		_t = (_t === AIP) ? PLP : AIP;
	}
	return true;
}

function winning_move(board, piece) {
	// Horizontal
	for (let col = 0; col < CONFIG.columns - CONFIG.length; col++) {
		for (let row = 0; row < CONFIG.rows; row++) {
			if (board[row][col] !== piece) continue;
			// Optimization for most common connect lengths.
			if (CONFIG.length === 4) {
				if (board[row][col] === board[row][col + 1] && board[row][col + 1] === board[row][col + 2] && board[row][col + 2] === board[row][col + 3]) return true;
			} else if (CONFIG.length === 5) {
				if (board[row][col] === board[row][col + 1] && board[row][col + 1] === board[row][col + 2] && board[row][col + 2] === board[row][col + 3] && board[row][col + 3] === board[row][col + 4]) return true;
			} else if (CONFIG.length === 3) {
				if (board[row][col] === board[row][col + 1] && board[row][col + 1] === board[row][col + 2]) return true;
			} else {
				let _pieces = [];
				for (let i = 0; i < CONFIG.length; i++) {
					_pieces.push(board[row][col + i]);
				}
				if (_pieces.every(p => p === _pieces[0])) return true;
			}
		}
	}
	// Vertical
	for (let col = 0; col < CONFIG.columns; col++) {
		for (let row = 0; row <= CONFIG.rows - CONFIG.length; row++) {
			if (board[row][col] !== piece) continue;
			if (CONFIG.length === 4) {
				if (board[row][col] === board[row + 1][col] && board[row + 1][col] === board[row + 2][col] && board[row + 2][col] === board[row + 3][col]) return true;
			} else if (CONFIG.length === 5) {
				if (board[row][col] === board[row + 1][col] && board[row + 1][col] === board[row + 2][col] && board[row + 2][col] === board[row + 3][col] && board[row + 3][col] === board[row + 4][col]) return true;
			} else if (CONFIG.length === 3) {
				if (board[row][col] === board[row + 1][col] && board[row + 1][col] === board[row + 2][col]) return true;
			} else {
				let _pieces = [];
				for (let i = 0; i < CONFIG.length; i++) {
					_pieces.push(board[row + i][col]);
				}
				if (_pieces.every(p => p === _pieces[0])) return true;
			}
		}
	}
	// Negative Diagonal \
	for (let row = 0; row <= CONFIG.rows - CONFIG.length; row++) {
		for (let col = 0; col <= CONFIG.columns - CONFIG.length; col++) {
			if (board[row][col] !== piece) continue;
			if (CONFIG.length === 4) {
				if (board[row][col] === board[row + 1][col + 1] && board[row + 1][col + 1] === board[row + 2][col + 2] && board[row + 2][col + 2] === board[row + 3][col + 3]) return true;
			} else if (CONFIG.length === 5) {
				if (board[row][col] === board[row + 1][col + 1] && board[row + 1][col + 1] === board[row + 2][col + 2] && board[row + 2][col + 2] === board[row + 3][col + 3] && board[row + 3][col + 3] === board[row + 4][col + 4]) return true;
			} else if (CONFIG.length === 3) {
				if (board[row][col] === board[row + 1][col + 1] && board[row + 1][col + 1] === board[row + 2][col + 2]) return true;
			} else {
				let _pieces = [];
				for (let i = 0; i < CONFIG.length; i++) {
					_pieces.push(board[row + i][col + i]);
				}
				if (_pieces.every(p => p === _pieces[0])) return true;
			}
		}
	}
	// Positive Diagonal /
	for (let row = CONFIG.length - 1; row < CONFIG.rows; row++) {
		for (let col = 0; col <= CONFIG.columns - CONFIG.length; col++) {
			if (board[row][col] !== piece) continue;
			if (CONFIG.length === 4) {
				if (board[row][col] === board[row - 1][col + 1] && board[row - 1][col + 1] === board[row - 2][col + 2] && board[row - 2][col + 2] === board[row - 3][col + 3]) return true;
			} else if (CONFIG.length === 5) {
				if (board[row][col] === board[row - 1][col + 1] && board[row - 1][col + 1] === board[row - 2][col + 2] && board[row - 2][col + 2] === board[row - 3][col + 3] && board[row - 3][col + 3] === board[row - 4][col + 4]) return true;
			} else if (CONFIG.length === 3) {
				if (board[row][col] === board[row - 1][col + 1] && board[row - 1][col + 1] === board[row - 2][col + 2]) return true;
			} else {
				let _pieces = [];
				for (let i = 0; i < CONFIG.length; i++) {
					_pieces.push(board[row - i][col + i]);
				}
				if (_pieces.every(p => p === _pieces[0])) return true;
			}
		}
	}
	return false;
}

new_game();

module.exports = {
	can_play, display_board, get_valid_locations, new_game, play_ai, 
	play_human, set, set_ai_piece, set_empty_piece, set_player_piece, 
	set_pos, 
};