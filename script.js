const { createApp } = Vue;

createApp({
  data() {
    return {
      bigGrid: [null, null, null, null, null, null, null, null, null],
      grids: [
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
      ],
      currentPlayer: 'o',
      currentGridIndex: null,
      gameEnded: false,
    }
  },
  methods: {
    putMark(i, j) {
        if (this.isCurrentGrid(i) && this.grids[i][j] === null & !this.gameEnded) {
            this.grids[i][j] = this.currentPlayer;
            
            if (this.isGridWinner(this.grids[i])) {
                this.bigGrid[i] = this.currentPlayer;

                if (this.isGridWinner(this.bigGrid)) {
                    this.gameEnded = true;
                }
            }

            if (this.bigGrid[j] !== null) {
                this.currentGridIndex = null;
            } else {
                this.currentGridIndex = j;
            }
            this.currentPlayer = this.currentPlayer === 'o' ? 'x' : 'o';
        }
    },
    isGridWinner(grid) {
        const u = this.currentPlayer;
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
            return true;
        }
        return false;
    },
    isCurrentGrid(i) {
        if (
            (
                (this.currentGridIndex === null && this.bigGrid[i] === null) ||
                (this.currentGridIndex !== null && i === this.currentGridIndex)
            ) && !this.gameEnded
        ) {
            return true;
        }
        return false;        
    }
  },
}).mount('#app');