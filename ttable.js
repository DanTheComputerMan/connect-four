function __board_key(board, depth, rootPlayer, extensionNode) {
	return `${depth}:${rootPlayer}:${board.currentPlayer}:${!!extensionNode}:${board.players.join(":")}`;
}

/** 
 * @description		Creates a transposition table.
 * @returns {map}
 * */
function __create_transposition_table() {
	return new Map();
}

/** 
 * @description							Creates a transposition table.
 * @param {map} table					A tranposition table map object.
 * @param {object} board				A board object created from create_board().
 * @param {number} depth				The depth to fetch the entry for.
 * @param {number} rootPlayer			The player index to search the entry for.
 * @param {number} extensionsRemaining	The number of extensions to factor.
 * @param {number} alpha				The lower bound.
 * @param {number} beta					The upper bound.
 * @returns {map}
 * */
function __get_transposition_entry(table, board, depth, rootPlayer, extensionsRemaining, alpha, beta) {
	const key = __board_key(board, depth, rootPlayer, extensionsRemaining), keyEntry = table.get(key);
	
	if (!keyEntry) return { alpha, beta, found: false, score: null };
	if (keyEntry.depth < depth) return { alpha, beta, found: false, score: null };
	
	if (keyEntry.flag === 0) return { alpha, beta, found: true, score: keyEntry.score }; // Exact.
	if (keyEntry.flag === 1) { // Lower bound.
		alpha = Math.max(alpha, keyEntry.score);
	} else if (keyEntry.flag === 2) { // Upper bound.
		beta = Math.min(beta, keyEntry.score);
	}
	
	if (alpha >= beta) return { alpha, beta, found: true, score: keyEntry.score };
	
	return { alpha, beta, found: false, score: null };
}

/** 
 * @description							Creates a transposition table.
 * @param {map} table					A tranposition table map object.
 * @param {object} board				A board object created from create_board().
 * @param {number} depth				The depth to store the entry for.
 * @param {number} rootPlayer			The player index to store the entry for.
 * @param {number} extensionsRemaining	The number of extensions to factor.
 * @param {number} score				The saved evaluation for this position.
 * @param {number} flag					The flag (0 - 2) for exact, lower bound, or upper bound.
 * @returns {map}
 * */
function __store_transposition_entry(table, board, depth, rootPlayer, extensionsRemaining, score, flag) {
	/// TODO: This has extensionsRemaining, but __board_key takes extensionNode here. Must have developed at some point. Worth investigating if there's a bug.
	const key = __board_key(board, depth, rootPlayer, extensionsRemaining), keyExisting = table.get(key);
	
	// More shallow search can't replace a deeper entry.
	if (keyExisting && keyExisting.depth > depth) return;
	
	table.set(key, { depth, score, flag });
}

module.exports = { __create_transposition_table, __get_transposition_entry, __store_transposition_entry };