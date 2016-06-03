var express = require('express');
var app = express();
app.use(express.static(__dirname+"/"))
var http = require('http').Server(app);
var io = require('socket.io')(http);
var validGames = ["Connect Four", "Uno"];
var validPlayers = {};
validPlayers["Connect Four"] = ["2"];
validPlayers["Uno"] = ["2", "3", "4", "5", "6"];
var clients = Object();
clients.sockets = {};
clients.colors = {};
clients.gameRooms = {};
clients.online = 0;
clients.addClient = function(socket, name){
	clients.sockets[name] = socket;
	clients.colors[name] = '#FFFFFF';
	clients.gameRooms[name] = [];
	socket.emit('login status', 1);
	console.log('User '+name+' logged in');
	clients.online++;
	clients.broadcastOnlineUsers();
}
clients.removeClient = function(socket){
	var name = clients.getNameFromSocket(socket);
	if(name!=-false){
		console.log('User '+name+' disconnected');
		io.emit('userDisconnect', name);
		//handle client's game rooms here
		for(var j=0;j<clients.gameRooms[name].length;j++){
			clients.leaveRoom(name, clients.gameRooms[name][j]);
		}

		delete clients.sockets[name];
		delete clients.colors[name];
		clients.online--;
		clients.broadcastOnlineUsers();
	}else{
		//error
	}
}
clients.name_available = function(name){
	return clients.sockets[name]==undefined;
}
clients.getNameFromSocket = function(socket){
	for(var k in clients.sockets){
		if(clients.sockets[k]==socket){
			return k;
		}
	}
	return false;
}
clients.getSocketFromName = function(name){
	return clients.sockets[name];
}
clients.setColor = function(name, color){
	if(!clients.name_available(name)){
		clients.colors[name] = color;
		clients.broadcastOnlineUsers();
	}else{
		return false
	}
}
clients.broadcastOnlineUsers = function(){
	var toEmit = [[],[]];
	for(var k in clients.colors){
		toEmit[0].push(k);
		toEmit[1].push(clients.colors[k]);
	}
	io.emit('onlineUsers',JSON.stringify(toEmit));
}

clients.requestJoin = function(name, roomid){
	if(!gamerooms[roomid]){
		console.log("Error: User "+name+" attempted to join room "+roomid+" (invalid ID)");
	}
	else if(gamerooms[roomid].playerJoin(clients.getSocketFromName(name))){
		clients.gameRooms[name].push(roomid);
	}
}
clients.leaveRoom = function(name, roomid){
	var j = clients.gameRooms[name].indexOf(roomid);
	if(j!=-1){
		clients.gameRooms[name].splice(j, 1);
		gamerooms[roomid].playerLeave(clients.getSocketFromName(name), roomid);
	}
}
//consider using clients.sockets instead of io.emit

