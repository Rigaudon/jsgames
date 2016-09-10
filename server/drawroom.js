"use strict";

var fs = require("fs");
function initRoom(drawroom, clients, gamerooms){
	drawroom.gameState.activePlayers = 0;
	drawroom.gameState.status = "Waiting for Players";
	drawroom.gameState.maxPlayers = drawroom.numPlayers;
	drawroom.gameState.guessed = [];
	drawroom.gameState.scores = [];
	drawroom.maxRounds = 2; //changeme
	drawroom.loadWords = function(list){
		if(!list){
			list = "default";
		}
		var words = fs.readFileSync("res/dmt/"+list+".txt", "utf8");
		drawroom.wordlist = words.split(/\r?\n/);
		console.log("Loaded "+drawroom.wordlist.length+" words from word list "+list+".");

	}
	drawroom.playerJoin = function(userSocket){
		var room = drawroom;
		
		if(room.playersockets.indexOf(userSocket)==-1){ //user is not in the room
			if(room.gameState.activePlayers==room.numPlayers){ //the room is full
				userSocket.emit('joinRoomFailure', 'Room is full');
				return false;
			}

			for(var l=0;l<room.playersockets.length;l++){
				if(!room.playersockets[l]){
					room.playersockets[l] = userSocket;
					room.players[l] = clients.getNameFromSocket(userSocket);
					break;
				}
			}
			room.gameState.activePlayers ++;
			drawroom.gameState.scores.push(0);
			var toEmit = {};
			toEmit["id"] = room.id;
			toEmit["name"] = room.name;
			toEmit["players"] = room.players;
			toEmit["game"] = room.game;
			toEmit["gameState"] = room.gameState;

			userSocket.emit('joinRoomSuccess', JSON.stringify(toEmit));
			console.log("Room "+room.id+": User "+clients.getNameFromSocket(userSocket)+" joined the room");
			//update game room list
			gamerooms.broadcastAllRooms();
			//broadcast join to all users
			var n = clients.getNameFromSocket(userSocket);
			var toEmit = Object();
			toEmit.message = 'playerJoin';
			toEmit.id = room.id;
			toEmit.player = n;
			toEmit.playernum = l;
			room.emitToPlayers('gameMessage', JSON.stringify(toEmit), userSocket);
			if(room.gameState.activePlayers == room.numPlayers){
				room.gameState.status = "Playing"
				room.startGame();
			}
			
			return true;
		}else{
			userSocket.emit('joinRoomFailure', 'Already in room');
			return false;
		}
	}

	drawroom.makeMove = function(userSocket, received){
		if(drawroom.gameState.status != "Playing"){
			return;
		}
		var playernum = drawroom.playersockets.indexOf(userSocket);
		if(playernum == -1){
			return false;
		}
		if(received.event == "guess"){
			//process guess
			if(drawroom.gameState.playerTurn == playernum){
				//Can't guess if you are drawing
				return false;
			}
			if(drawroom.gameState.guessed.indexOf(playernum)!= -1){
				//Can't guess if you already guessed correctly
				return false;
			}					
			var toEmit = Object();
			toEmit.id = drawroom.id;
			toEmit.message = 'makeGuess';
			toEmit.playernum = playernum;
			toEmit.playername = drawroom.players[playernum];
			toEmit.color = clients.colors[toEmit.playername];
			if(received.value.toUpperCase() == drawroom.gameState.word.toUpperCase()){
				//Guessed word successfully
				toEmit.guessed = true;
				//var secondsPassed = ((new Date).getTime() - drawroom.gameState.turnStartTime) / 1000;
				var pointgain;
				switch(drawroom.gameState.guessed.length){
					case 0:
					pointgain = 10;
					break;
					case 1:
					pointgain = 7;
					break;
					case 2:
					pointgain = 5;
					break;
					default:
					pointgain = 3;
					break;
				}
				drawroom.gameState.guessed.push(playernum);
				drawroom.gameState.scores[playernum] += pointgain;
				drawroom.gameState.scores[drawroom.gameState.playerTurn] += Math.round(10/(drawroom.gameState.activePlayers-1));
				drawroom.sendScores();
			}else{
				toEmit.value = received.value;
				toEmit.guessed = false;
			}
			drawroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
			if(drawroom.gameState.guessed.length == drawroom.gameState.activePlayers-1){
				//everyone guessed the word
				clearTimeout(drawroom.gameState.turnTimeout);
				drawroom.revealWord();
			}
		}else if(received.event == "draw"){
			if(drawroom.gameState.playerTurn != playernum){
				//Can't draw if it's not your turn
				return false;
			}
			var toEmit = Object();
			toEmit.id = drawroom.id;
			toEmit.message = 'drawEvent';

			switch(received.type){
			case "fill":
				toEmit.type = received.type;
				toEmit.x = received.x;
				toEmit.y = received.y;
				toEmit.color = received.color;
			break;
			case "undo":
				toEmit.type = "undo";
			break;
			case "clear":
				toEmit.type = "clear";
			break;
			case "partialline":
				toEmit.type = "partialline";
				toEmit.arrayX = received.arrayX;
				toEmit.arrayY = received.arrayY;
				toEmit.color = received.color;
				toEmit.brushSize = received.brushSize;
			break;
			}

			drawroom.emitToOtherPlayers('gameMessage', JSON.stringify(toEmit), userSocket);
		}
	}

	drawroom.revealTime = 5;
	drawroom.revealWord = function(){
		var toEmit = Object();
		toEmit.id = drawroom.id;
		toEmit.message = "revealWord";
		toEmit.word = drawroom.gameState.word;
		drawroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
		setTimeout(function(){
			drawroom.nextTurn();
		}, drawroom.revealTime * 1000);
	}

	drawroom.sendScores = function(){
		var toEmit = Object();
		toEmit.id = drawroom.id;
		toEmit.message = 'scoreUpdate';
		toEmit.scores = drawroom.gameState.scores;
		drawroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
	}

	drawroom.playerLeave = function(userSocket){
		//remove user from room roomid
		var i = drawroom.playersockets.indexOf(userSocket);
		var n = clients.getNameFromSocket(userSocket);
		if(i == -1){
			return false;
		}
		drawroom.players[i] = null;
		drawroom.playersockets[i] = null;
		drawroom.gameState.activePlayers--;
		console.log("Room "+drawroom.id+": User "+n+" left the room");
		userSocket.emit('leaveStatus', 1);
		if(drawroom.isEmpty()){
			drawroom.gameState.status = "Empty";
			gamerooms.deleteRoom(drawroom.id);
		}else{
			var toEmit = Object();
			toEmit.message = 'playerLeave';
			toEmit.id = drawroom.id;
			toEmit.playerName = n;
			toEmit.playerid = i;
			drawroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
		}
		gamerooms.broadcastAllRooms();
	}

	drawroom.isEmpty = function(){
		return drawroom.gameState.activePlayers == 0;
	}

	drawroom.startGame = function(){
		drawroom.gameState.status = "Playing";
		drawroom.loadWords("default");
		drawroom.gameState.roundsPassed = 0;
		console.log("Game room "+drawroom.id+" is starting.");
		drawroom.gameState.playerTurn = -1; // nextTurn will increment by 1
		var toEmit = {message: "gameStart", id: drawroom.id};
		drawroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
		gamerooms.broadcastAllRooms();
		drawroom.nextTurn();
	}

	drawroom.gameState.turnTime = 65;
	drawroom.gameState.turnTimeout = undefined;
	drawroom.gameState.turnStartTime = 0;
	drawroom.nextTurn = function(){
		if(drawroom.gameState.status != "Playing"){
			clearTimeout(drawroom.gameState.turnTimeout);
			return;
		}
		drawroom.gameState.guessed = [];
		if(!drawroom.nextPlayer()){
			//Game over
			var toEmit = Object();
			toEmit.id = drawroom.id;
			toEmit.message = 'victory';

			var maxScore = Math.max.apply(null, drawroom.gameState.scores);
			var winners = [];
			for(var j=0; j<drawroom.gameState.scores.length; j++){
				if(drawroom.gameState.scores[j] == maxScore){
					winners.push(drawroom.players[j]);
				}
			}
			toEmit.players = winners; 
			drawroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
			return;
		}
		var timeStart = (new Date).getTime();
		drawroom.gameState.turnStartTime = timeStart;
		var word = drawroom.wordlist[Math.floor(Math.random()*drawroom.wordlist.length)];
		drawroom.gameState.word = word;
		var toEmit = {message: 'yourTurn', id: drawroom.id, time: timeStart, word: word};
		toEmit.player = drawroom.gameState.playerTurn;
		toEmit.playerName = drawroom.players[toEmit.player];
		drawroom.playersockets[drawroom.gameState.playerTurn].emit('gameMessage', JSON.stringify(toEmit));
		
		toEmit.message = 'opponentTurn';
		toEmit.word = drawroom.makeBlanks(toEmit.word);
		drawroom.emitToOtherPlayers('gameMessage', JSON.stringify(toEmit), drawroom.playersockets[drawroom.gameState.playerTurn]);
		drawroom.gameState.turnTimeout = setTimeout(function(){
			drawroom.revealWord();
		}, drawroom.gameState.turnTime * 1000);
	}

	drawroom.makeBlanks = function(word){
		var l = word.replace(/ /g, "").length;
		word = word.replace(/ /g, "  ");
		return word.replace(/[^ ]/g, "__ ").slice(0, -1)+" ("+l+")";
	}

	drawroom.nextPlayer = function(){
		if(drawroom.isEmpty()){
			return false;
		}
		var curr = drawroom.gameState.playerTurn;
		if(curr+1 >= drawroom.players.length){
			drawroom.gameState.playerTurn = 0;
			drawroom.gameState.roundsPassed++;
			if(drawroom.gameState.roundsPassed >= drawroom.maxRounds){
				return false;
			}
		}else{
			drawroom.gameState.playerTurn++;
		}
		if(!drawroom.players[drawroom.gameState.playerTurn]){
			return drawroom.nextPlayer();
		}else{
			return true;
		}
	}
}

module.exports = initRoom;