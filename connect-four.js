const GAMESTATE = {}, CONFIG = {
	columns: 7, 
	depth: 9, 
	history: [], 
	length: 4, 
	rows: 6,
}, handler = {
	get(target, property) {
		switch (property.toLowerCase()) {
			case "full":
				return !BOARD[0].some(c => c === EMPTY);
			case "over":
				return GAME.full || GAME.won;
			case "victor":
			case "winner":
				if (winning_move(BOARD, AIP)) return AIP;
				if (winning_move(BOARD, PLP)) return PLP;
				return undefined;
			case "won":
				return winning_move(BOARD, AIP) || winning_move(BOARD, PLP);
			default: // Fallback.
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

let AIP = COLORS.yellow, EMPTY = COLORS.black, PLP = COLORS.red, TURN = PLP, BOARD = [[]];

function can_play(column) {
	return BOARD[0][column] === EMPTY;
}

function display_board() {
	return BOARD;
}

function evaluate_window(window, piece) {
	let _score = 0, _opponentPiece = (piece === PLP) ? AIP : PLP, _numConnected = window.filter(p => p === piece).length, 
		_numEmpty = window.filter(p => p === EMPTY).length, _numOpponentConnected = window.filter(p => p === _opponentPiece).length;
	
	if (_numConnected === CONFIG.length) { // Depth 0 optimization.
		_score += 100;
	} else {
		let _windowSize = 1;
		while(_windowSize <= CONFIG.length - 2) { // Score connect 2s at the smallest.
			if (_numConnected === CONFIG.length - _windowSize && _numEmpty === _windowSize) {
				_score += 3 * _windowSize;
			}
			
			if (_numOpponentConnected === CONFIG.length - _windowSize && _numEmpty === _windowSize) {
				_score -= 2 * _windowSize;
			}
			_windowSize++;
		}
	}
	
	return _score;
}

function get_best_move(depth=CONFIG.depth) {
	if (depth < 1) return undefined;
	return player_minimax(BOARD, depth, -Infinity, Infinity, true)[0];
}

function get_next_row(board, col) {
	for (let row = CONFIG.rows - 1; row >= 0; row--) {
		if (board[row][col] === EMPTY) return row;
	}
}

function get_pos() {
	return GAME.history.map(move => move.column + 1).join(",");
}

function get_valid_locations(board) {
	let _validLocations = [];
	for (let col = 0; col < CONFIG.columns; col++) {
		if (board[0][col] === EMPTY) _validLocations.push(col);
	}
	
	return _validLocations;
}

function is_terminal_node(board) {
	return get_valid_locations(board).length === 0 || winning_move(board, AIP) || winning_move(board, PLP);
}

function player_minimax(board, depth, alpha, beta, maximizingPlayer) {
	let _validLocations = get_valid_locations(board), _isTerminal = is_terminal_node(board);
	if (depth === 0 || _isTerminal) {
		if (_isTerminal) {
			if (winning_move(board, PLP)) {
				return [ null, 1000000 ];
			} else if (winning_move(board, AIP)) {
				return [ null, -1000000 ];
			} else {
				return [ null, 0 ];
			}
		} else {
			return [ null, score_position(board, PLP) ];
		}
	}
	if (maximizingPlayer) {
		let _column = 0, _value = -Infinity;
		for (let col of _validLocations) {
			let _newScore = 0, _row = get_next_row(board, col);
			play(board, col, PLP);
			
			_newScore = minimax(board, depth - 1, alpha, beta, false)[1];
			
			board[_row][col] = EMPTY; // Small optimization instead of copying the array.
			
			if (_newScore > _value) {
				_value = _newScore;
				_column = col;
			}
			
			alpha = Math.max(_value, alpha);
			if (alpha >= beta) break;
		}
		return [ _column, _value ];
	} else {
		let _column = 0, _value = Infinity;
		for (let col of _validLocations) {
			let _newScore = 0, _row = get_next_row(board, col);
			play(board, col, AIP);
			
			_newScore = minimax(board, depth - 1, alpha, beta, true)[1];
			
			board[_row][col] = EMPTY;
			
			if (_newScore < _value) {
				_value = _newScore;
				_column = col;
			}
			
			beta = Math.min(_value, beta);
			if (alpha >= beta) break;
		}
		return [ _column, _value ];
	}
}

function minimax(board, depth, alpha, beta, maximizingPlayer) {
	let _validLocations = get_valid_locations(board), _isTerminal = is_terminal_node(board);
	if (depth === 0 || _isTerminal) {
		if (_isTerminal) {
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
		let _column = 0, _value = -Infinity;
		for (let col of _validLocations) {
			let _newScore = 0, _row = get_next_row(board, col);
			play(board, col, AIP);
			
			_newScore = minimax(board, depth - 1, alpha, beta, false)[1];
			
			board[_row][col] = EMPTY;
			
			if (_newScore > _value) {
				_value = _newScore;
				_column = col;
			}
			
			alpha = Math.max(_value, alpha);
			if (alpha >= beta) break;
		}
		return [ _column, _value ];
	} else {
		let _column = 0, _value = Infinity;
		for (let col of _validLocations) {
			let _newScore = 0, _row = get_next_row(board, col);
			play(board, col, PLP);
			
			_newScore = minimax(board, depth - 1, alpha, beta, true)[1];
			
			board[_row][col] = EMPTY;
			
			if (_newScore < _value) {
				_value = _newScore;
				_column = col;
			}
			
			beta = Math.min(_value, beta);
			if (alpha >= beta) break;
		}
		return [ _column, _value ];
	}
}

function new_game() {
	BOARD = Array(CONFIG.rows).fill(EMPTY).map(() => Array(CONFIG.columns).fill(EMPTY));
	GAME.history = [];
}

function play(board, col, piece) {
	if (board[0][col] !== EMPTY) return false;
	board[get_next_row(board, col)][col] = piece;
	return true;
}

function play_ai(col=false, depth=CONFIG.depth) { 
	if (col >= CONFIG.columns || depth < 1) return false;
	if (col || col === 0) return play(BOARD, col, AIP);
	
	let _col = minimax(BOARD, depth, -Infinity, Infinity, true)[0];
	GAME.history.push({ column: _col, piece: AIP });
	return play(BOARD, _col, AIP);
}

function play_human(col) { 
	if (col >= CONFIG.columns) return false;
	if (BOARD[0][col] !== EMPTY) return false;
	for (let row = CONFIG.rows - 1; row >= 0; row--) {
		if (BOARD[row][col] === EMPTY) {
			BOARD[row][col] = PLP;
			GAME.history.push({ column: col, piece: PLP });
			return true;
		}
	}
}

function score_position(board, piece) {
	let _score = 0;
	
	// Score center column
	let _centeredArray = board.map(p => parseInt(p[Math.floor(CONFIG.columns / 2)])), 
		_centeredCount = _centeredArray.filter(p => p === piece).length;
	_score += 3 * _centeredCount;
	
	// Horizontal
	for (let row = 0; row < CONFIG.rows; row++) {
		for (let col = 0; col < CONFIG.columns - CONFIG.length; col++) {
			let _window = board[row].slice(col, col + CONFIG.length);
			_score += evaluate_window(_window, piece);
		}
	}
	
	// Vertical
	for (let col = 0; col < CONFIG.columns; col++) {
		let _colArray = board.map(r => r[col]);
		for (let row = 0; row < CONFIG.rows - CONFIG.length; row++) {
			let _window = _colArray.slice(row, row + CONFIG.length);
			_score += evaluate_window(_window, piece);
		}
	}
	
	// Negative Diagonal \
	for (let row = 0; row <= CONFIG.rows - CONFIG.length; row++) {
		for (let col = 0; col <= CONFIG.columns - CONFIG.length; col++) {
			if (board[row][col] !== piece) continue;
			let _window = board.map((r, i, arr) => (row + i > CONFIG.rows - 1) ? EMPTY : arr[row + i][col + i])
								.filter(p => p !== undefined).slice(0, CONFIG.length);
			
			_score += evaluate_window(_window, piece);
		}
	}
	
	// Positive Diagonal /
	for (let row = CONFIG.length - 1; row < CONFIG.rows; row++) {
		for (let col = 0; col <= CONFIG.columns - CONFIG.length; col++) {
			if (board[row][col] !== piece) continue;
			let _window = board.map((r, i, arr) => (row - i < 0) ? EMPTY : arr[row - i][col + i])
								.filter(p => p !== undefined).slice(0, CONFIG.length);
			
			_score += evaluate_window(_window, piece);
		}
	}
	
	return _score;
}

function set(prop, value) {
	if (!Object.keys(CONFIG).includes(prop)) return false;
	switch (prop) {
		case "columns":
		case "rows":
			if (!Number.isInteger(value) || value < 3 || value < CONFIG.length) return false;
			break;
		case "depth":
			if (!Number.isInteger(value) || value < 1) return false;
			break;
		// case "length":
		// 	if (!Number.isInteger(value) || value < 3 || value < CONFIG.rows || value < CONFIG.columns) return false;
		// 	break;
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
	let _pieces = position.split(","), _t = TURN;
	new_game();
	
	if (_pieces.length > CONFIG.columns * CONFIG.rows) return false;
	
	for (let char = 0; char < _pieces.length; char++) {
		play(BOARD, +_pieces[char] - 1, _t);
		GAME.history.push({ column: +_pieces[char], piece: _t });
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
	can_play, display_board, get_best_move, get_pos, get_valid_locations, 
	new_game, play_ai, play_human, set, set_ai_piece, 
	set_empty_piece, set_player_piece, set_pos, 
};