const { createApp } = Vue;

createApp({
	data() {
		return {
			theme: 'theme-light',
			nCells: 9,
			players: ['o', 'x'],
			mode: null, // 'local' or 'remote'
			options: {
				iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
			},
			pc: null,
			searchParams: null,
			isOfferSide: null,
			offer: null,
			answer: null,
			channelData: null,

			bigGrid: null,
			grids: null,
			currentPlayer: null,
			playerIdentity: null,
			currentGridIndex: null,
			gameResult: null,
			modals: {
				start: false,
				remoteType: false,
				shareOffer: false,
				shareAnswer: false,
				waitingConnection: false,
				insertOffer: false,
				insertAnswer: false,
				result: false,
			},
		};
	},

	methods: {
		invertTheme() {
			this.theme = this.theme === 'theme-light' ? 'theme-dark' : 'theme-light';
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

		initializeGame() {
			this.bigGrid = Array(this.nCells).fill(null);
			this.grids = Array(this.nCells).fill(null).map(e => Array(this.nCells).fill(null));
			this.currentPlayer = this.players[Math.floor(Math.random() * 2)];
		},

		setupLocal() {
			this.mode = 'local';
			// TODO: this.pc = null;
		},

		setupRemote() {
			this.mode = 'remote';

			this.pc = new RTCPeerConnection(this.options);

			this.pc.onicegatheringstatechange = e => {
				if (e.target.iceGatheringState === 'complete') {
					if (this.isOfferSide) {
						this.offer = btoa(JSON.stringify(this.pc.localDescription));
					} else {
						this.answer = btoa(JSON.stringify(this.pc.localDescription));
					}
				}
			}

			this.channelData = this.pc.createDataChannel('channelData', {
				negotiated: true,
				id: 1,
			});

			this.channelData.onopen = e => {
				if (this.isOfferSide) {
					this.playerIdentity = this.players[Math.floor(Math.random() * 2)];
					this.channelData.send(JSON.stringify({
						type: 'configuration',
						playerIdentity: this.playerIdentity === 'x' ? 'o' : 'x',
						currentPlayer: this.currentPlayer,
					}));
				} else {
					this.modals.waitingConnection = false;
				}
			};

			this.channelData.onmessage = e => {
				const data = JSON.parse(e.data);
				switch (data.type) {
					case 'configuration':
						this.playerIdentity = data.playerIdentity;
						this.currentPlayer = data.currentPlayer;
						break;
					case 'move':
						this.putMark(data.i, data.j, true);
						break;
					default:
						break;
				}
				console.log(data);
			}

			if (this.isOfferSide) {
				this.pc.createOffer()
					.then(offer => this.pc.setLocalDescription(offer));
				// send the offer to the other peer via the signaling
				// completeConnection
			} else {

			}
		},

		actionPlayLocal() {
			this.setupLocal();
			this.showModal(null);
		},

		actionPlayRemote(isOfferSide) {
			this.isOfferSide = isOfferSide;
			this.setupRemote();
			if (isOfferSide) {
				this.showModal('shareOffer');
			} else {
				this.showModal('insertOffer');
			}
		},

		actionShareOffer() {
			if (navigator.share) {
				const shareData = {
					title: "TikTakToe",
					text: this.offer,
				};
				navigator.share(shareData);
			} else {
				navigator.clipboard(this.offer);
			}
			this.showModal('insertAnswer');
		},

		actionInsertOffer() {
			const offer = JSON.parse(atob(this.offer));
			this.pc.setRemoteDescription(offer)
				.then(() => this.pc.createAnswer())
				.then(answer => this.pc.setLocalDescription(answer))
			//send the answer to the other peer via the signaling
			this.showModal('shareAnswer');
		},

		actionShareAnswer() {
			if (navigator.share) {
				const shareData = {
					title: "TikTakToe",
					text: this.answer,
				};
				navigator.share(shareData);
			} else {
				navigator.clipboard(this.answer);
			}
			this.showModal('waitingConnection');
		},

		actionInsertAnswer() {
			this.pc.setRemoteDescription(JSON.parse(atob(this.answer)));
			this.showModal(null);
		},

		showModal(modalName) {
			for (const key in this.modals) {
				this.modals[key] = false;
			}
			if (modalName) this.modals[modalName] = true;
		},

		putMark(i, j, remote) {
			if ((this.isCurrentGrid(i, true) && this.grids[i][j] === null && !this.gameResult) || remote) {
				this.grids[i][j] = this.currentPlayer;

				this.bigGrid[i] = this.gridResultStatus(this.grids[i]);
				this.gameResult = this.gridResultStatus(this.bigGrid);
				this.modals.result = !!this.gameResult;

				if (this.bigGrid[j] !== null) {
					this.currentGridIndex = null;
				} else {
					this.currentGridIndex = j;
				}
				this.currentPlayer = this.currentPlayer === 'o' ? 'x' : 'o';
				if (this.mode === 'remote' && !remote) {
					this.channelData.send(JSON.stringify({
						type: 'move',
						i: i,
						j: j,
					}));
				}
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

		isCurrentGrid(i, considerRemote) {
			if (
				(
					(this.currentGridIndex === null && this.bigGrid[i] === null) ||
					(this.currentGridIndex !== null && i === this.currentGridIndex)
				) && !this.gameResult
			) {
				if (considerRemote && this.mode === 'remote' && (this.currentPlayer != this.playerIdentity)) {
					return false;
				} else {
					return true;
				}
			}
			return false;
		},
	},

	created() {
		this.initializeGame();
		// this.initializeTestGame();
	}
}).mount('#app');
