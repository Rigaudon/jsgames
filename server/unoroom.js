"use strict";

function initRoom(unoroom, clients, gamerooms){
	unoroom.reshuffling = false;
	unoroom.gameState.activePlayers = 0;
	unoroom.gameState.status = "Waiting for Players";
	unoroom.resetDeck = function(){
		unoroom.gameState.deck = [];
		var cardtypes = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "Skip", "Reverse", "Draw 2"];
		for(var c=0;c<4;c++){
			var color;
			switch(c){
				case 0:
					color = "Red";
					break;
				case 1:
					color = "Blue";
					break;
				case 2:
					color = "Green";
					break;
				case 3:
					color = "Yellow";
					break;
			}
			for(var i=0;i<=12;i++){
				var card = Object();
				card.color = color;
				card.value = cardtypes[i];
				unoroom.gameState.deck.push(card);
				if(i!=0){
					var card2 = Object();
					card2.color = color;
					card2.value = cardtypes[i];
					unoroom.gameState.deck.push(card2);
				}
			}
			var wildcard = Object();
			wildcard.color = "Wild";
			wildcard.value = "None";
			unoroom.gameState.deck.push(wildcard);
			var wild4 = Object();
			wild4.color = "Wild";
			wild4.value = "Draw 4";
			unoroom.gameState.deck.push(wild4);
		}
	}

	unoroom.isEmpty = function(){
		for(var l=0;l<unoroom.playersockets.length;l++){
			if(unoroom.playersockets[l]){
				return false;
			}
		}
		return true;
	}

	unoroom.playerJoin = function(userSocket){
		if(unoroom.playersockets.indexOf(userSocket)!=-1){
			userSocket.emit('joinRoomFailure', 'Full');
			return false;
		}
		if(unoroom.gameState.status!="Waiting for Players"){
			userSocket.emit('joinRoomFailure', 'Not accepting players');
			return false;
		}
		for(var l=0;l<unoroom.playersockets.length;l++){
			if(!unoroom.playersockets[l]){
				unoroom.playersockets[l] = userSocket;
				unoroom.players[l] = clients.getNameFromSocket(userSocket);
				break;
			}
		}

		var startgame = true;
		for(var l=0;l<unoroom.playersockets.length;l++){
			if(!unoroom.playersockets[l]){
				startgame = false;
			}
		}
		
		var toEmit = {};
		toEmit["id"] = unoroom.id;
		toEmit["name"] = unoroom.name;
		toEmit["players"] = unoroom.players;
		toEmit["game"] = unoroom.game;
		toEmit["gameState"] = unoroom.gameState;

		userSocket.emit('joinRoomSuccess', JSON.stringify(toEmit));
		console.log("Room "+unoroom.id+": User "+clients.getNameFromSocket(userSocket)+" joined the room");
		//update game room list
		gamerooms.broadcastAllRooms();
		//broadcast join to all users
		var n = clients.getNameFromSocket(userSocket);
		var toEmit = Object();
		toEmit.message = 'playerJoin';
		toEmit.id = unoroom.id;
		toEmit.playerName = n;
		toEmit.player = unoroom.players.indexOf(n);
		unoroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));

		if(startgame){
			unoroom.gameState.status = "Preparing to start";
			gamerooms.broadcastAllRooms();
			setTimeout(function(){
				unoroom.startNewGame();
			}, 1000);
		}
		return true;
	}
	unoroom.playerLeave = function(userSocket){
		//remove user from room roomid
		var i = unoroom.playersockets.indexOf(userSocket);
		var n = clients.getNameFromSocket(userSocket);
		
		unoroom.players[i] = null;
		unoroom.playersockets[i] = null;
		console.log("Room "+unoroom.id+": User "+clients.getNameFromSocket(userSocket)+" left the room");
		userSocket.emit('leaveStatus', 1);
		if(unoroom.isEmpty()){
			gamerooms.deleteRoom(unoroom.id);
		}else{
			var toEmit = Object();
			toEmit.message = 'playerLeave';
			toEmit.id = unoroom.id;
			toEmit.playerName = n;
			toEmit.player = i;
			unoroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
			//if only one player left, player wins.
			if(unoroom.gameState.status=="Playing"){
				//dump cards to discard
				while(unoroom.gameState.playerhands[i].length>0){
					var c = unoroom.gameState.playerhands[i][0];
					unoroom.gameState.deck.push(c);
					unoroom.gameState.playerhands[i].splice(0,1);
				}
				unoroom.gameState.activePlayers--;
				if(unoroom.gameState.activePlayers==1){
					unoroom.gameState.status = "Done";
					var toEmit = Object();
					toEmit.message = 'victory';
					for(var i=0;i<unoroom.playersockets.length;i++){
						if(unoroom.playersockets[i]){
							toEmit.player = i;
						}
					}
					toEmit.playerName = clients.getNameFromSocket(unoroom.playersockets[toEmit.player]);
					unoroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
					gamerooms.broadcastAllRooms();
				}
			}
		}
		
		gamerooms.broadcastAllRooms();
	}
	unoroom.startNewGame = function(){
		unoroom.resetDeck();
		unoroom.gameState.discard = [];
		unoroom.gameState.activeCard = null;
		unoroom.gameState.activePlayers = unoroom.numPlayers;
		unoroom.gameState.unoSafe = [];
		for(var i=0;i<unoroom.gameState.activePlayers;i++){
			unoroom.gameState.unoSafe.push(true);
		}
		unoroom.gameState.status = "Dealing";
		var toEmit = {};
		toEmit['message'] = 'gameStart';
		unoroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
		unoroom.gameState.playerhands = [];
		unoroom.gameState.turn = 0;
		unoroom.gameState.direction = 1;
		var delay = 500;
		for(var l=0;l<unoroom.playersockets.length;l++){
			unoroom.gameState.playerhands[l] = [];
			unoroom.dealRandomCardsToPlayer(7, l, delay);
		}
		unoroom.gameState.status = "Playing";
		//find starting card
		setTimeout(function(){
			var i = Math.floor(Math.random()*unoroom.gameState.deck.length);
			var card = unoroom.gameState.deck[i];
			var nums = ["0","1","2","3","4","5","6","7","8","9"];
			//for convenience, starting card has to be number
			while(nums.indexOf(card.value)==-1){
				i = Math.floor(Math.random()*unoroom.gameState.deck.length);
				card = unoroom.gameState.deck[i];
			}
			unoroom.gameState.activeCard = card;
			unoroom.gameState.deck.splice(i, 1);
			unoroom.gameState.discard.push(card);
			var toEmit = Object();
			toEmit.message = 'firstCard';
			toEmit.card = card;
			unoroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
			unoroom.emitTurns();
			gamerooms.broadcastAllRooms();
		}, delay*8);
	}

	unoroom.emitTurns = function(){
		for(var j=0;j<unoroom.playersockets.length;j++){
			var toEmit = Object();
			if(j==unoroom.gameState.turn){
				toEmit.message = 'yourTurn';
			}else{
				toEmit.message = 'opponentTurn';
				toEmit.player = unoroom.gameState.turn;
			}
			if(unoroom.playersockets[j]){
				unoroom.playersockets[j].emit('gameMessage', JSON.stringify(toEmit));
			}
		}
	}

	//Bug: sometimes deals wild ie, "reddraw4"
	unoroom.dealRandomCardsToPlayer = function(numCards, playerNum, delay){
		if(unoroom.reshuffling){
			setTimeout(function(){ unoroom.dealRandomCardsToPlayer(numCards, playerNum, delay); },500);
		}
		if(numCards>0){
			if(unoroom.gameState.deck.length<3){
				//1 because we skip the active (top) card
				unoroom.reshuffling = true;
				while(unoroom.gameState.discard.length>1){
					var c = unoroom.gameState.discard[0];
					unoroom.gameState.discard.splice(0,1);

					unoroom.gameState.deck.push(c);
				}
				unoroom.reshuffling = false;
			}
			if(!unoroom.playersockets[playerNum]){
				return false;
			}
			if(unoroom.gameState.deck.length==0){
				return false;
			}
			var i = Math.floor(Math.random()*unoroom.gameState.deck.length);
			var card = unoroom.gameState.deck[i];
			unoroom.gameState.playerhands[playerNum].push(card);
			unoroom.gameState.deck.splice(i, 1);
			if(unoroom.gameState.playerhands[playerNum].length>1){
				unoroom.gameState.unoSafe[playerNum] = true;
			}
			for(var k=0;k<unoroom.playersockets.length;k++){
				if(k==playerNum){
					//emit the card
					var toEmit = Object();
					toEmit.message = 'idraw';
					toEmit.color = card.color;
					toEmit.value = card.value;
					unoroom.playersockets[k].emit('gameMessage', JSON.stringify(toEmit));
				}else{
					//emit that the player drew a card
					var toEmit = Object();
					toEmit.message = 'playerdraw';
					toEmit.player = playerNum;
					unoroom.playersockets[k].emit('gameMessage', JSON.stringify(toEmit));
				}
			}
			setTimeout(function(){
				unoroom.dealRandomCardsToPlayer(numCards-1, playerNum, delay);
			}, delay);
			return card;
		}
	}
	unoroom.makeMove = function(userSocket, received){
		var i = unoroom.playersockets.indexOf(userSocket);
		if(received.id!=unoroom.id){
			//wrong room
			return false;
		}
		if(unoroom.gameState.status!="Playing"){
			//can't make a move if not playing
			return false;
		}
		if(i==-1){
			//user is not in this room
			return false;
		}
		if(received.callUno){
			unoroom.callUno(i);
			return true;
		}
		if(i!=unoroom.gameState.turn){
			//not the user's turn
			return false;
		}
		
		if(received.requestDraw){
			var dealt = unoroom.dealRandomCardsToPlayer(1, i, 0);
			if(!unoroom.isPlayable(dealt)){
				unoroom.nextPlayer();
				unoroom.emitTurns();
			}
			return true;
		}
		if(!unoroom.playerHasCard(i, received.card)){
			return false;
		}
		if(!unoroom.isPlayable(received.card)){
			return false;
		}
		
		//console.log("Valid");
		unoroom.removeCardFromPlayer(i, received.card);
		unoroom.gameState.discard.push(received.card);
		unoroom.gameState.nextAny = false;

		if(received.card.color=="Wild"){
			var newcolor = received.card.selectedColor;
			if(!received.card.selectedColor){
				newcolor = "Red";
			}
			unoroom.gameState.activeCard.color = newcolor;
			unoroom.gameState.activeCard.value = received.card.value;
		}else{
			unoroom.gameState.activeCard.color = received.card.color;
			unoroom.gameState.activeCard.value = received.card.value;
		}
		//console.log("Emitting");

		var toEmit = Object();
		toEmit.message = 'makeMove';
		toEmit.player = i;
		toEmit.card = received.card;
		unoroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));

		var victory = unoroom.checkVictory();
		if(victory[0]){
			var toEmit = Object();
			toEmit.message = 'victory';
			toEmit.player = victory[1];
			toEmit.playerName = clients.getNameFromSocket(unoroom.playersockets[toEmit.player]);
			unoroom.gameState.status = "Done";
			unoroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
			gamerooms.broadcastAllRooms();
		}else{
			switch(received.card.value){
				case "Draw 4":
					unoroom.nextPlayer();
					unoroom.dealRandomCardsToPlayer(4, unoroom.gameState.turn, 500);
				break;
				case "Draw 2":
					unoroom.nextPlayer();
					unoroom.dealRandomCardsToPlayer(2, unoroom.gameState.turn, 500);
				break;
				case "Reverse":
					if(unoroom.gameState.direction==1){
						unoroom.gameState.direction = -1;
					}else{
						unoroom.gameState.direction = 1;
					}
					if(unoroom.gameState.activePlayers==2){
						unoroom.nextPlayer();
					}
				break;
				case "Skip":
					unoroom.nextPlayer();
					if(unoroom.gameState.activePlayers==2){
						unoroom.gameState.nextAny = true;
					}
				break;
			}

			unoroom.nextPlayer();
			unoroom.emitTurns();
		}
	}
	unoroom.checkVictory = function(){
		for(var i=0;i<unoroom.playersockets.length;i++){
			if(unoroom.playersockets[i]!=null && unoroom.gameState.playerhands[i].length==0){
				return [true, i];
			}
		}
		return [false, false];
	}
	unoroom.nextPlayer = function(){
		if(unoroom.gameState.direction==1){
			unoroom.gameState.turn = (unoroom.gameState.turn + 1) % unoroom.numPlayers;
		}else{
			unoroom.gameState.turn-=1;
			if(unoroom.gameState.turn==-1){
				unoroom.gameState.turn = unoroom.numPlayers-1;
			}
		}
		if(!unoroom.playersockets[unoroom.gameState.turn]){
			unoroom.nextPlayer();
		}
	}
	unoroom.callUno = function(playerNum){
		var toEmit = Object();
		toEmit.message = 'callUno';
		toEmit.player = playerNum;
		unoroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
		var punish = true;
		for(var i=0;i<unoroom.gameState.unoSafe.length;i++){
			if(!unoroom.gameState.unoSafe[i]){
				if(i==playerNum){
					unoroom.gameState.unoSafe[i] = true;
				}else{
					unoroom.dealRandomCardsToPlayer(2, i, 500);
					unoroom.gameState.unoSafe[i] = true;
				}
				punish = false;
			}
		}
		if(punish){
			unoroom.dealRandomCardsToPlayer(2, playerNum, 500);
		}
	}
	unoroom.playerHasCard = function(player, card){
		var hand = unoroom.gameState.playerhands[player];
		for(var i=0;i<hand.length;i++){
			if(card.value==hand[i].value && card.color==hand[i].color){
				return true;
			}
		}
		return false;
	}
	unoroom.isPlayable = function(card){
		if(unoroom.gameState.nextAny){
			return true;
		}
		if(card.color=="Wild"){
			return true;
		}
		if(card.value==unoroom.gameState.activeCard.value || card.color==unoroom.gameState.activeCard.color){
			return true;
		}
		return false;
	}
	unoroom.removeCardFromPlayer = function(player, card){
		var hand = unoroom.gameState.playerhands[player];
		for(var i=0;i<hand.length;i++){
			if(card.value==hand[i].value && card.color==hand[i].color){
				unoroom.gameState.playerhands[player].splice(i, 1);
				break;
			}
		}
		if(hand.length==1){
			unoroom.gameState.unoSafe[player] = false;
		}
	}
}

module.exports = initRoom;