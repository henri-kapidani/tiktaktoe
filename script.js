const { createApp } = Vue;

/*
offer side:
actionPlayRemote(true)
actionShareOffer
actionInsertAnswer


answer side:
actionPlayRemote(false)
actionInsertOffer
actionShareAnswer
*/

const app = createApp({
	data() {
		return {
			theme: 'light',
			nCells: 9,
			players: ['o', 'x'],
			mode: null, // 'local' or 'remote'
			lastMove: { i: null, j: null },
			isShowLastMove: false,

			options: {
				iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
			},
			pc: null,
			isOfferSide: null,
			description: null,
			channelData: null,
			hasMicPermission: false,
			isMicEnabled: false,
			localStream: null,
			remoteStream: null,
			eleAudio: null,

			grids: null,
			currentPlayer: null,
			playerIdentity: null,
			currentGridIndex: null,

			modals: {
				start: true,
				remoteType: false,
				shareOffer: false,
				shareAnswer: false,
				waitingConnection: false,
				insertOffer: false,
				insertAnswer: false,
				// result: false,
			},
		};
	},

	methods: {
		invertTheme() {
			this.theme = this.theme === 'light' ? 'dark' : 'light';
		},

		initializeTestGame() {
			this.grids = [
				[null, 'x', 'x', 'o', null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, null],
				['o', 'o', 'o', 'o', null, null, null, null, null],
				[null, 'o', 'o', null, null, null, null, null, null],
				[null, 'o', 'o', null, null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, null],
				[null, 'x', 'x', 'o', null, null, null, null, 'x'],
			];
			this.currentPlayer = 'x';
		},

		initializeGame() {
			this.grids = Array(this.nCells).fill(null).map(e => Array(this.nCells).fill(null));
			this.currentPlayer = this.players[Math.floor(Math.random() * 2)];
		},

		setupLocal() {
			this.mode = 'local';
			// TODO: this.pc = null;
		},

		async setupRemote() {
			this.mode = 'remote';

			this.pc = new RTCPeerConnection(this.options);

			this.remoteStream = new MediaStream();
			this.eleAudio = new Audio();
			this.eleAudio.autoplay = true;
			this.eleAudio.srcObject = this.remoteStream;

			try {
				this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
				this.localStream.getTracks().forEach(track => {
					track.enabled = this.isMicEnabled;
					this.pc.addTrack(track, this.localStream);
				});
				this.hasMicPermission = true;
			} catch (error) {
				console.log(error);
			}

			this.channelData = this.pc.createDataChannel('channelData', {
				negotiated: true,
				id: 1,
			});

			this.pc.onicegatheringstatechange = ev => {
				if (ev.target.iceGatheringState === 'complete') {
					this.description = btoa(JSON.stringify(this.pc.localDescription));
				}
			}

			this.pc.ontrack = ev => {
				// console.log('----------------------ontrack-------------------');
				// console.log(ev);
				ev.streams[0].getTracks().forEach(track => {
					this.remoteStream.addTrack(track);
				});
			};

			this.channelData.onopen = ev => {
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
			}

			this.channelData.onmessage = ev => {
				const data = JSON.parse(ev.data);
				switch (data.type) {
					case 'configuration':
						this.playerIdentity = data.playerIdentity;
						this.currentPlayer = data.currentPlayer;
						this.resetGrid();
						break;
					case 'move':
						this.putMark(data.i, data.j, true);
						break;
					default:
						break;
				}
				console.log(data);
			}
		},

		actionPlayLocal() {
			this.setupLocal();
			this.showModal(null);
		},

		async actionPlayRemote(isOfferSide) {
			this.isOfferSide = isOfferSide;
			await this.setupRemote();
			if (isOfferSide) {
				const offer = await this.pc.createOffer();
				await this.pc.setLocalDescription(offer);
				this.showModal('shareOffer');
			} else {
				this.showModal('insertOffer');
			}
		},

		async actionShareOffer() {
			await this.shareDescription();
			this.description = null;
			this.showModal('insertAnswer');
		},

		async actionShareAnswer() {
			await this.shareDescription();
			this.description = null;
			this.showModal('waitingConnection');
		},

		async shareDescription() {
			await navigator.clipboard.writeText(this.description);
			if (navigator.share) {
				const shareData = {
					title: "TikTakToe",
					text: this.description,
				};
				await navigator.share(shareData);
			}
		},

		async actionInsertOffer() {
			const objDescription = JSON.parse(atob(this.description));
			await this.pc.setRemoteDescription(objDescription);

			const answer = await this.pc.createAnswer();
			await this.pc.setLocalDescription(answer);
			//send the answer to the other peer via the signaling
			this.showModal('shareAnswer');
		},

		async actionInsertAnswer() {
			const objDescription = JSON.parse(atob(this.description));
			await this.pc.setRemoteDescription(objDescription);
			this.showModal(null);
		},

		actionPlayAgain() {
			// TODO:
			if (this.mode === 'remote') {
				if (this.isOfferSide) {
					this.resetGrid();
					channelData.send(JSON.stringify({
						type: 'configuration',
						playerIdentity: this.playerIdentity === 'x' ? 'o' : 'x',
						currentPlayer: this.currentPlayer,
					}));
				}
			} else {
				this.resetGrid();
			}

		},

		resetGrid() {
			this.grids.forEach(smallGrid => smallGrid.fill(null));
		},

		toggleMic() {
			// const audioTrack = this.localStream.getTracks().find(track => track.kind === 'audio');
			const audioTrack = this.localStream.getTracks()[0];
			this.isMicEnabled = !this.isMicEnabled;
			audioTrack.enabled = this.isMicEnabled;
			// console.log(this.pc.getSenders());
		},

		showLastMove() {
			if (this.lastMove.i !== null) {
				if (!this.isShowLastMove) {
					setTimeout(() => {
						this.isShowLastMove = false;
					}, 2000);
				}
				this.isShowLastMove = true;
			}
		},

		showModal(modalName) {
			for (const key in this.modals) {
				this.modals[key] = false;
			}
			if (modalName) this.modals[modalName] = true;
		},

		putMark(i, j, remote) {
			if ((this.isCurrentGrid(i, true) && this.grids[i][j] === null && !this.gameResult.player) || remote) {
				this.isShowLastMove = false;
				this.grids[i][j] = this.currentPlayer;

				if (this.bigGrid[j] !== null) {
					this.currentGridIndex = null;
				} else {
					this.currentGridIndex = j;
				}
				this.currentPlayer = this.currentPlayer === 'o' ? 'x' : 'o';
				this.lastMove.i = i;
				this.lastMove.j = j;
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
			const gridSide = Math.sqrt(this.nCells);

			// check vertical rows
			for (let i = 0; i < gridSide; i++) {
				const indexes = [];
				const player = grid[i];
				let isLineOwned = true;
				for (let j = i; j < this.nCells; j += gridSide) {
					indexes.push(j);
					if (player !== grid[j]) isLineOwned = false;
				}
				if (isLineOwned && player) return { player, indexes };;
			}

			// check horizontal rows
			for (let i = 0; i < this.nCells; i += gridSide) {
				const indexes = [];
				const player = grid[i];
				let isLineOwned = true;
				for (let j = i; j < i + gridSide; j++) {
					indexes.push(j);
					if (player !== grid[j]) isLineOwned = false;
				}
				if (isLineOwned && player) return { player, indexes };
			}

			// check first diagonal
			{
				const i = 0;
				const indexes = [];
				const player = grid[i];
				let isLineOwned = true;
				for (let j = i; j < this.nCells; j += gridSide + 1) {
					indexes.push(j);
					if (player !== grid[j]) isLineOwned = false;
				}
				if (isLineOwned && player) return { player, indexes };
			}

			// check second diagonal
			{
				const i = gridSide - 1;
				const indexes = [];
				const player = grid[i];
				let isLineOwned = true;
				for (let j = i; j < this.nCells - 1; j += gridSide - 1) {
					indexes.push(j);
					if (player !== grid[j]) isLineOwned = false;
				}
				if (isLineOwned && player) return { player, indexes };
			}

			if (!grid.includes(null)) {
				return { player: '-', indexes: [] };
			}
			return { player: null, indexes: [] };
		},

		isCurrentGrid(i, considerRemote) {
			if (
				(
					(this.currentGridIndex === null && this.bigGrid[i] === null) ||
					(this.currentGridIndex !== null && i === this.currentGridIndex)
				) && !this.gameResult.player
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

	computed: {
		bigGrid() {
			return this.grids.map(grid => this.gridResultStatus(grid).player);
		},
		gameResult() {
			return this.gridResultStatus(this.bigGrid);
		}
	},

	created() {
		this.initializeGame();
		// this.initializeTestGame();
	}
}).mount('#app');
