/** 
 * @description					Modifies the killer moves array.
 * @param {array} killerMoves	The killer moves array.
 * @param {number} depth		The depth to add a killer move in.
 * @param {number} column		The column of the move.
 * */
function __add_killer_move(killerMoves, depth, column) {
	const moves = killerMoves[depth];
	
	if (column === -1 || !depth || !killerMoves.length || moves.includes(column)) return;
	
	moves.unshift(column);
	if (moves.length > 2) moves.pop();
}

/** 
 * @description				Creates an array for killer moves for different depths.
 * @param {number} maxDepth	The max depth excluding killer move slots. Used to calculate the length of the array.
 * @returns {array<array>}	The array of arrays.
 * */
function __create_killer_moves(maxDepth) {
	return Array.from({ length: maxDepth + 2 }, () => []); // 2 killer move slots.
}

module.exports = { __add_killer_move, __create_killer_moves };