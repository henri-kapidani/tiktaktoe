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

			options: {
				iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
			},
			pc: null,
			isOfferSide: null,
			description: null,
			channelData: null,
			isMicEnabled: false,
			localStream: null,
			remoteStream: null,
			eleAudio: null,

			bigGrid: null,
			grids: null,
			currentPlayer: null,
			playerIdentity: null,
			currentGridIndex: null,
			gameResult: null,

			modals: {
				start: true,
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
			this.theme = this.theme === 'light' ? 'dark' : 'light';
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

		async setupRemote() {
			this.mode = 'remote';

			this.pc = new RTCPeerConnection(this.options);

			this.remoteStream = new MediaStream();
			this.eleAudio = new Audio();
			this.eleAudio.autoplay = true;
			this.eleAudio.srcObject = this.remoteStream;

			this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
			this.localStream.getTracks().forEach(track => {
				track.enabled = this.isMicEnabled;
				this.pc.addTrack(track, this.localStream);
			});

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
			// await navigator.clipboard.writeText(this.description);
			if (navigator.share) {
				const shareData = {
					title: "TikTakToe",
					text: this.description,
				};
				await navigator.share(shareData);
			} else {
				await navigator.clipboard.writeText(this.description);
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
			if (isOfferSide) {
				this.resetGrid();
				channelData.send(JSON.stringify({
					type: 'configuration',
					playerIdentity: this.playerIdentity === 'x' ? 'o' : 'x',
					currentPlayer: this.currentPlayer,
				}));
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