var gamerooms = {};
gamerooms.idlist = [];
gamerooms.createRoom = function(id, name, pw, type, numplayers, playersocket){
	var newroom = Object();
	newroom.id = id;
	newroom.name = name;
	newroom.pw = pw;
	newroom.game = type;
	//number of MAX players; to get active, do room.players.length
	newroom.numPlayers = numplayers
	newroom.players = [];
	newroom.playersockets = [];
	for(var z=0;z<newroom.numPlayers;z++){
		newroom.players.push(null);
		newroom.playersockets.push(null);
	}
	gamerooms.idlist.push(id);
	newroom.gameState = Object();
	newroom.gameState.status = "Creating Room";
	console.log("Room "+id+" was created. Name: "+name+"; Players: "+numplayers+"; Gametype: "+type+"; Password:" +pw);
	newroom.emitToPlayers = function(msg, val){
		for(var i=0;i<newroom.playersockets.length;i++){
			if(newroom.playersockets[i]){
				newroom.playersockets[i].emit(msg, val);
			}
		}
	}
	
	//Manipulate gamestate.
	switch(type){
		//Includes: startGame(), nextPlayer(curr), nextTurn(), isEmpty(), makeMove(userSocket, move), checkVictory(board), reset(), playerJoin(userSocket)
		case "Connect Four":
			var c4room = newroom;
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
				c4room.emitToPlayers('gameMessage', 'gameStart');
				var u = c4room.playersockets[c4room.gameState.turn];
				if(u!=null){
					u.emit('gameMessage', 'yourTurn');
				}
				u = c4room.playersockets[c4room.nextPlayer(c4room.gameState.turn)];
				if(u!=null){
					u.emit('gameMessage', 'opponentTurn');
				}
			}
			c4room.nextTurn = function(){
				c4room.gameState.turn = c4room.nextPlayer(c4room.gameState.turn);
				var u = c4room.playersockets[c4room.gameState.turn];
				if(u!=null){
					u.emit('gameMessage', 'yourTurn');
				}
				u = c4room.playersockets[c4room.nextPlayer(c4room.gameState.turn)];
				if(u!=null){
					u.emit('gameMessage', 'opponentTurn');
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
						c4room.emitToPlayers('makeMove',JSON.stringify(move));
						var userwon = c4room.checkVictory(c4room.gameState.boardState);
						if(userwon){
							c4room.gameState.status = "Done";
							var toEmit = Object();
							toEmit.details = userwon;
							toEmit.user = c4room.players[c4room.gameState.turn];
							toEmit.id = c4room.id;
							c4room.emitToPlayers('victory', JSON.stringify(toEmit));
							console.log("Room "+c4room.id+": User "+clients.getNameFromSocket(userSocket)+" won after "+c4room.num_moves+" moves.");
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
				c4room.emitToPlayers('gameReset', JSON.stringify(c4room.gameState));
				if(start){
					setTimeout(function(){
						c4room.emitToPlayers('gameMessage', 'gameStart');
						var u = c4room.playersockets[c4room.gameState.turn];
						if(u!=null){
							u.emit('gameMessage', 'yourTurn');
						}
						u = c4room.playersockets[c4room.nextPlayer(c4room.gameState.turn)];
						if(u!=null){
							u.emit('gameMessage', 'opponentTurn');
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
					room.emitToPlayers('playerJoin', JSON.stringify([room.id, n]));
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
				
				c4room.emitToPlayers('gameMessage', 'gameStop');
				c4room.players[i] = null;
				c4room.playersockets[i] = null;
				console.log("Room "+c4room.id+": User "+clients.getNameFromSocket(userSocket)+" left the room");
				userSocket.emit('leaveStatus', 1);
				if(c4room.isEmpty()){
					gamerooms.deleteRoom(c4room.id);
				}else{
					c4room.emitToPlayers('playerLeave', JSON.stringify([c4room.id, n]));
				}
				gamerooms.broadcastAllRooms();
			}

		break;
		case("Uno"):
			var unoroom = newroom;
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
				unoroom.emitToPlayers('playerJoin', JSON.stringify([unoroom.id, n, unoroom.players.indexOf(n)]));

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
					unoroom.emitToPlayers('playerLeave', JSON.stringify([unoroom.id, n, i]));
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
					unoroom.playersockets[j].emit('gameMessage', JSON.stringify(toEmit));
				}
			}
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
		break;
	}
	
	//handle pw protected rooms later
	gamerooms[newroom.id] = newroom;
	clients.requestJoin(clients.getNameFromSocket(playersocket), id);

}

gamerooms.deleteRoom = function(id){
	console.log("Room "+id+": Room was deleted");
	delete gamerooms[id];
	gamerooms.idlist.splice(gamerooms.idlist.indexOf(id), 1);
	io.emit('gameRoomDeleted', id);
}

gamerooms.getAllRooms = function(){
	var allrooms = [];
	for(var i=0;i<gamerooms.idlist.length;i++){
		var curr = gamerooms[gamerooms.idlist[i]];
		var toEmit = Object();
		toEmit.id = curr.id;
		toEmit.players = curr.players;
		toEmit.game = curr.game;
		toEmit.name = curr.name;
		toEmit.status = curr.gameState.status;
		allrooms.push(toEmit);
	}
	return allrooms;
}

gamerooms.generatedId = function(){
	var len = 6;
	var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for(var i=0;i<len;i++){
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    if(gamerooms.idlist.indexOf(text)==-1){
    	return text;
    }
    return gamerooms.generatedId();
}

gamerooms.broadcastAllRooms = function(){
	io.emit('allRooms',JSON.stringify(gamerooms.getAllRooms()));
}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


function validStr(str){
	//TODO: Implement me
	return true;
}

io.on('connection', function(socket){
	socket.on('pickname', function(name){
		if(clients.name_available(name)){
			clients.addClient(socket, name);
		}else{
			socket.emit('login status', 0);
		}
	});

	socket.on('disconnect', function(){
		clients.removeClient(socket);
  	});

	//TODO: linkify things, move this to clients object?
  	socket.on('message2s', function(msg){
  		var received = JSON.parse(msg);
  		var usermsg = new Object();
  		usermsg.user = clients.getNameFromSocket(socket);
  		usermsg.content = received.message;
  		usermsg.color = received.color;
  		if(received.chatroom=="main"){
	  		console.log("Got message from "+usermsg.user+": "+msg);
	  		io.emit('message2c', JSON.stringify(usermsg));
  		}else{
  			//handle pm here
  		}
  	});

  	//set the user's color
  	socket.on('choosecolor', function(col){
  		clients.setColor(clients.getNameFromSocket(socket), col);
  	});

  	socket.on('joinchatroom', function(room){
  		if(room=="main"){
  			io.emit('userJoinMainChat', clients.getNameFromSocket(socket));
  		}
  	});

  	//making a game room
  	socket.on('makeRoom', function(room){
  		var r = JSON.parse(room);
  		//server side validation
  		var errors = 0;
  		if(r.name.length==0){
  			errors++;
  			//console.log("Error making room: name was empty.");  
  		}
  		if(r.name.length>20){
  			errors++;
  			//console.log("Error making room: name was too long: "+ r.name);
  		}
  		if(r.pw.length>20){
  			errors++;
  			//console.log("Error making room: password was too long: "+r.pw);
  		}
  		if(!validStr(r.name) || !validStr(r.pw)){
  			errors++;
  			//console.log("Error making room: name/pw was invalid.");
  		}
  		if(validGames.indexOf(r.gameType)==-1){
  			errors++;
  			//console.log("Error making room: Invalid game type: "+r.gameType);
  		}else{
  			if(validPlayers[r.gameType].indexOf(r.numPlayers)==-1){
  				errors++;
  				//console.log("Error making room: number of players was invalid: "+r.numPlayers);
  			}
  		}

  		if(errors==0){
  			//make room
  			//console.log("Creating room");
  			socket.emit('makeRoomResponse', 1);
  			gamerooms.createRoom(gamerooms.generatedId(), r.name, r.pw, r.gameType, r.numPlayers, socket);
  		}else{
  			//console.log("There were "+errors+" errors.");
  			socket.emit('makeRoomResponse', 0);
  		}
  	});
	
	//sending all the current room info
	socket.on('getGameRooms', function(msg){
		socket.emit('allRooms',JSON.stringify(gamerooms.getAllRooms()));
	});

	//client requests to join room id
	socket.on('joinRoom', function(roomid){
		clients.requestJoin(clients.getNameFromSocket(socket), roomid);
	});

	socket.on('leaveRoom', function(roomid){
		clients.leaveRoom(clients.getNameFromSocket(socket), roomid);
	});

	socket.on('requestRoomInfo', function(roomid){
		var room = gamerooms[roomid];
		if(room){
			var toEmit = Object();
			toEmit.name = room.name;
			toEmit.pw = room.pw;
			toEmit.id = room.id;
			toEmit.game = room.game;
			toEmit.players = room.numPlayers;
			toEmit.status = room.gameState.status;
			socket.emit('roomInfo',JSON.stringify(toEmit));
		}else{
			socket.emit('roomInfo', null);
		}
	});

	//Must send an id
	socket.on('makeMove', function(move){
		var received = JSON.parse(move);
		if(gamerooms[received.id]){
			gamerooms[received.id].makeMove(socket, received);
		}
	});

	socket.on('requestPlayerNum', function(roomid){
		if(gamerooms[roomid]){
			socket.emit('playerNum', gamerooms[roomid].playersockets.indexOf(socket));
		}
	});

	socket.on('requestReset', function(roomid){
		if(gamerooms[roomid]){
			gamerooms[roomid].reset();
		}
	});
});

//TODO:
//Chatroom: timestamps, different chat rooms by #
//Implement games
//refactor ids 
//Implement mouse tracking in game
//Implement database
//Make mobile version

http.listen(8080, function(){
  console.log('Listening on port 8080');
});