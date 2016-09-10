"use strict";

function initRoom(c4room, clients, gamerooms){
	c4room.gameState.player1 = null;
	c4room.gameState.player2 = null;
	c4room.gameState.turn = 0;
	c4room.gameState.boardState = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
	c4room.gameState.status = "Waiting for Players";
	c4room.gameState.num_moves = 0;
	c4room.nextPlayer = function(curr){
		return (curr+1)%c4room.numPlayers;
	}
	c4room.startGame = function(){
		console.log("Room "+c4room.id+": Game was started");
		var toEmit = Object();
		toEmit.message = 'gameStart';
		c4room.emitToPlayers('gameMessage', JSON.stringify(toEmit));
		var u = c4room.playersockets[c4room.gameState.turn];
		if(u!=null){
			var toEmit2 = Object();
			toEmit2.message = 'yourTurn';
			u.emit('gameMessage', JSON.stringify(toEmit2));
		}
		u = c4room.playersockets[c4room.nextPlayer(c4room.gameState.turn)];
		if(u!=null){
			var toEmit3 = Object();
			toEmit3.message = 'opponentTurn'
			u.emit('gameMessage', JSON.stringify(toEmit3));
		}
	}
	c4room.nextTurn = function(){
		c4room.gameState.turn = c4room.nextPlayer(c4room.gameState.turn);
		var u = c4room.playersockets[c4room.gameState.turn];
		if(u!=null){
			var toEmit = Object();
			toEmit.message = 'yourTurn';
			u.emit('gameMessage', JSON.stringify(toEmit));
		}
		u = c4room.playersockets[c4room.nextPlayer(c4room.gameState.turn)];
		if(u!=null){
			var toEmit2 = Object();
			toEmit2.message = 'opponentTurn';
			u.emit('gameMessage', JSON.stringify(toEmit2));
		}
	}
	c4room.isEmpty = function(){
		for(var i=0;i<c4room.playersockets.length;i++){
			if(c4room.playersockets[i]!=null){
				return false;
			}
		}
		return true;
	}
	c4room.makeMove = function(userSocket, move){
		if(c4room.playersockets[c4room.gameState.turn]!=userSocket){
			//prob not log... itll fill up fast
			return false;	
		}
		if(move.id!=c4room.id){
			return false;
		}
		if(c4room.gameState.status!="Playing"){
			return false;
		}

		for(var row=5;row>=0;row--){
			if(c4room.gameState.boardState[row][move.col]==0){
				//piece goes here
				c4room.gameState.boardState[row][move.col] = c4room.gameState.turn+1;
				move.user = c4room.gameState.turn;
				move.row = row;
				c4room.gameState.num_moves++;
				var toEmit = Object();
				toEmit.message = 'makeMove';
				toEmit.move = move;
				c4room.emitToPlayers('gameMessage',JSON.stringify(toEmit));
				var userwon = c4room.checkVictory(c4room.gameState.boardState);
				if(userwon){
					c4room.gameState.status = "Done";
					var toEmit = Object();
					toEmit.message = 'victory';
					toEmit.details = userwon;
					toEmit.user = c4room.players[c4room.gameState.turn];
					toEmit.id = c4room.id;
					c4room.emitToPlayers('gameMessage', JSON.stringify(toEmit));
					console.log("Room "+c4room.id+": User "+clients.getNameFromSocket(userSocket)+" won after "+c4room.gameState.num_moves+" moves.");
					gamerooms.broadcastAllRooms();
				}else{
					c4room.nextTurn();
				}
				return true;
			}
		}
		//not a valid move
		return false;
	}
	c4room.checkVictory = function(board){
		var connect = 4;
		var h = board.length;
		var w = board[0].length;
		function check_spot(i, j, c){
			if(check_h(i, j, c)){return 'h';}
			if(check_v(i, j, c)){return 'v';} 
			return check_d(i, j, c);
		}
		function check_h(i, j, c){
			if(j+c>w){return false;}
			var at_position = board[i][j];
			for(var k=j+1;k<j+c;k++){
				if(board[i][k]!=at_position){
					return false;
				}
			}
			return true;
		}

		function check_v(i, j, c){
			if(i+c>h){
				return false;
			}
			var at_position = board[i][j];
			for(var k=i+1;k<i+c;k++){
				if(board[k][j]!=at_position){
					return false;
				}
			}
			return true;
		}

		function check_d(i, j, c){
			if(check_d_r(i, j, c)){
				return 'r';
			}
			if(check_d_l(i, j, c)){
				return 'l';
			}
			return false;
		}

		function check_d_r(i, j, c){
			if(i+c>h || j+c>w){
				return false;
			}
			var at_position = board[i][j];
			var m = i;
			for(var k=j+1;k<j+c;k++){
				m++;
				if(board[m][k]!=at_position){
					return false;
				}
			}
			return true;
		}

		function check_d_l(i, j, c){
			if(i+c>h || j-c<-1){
				return false;
			}
			var at_position = board[i][j];
			var m = i;
			for(var k=j-1;k>j-c;k--){
				m++;
				if(board[m][k]!=at_position){
					return false;
				}
			}
			return true;
		}

		if(w<1){
			return false;
		}

		if(connect > w || connect > h){
			return false;
		}
		for(var i=0;i<h;i++){
			for(var j=0;j<w;j++){
				if(board[i][j]!=0){
					var won = check_spot(i, j, connect);
					if(won){
						return [i, j, won];
					}
				}
			}
		}
		return false;
	}
	c4room.reset = function(){
		if(c4room.gameState.status!="Done"){
			return false;
		}
		console.log("Room "+c4room.id+": Game was reset");
		var temp = c4room.gameState.player1;
		//switch around players
		c4room.gameState.player1 = c4room.gameState.player2;
		c4room.gameState.player2 = temp;

		temp = c4room.players[0];
		c4room.players[0] = c4room.players[1];
		c4room.players[1] = temp;

		temp = c4room.playersockets[0];
		c4room.playersockets[0] = c4room.playersockets[1];
		c4room.playersockets[1] = temp;

		var start = false;
		if(c4room.gameState.player1 && c4room.gameState.player2){
			c4room.gameState.status = "Playing";
			start = true;
		}else{
			c4room.gameState.status = "Waiting for Players";
		}
		c4room.gameState.turn = 0;
		c4room.gameState.num_moves = 0;
		c4room.gameState.boardState = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
		var toEmit = Object();
		toEmit.message = 'gameReset';
		toEmit.gameState = c4room.gameState;
		c4room.emitToPlayers('gameMessage', JSON.stringify(toEmit));
		if(start){
			setTimeout(function(){
				var toEmit = Object();
				toEmit.message = 'gameStart';
				c4room.emitToPlayers('gameMessage', JSON.stringify(toEmit));
				var u = c4room.playersockets[c4room.gameState.turn];
				if(u!=null){
					var toEmit = Object();
					toEmit.message = 'yourTurn';
					u.emit('gameMessage', JSON.stringify(toEmit));
				}
				u = c4room.playersockets[c4room.nextPlayer(c4room.gameState.turn)];
				if(u!=null){
					var toEmit2 = Object();
					toEmit2.message = 'opponentTurn';
					u.emit('gameMessage', JSON.stringify(toEmit2));
				}
			}, 1000);
		}
	}
	c4room.playerJoin = function(userSocket){
		var room = c4room;
		
		if(room.playersockets.indexOf(userSocket)==-1){
			for(var l=0;l<room.playersockets.length;l++){
				if(!room.playersockets[l]){
					room.playersockets[l] = userSocket;
					room.players[l] = clients.getNameFromSocket(userSocket);
					break;
				}
			}

			if(room.gameState.player1==null){
				room.gameState.player1 = clients.getNameFromSocket(userSocket);
			}else if(room.gameState.player2==null){
				room.gameState.player2 = clients.getNameFromSocket(userSocket);
			}else{
				console.log("Error: User "+clients.getNameFromSocket(userSocket)+" tried to join room "+room.id+" (game was full)");
				return false;
			}
			if(room.gameState.player1!=null && room.gameState.player2!=null){
				if(room.gameState.status!="Done"){
					room.gameState.status = "Playing";
				}
			}

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
			room.emitToPlayers('gameMessage', JSON.stringify(toEmit));
			if(room.gameState.status=="Playing"){
				room.startGame();
			}
			return true;
		}else{
			userSocket.emit('joinRoomFailure', 'Full');
			return false;
		}
	}
	c4room.playerLeave = function(userSocket){
		//remove user from room roomid
		var i = c4room.playersockets.indexOf(userSocket);
		var n = clients.getNameFromSocket(userSocket);

		if(c4room.gameState.player1==n){
			c4room.gameState.player1 = null;
		}else if(c4room.gameState.player2==n){
			c4room.gameState.player2 = null;
		}
		if(c4room.gameState.status!="Done"){
			c4room.gameState.status = "Waiting for Players";
		}
		var toEmit = Object();
		toEmit.message = 'gameStop';
		c4room.emitToPlayers('gameMessage', JSON.stringify(toEmit));
		c4room.players[i] = null;
		c4room.playersockets[i] = null;
		console.log("Room "+c4room.id+": User "+clients.getNameFromSocket(userSocket)+" left the room");
		userSocket.emit('leaveStatus', 1);
		if(c4room.isEmpty()){
			gamerooms.deleteRoom(c4room.id);
		}else{
			var toEmit = Object();
			toEmit.message = 'playerLeave';
			toEmit.id = c4room.id;
			toEmit.playerName = n;
			c4room.emitToPlayers('gameMessage', JSON.stringify(toEmit));
		}
		gamerooms.broadcastAllRooms();
	}
}

module.exports = initRoom;