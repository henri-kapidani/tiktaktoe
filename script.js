const { createApp } = Vue;

createApp({
	data() {
		return {
			nCells: 9,
			players: ['o', 'x'],
			mode: 'local', // remote

			bigGrid: null,
			grids: null,
			currentPlayer: null,
			currentGridIndex: null,
			gameResult: null,
			isResultOverlayVisible: false,
			modals: {
				start: true,
				result: false,
			},
		};
	},
	methods: {
		initializeGame() {
			this.bigGrid = Array(this.nCells).fill(null);
			this.grids = Array(this.nCells).fill(null).map(e => Array(this.nCells).fill(null));
			this.currentPlayer = this.players[Math.floor(Math.random() * 2)];
		},
		initializeTestGame() {
			this.bigGrid = [null, 'x', 'x', 'o', 'o', null, null, null, null];
			this.grids = [
				[null, 'x', 'x', 'o', null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, null],
				[null, 'o', 'o', null, null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, null],
			];
			this.currentPlayer = 'x';
		},
		setupRemote() {
			this.mode = 'remote';

		},
		putMark(i, j) {
			if (this.isCurrentGrid(i) && this.grids[i][j] === null & !this.gameResult) {
				this.grids[i][j] = this.currentPlayer;

				this.bigGrid[i] = this.gridResultStatus(this.grids[i]);
				this.gameResult = this.gridResultStatus(this.bigGrid);
				this.isResultOverlayVisible = !!this.gameResult;

				if (this.bigGrid[j] !== null) {
					this.currentGridIndex = null;
				} else {
					this.currentGridIndex = j;
				}
				this.currentPlayer = this.currentPlayer === 'o' ? 'x' : 'o';
			}
		},
		gridResultStatus(grid) {
			const u = this.currentPlayer;
			// const strGrid = grid.join('');
			// const combination = Array(this.nCells).fill(this.currentPlayer).join('');
			if (
				grid[0] === u && grid[1] === u && grid[2] === u ||
				grid[3] === u && grid[4] === u && grid[5] === u ||
				grid[6] === u && grid[7] === u && grid[8] === u ||
				grid[0] === u && grid[3] === u && grid[6] === u ||
				grid[1] === u && grid[4] === u && grid[7] === u ||
				grid[2] === u && grid[5] === u && grid[8] === u ||
				grid[0] === u && grid[4] === u && grid[8] === u ||
				grid[2] === u && grid[4] === u && grid[6] === u
			) {
				return this.currentPlayer;
			} else if (!grid.includes(null)) {
				return '-';
			}
			return null;
		},
		isCurrentGrid(i) {
			if (
				(
					(this.currentGridIndex === null && this.bigGrid[i] === null) ||
					(this.currentGridIndex !== null && i === this.currentGridIndex)
				) && !this.gameResult
			) {
				return true;
			}
			return false;
		},
	},
	created() {
		// this.initializeGame();
		this.initializeTestGame();
	}
}).mount('#app');
