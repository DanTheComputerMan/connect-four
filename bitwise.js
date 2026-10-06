/** 
 * @description				Validates a bit can be placed in a column.
 * @param {bigint} board	A board object created from create_board().
 * @param {number} column	The column to check.
 * @returns {number}		Returns bit result if successful or 0n if not.
 * */
function __bit_move(board, column) {
	const columnMask = MASKS_COLUMN[column], columnBits = board.mask & columnMask;
	let bit;
	
	for (let row = 0n; row < NUMBER_RANKS; row++) {
		bit = 1n << (BigInt(column) * STRIDE + row);
		if (!(columnBits & bit)) return bit;
	}
	
	return 0n;
};

// Deprecated.
function __bit_get(bitboard, circle)  { return bitboard & (1n << circle);   };
function __bit_flip(bitboard, circle) { return bitboard ^= (1n << circle);  };
function __bit_pop(bitboard, circle)  { return bitboard &= ~(1n << circle); };
function __bit_set(bitboard, circle)  { return bitboard |= (1n << circle);  };

/** 
 * @description				Get # of bits in a BigInt bitboard. This is slow in JS, but this method is faster than the while loop method.
 * @param {bigint} bitboard	A BigInt bitboard.
 * @returns {number}		# of bits in bitboard. -1 if less than 0.
 * */
function __popcount(bitboard) {
    return (bitboard < 0n) ? -1 : bitboard.toString(2).replaceAll('0', '').length;
}

module.exports = { __bit_move, __popcount };