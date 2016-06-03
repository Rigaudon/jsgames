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

			newroom.gameState.player1 = null;
			newroom.gameState.player2 = null;
			newroom.gameState.turn = 0;
			newroom.gameState.boardState = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
			newroom.gameState.status = "Waiting for Players";
			newroom.gameState.num_moves = 0;
			newroom.nextPlayer = function(curr){
				return (curr+1)%newroom.numPlayers;
			}
			newroom.startGame = function(){
				console.log("Room "+newroom.id+": Game was started");
				newroom.emitToPlayers('gameMessage', 'gameStart');
				var u = newroom.playersockets[newroom.gameState.turn];
				if(u!=null){
					u.emit('gameMessage', 'yourTurn');
				}
				u = newroom.playersockets[newroom.nextPlayer(newroom.gameState.turn)];
				if(u!=null){
					u.emit('gameMessage', 'opponentTurn');
				}
			}
			newroom.nextTurn = function(){
				newroom.gameState.turn = newroom.nextPlayer(newroom.gameState.turn);
				var u = newroom.playersockets[newroom.gameState.turn];
				if(u!=null){
					u.emit('gameMessage', 'yourTurn');
				}
				u = newroom.playersockets[newroom.nextPlayer(newroom.gameState.turn)];
				if(u!=null){
					u.emit('gameMessage', 'opponentTurn');
				}
			}
			newroom.isEmpty = function(){
				for(var i=0;i<newroom.playersockets.length;i++){
					if(newroom.playersockets[i]!=null){
						return false;
					}
				}
				return true;
			}
			newroom.makeMove = function(userSocket, move){
				if(newroom.playersockets[newroom.gameState.turn]!=userSocket){
					//prob not log... itll fill up fast
					return false;	
				}
				if(move.id!=newroom.id){
					return false;
				}
				if(newroom.gameState.status!="Playing"){
					return false;
				}

				for(var row=5;row>=0;row--){
					if(newroom.gameState.boardState[row][move.col]==0){
						//piece goes here
						newroom.gameState.boardState[row][move.col] = newroom.gameState.turn+1;
						move.user = newroom.gameState.turn;
						move.row = row;
						newroom.gameState.num_moves++;
						newroom.emitToPlayers('makeMove',JSON.stringify(move));
						var userwon = newroom.checkVictory(newroom.gameState.boardState);
						if(userwon){
							newroom.gameState.status = "Done";
							var toEmit = Object();
							toEmit.details = userwon;
							toEmit.user = newroom.players[newroom.gameState.turn];
							toEmit.id = newroom.id;
							newroom.emitToPlayers('victory', JSON.stringify(toEmit));
							console.log("Room "+newroom.id+": User "+clients.getNameFromSocket(userSocket)+" won after "+newroom.num_moves+" moves.");
						}else{
							newroom.nextTurn();
						}
						return true;
					}
				}
				//not a valid move
				return false;
			}
			newroom.checkVictory = function(board){
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
			newroom.reset = function(){
				if(newroom.gameState.status!="Done"){
					return false;
				}
				console.log("Room "+newroom.id+": Game was reset");
				var temp = newroom.gameState.player1;
				//switch around players
				newroom.gameState.player1 = newroom.gameState.player2;
				newroom.gameState.player2 = temp;

				temp = newroom.players[0];
				newroom.players[0] = newroom.players[1];
				newroom.players[1] = temp;

				temp = newroom.playersockets[0];
				newroom.playersockets[0] = newroom.playersockets[1];
				newroom.playersockets[1] = temp;

				var start = false;
				if(newroom.gameState.player1 && newroom.gameState.player2){
					newroom.gameState.status = "Playing";
					start = true;
				}else{
					newroom.gameState.status = "Waiting for Players";
				}
				newroom.gameState.turn = 0;
				newroom.gameState.num_moves = 0;
				newroom.gameState.boardState = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
				newroom.emitToPlayers('gameReset', JSON.stringify(newroom.gameState));
				if(start){
					setTimeout(function(){
						newroom.emitToPlayers('gameMessage', 'gameStart');
						var u = newroom.playersockets[newroom.gameState.turn];
						if(u!=null){
							u.emit('gameMessage', 'yourTurn');
						}
						u = newroom.playersockets[newroom.nextPlayer(newroom.gameState.turn)];
						if(u!=null){
							u.emit('gameMessage', 'opponentTurn');
						}
					}, 1000);
				}
			}
			newroom.playerJoin = function(userSocket){
				var room = newroom;
				
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
			newroom.playerLeave = function(userSocket){
				//remove user from room roomid
				var i = newroom.playersockets.indexOf(userSocket);
				var n = clients.getNameFromSocket(userSocket);

				if(newroom.gameState.player1==n){
					newroom.gameState.player1 = null;
				}else if(newroom.gameState.player2==n){
					newroom.gameState.player2 = null;
				}
				if(newroom.gameState.status!="Done"){
					newroom.gameState.status = "Waiting for Players";
				}
				
				newroom.emitToPlayers('gameMessage', 'gameStop');
				newroom.players[i] = null;
				newroom.playersockets[i] = null;
				console.log("Room "+newroom.id+": User "+clients.getNameFromSocket(userSocket)+" left the room");
				userSocket.emit('leaveStatus', 1);
				if(newroom.isEmpty()){
					gamerooms.deleteRoom(newroom.id);
				}else{
					newroom.emitToPlayers('playerLeave', JSON.stringify([newroom.id, n]));
				}
				gamerooms.broadcastAllRooms();
			}

		break;
		case("Uno"):
			newroom.gameState.status = "Waiting for Players";
			newroom.resetDeck = function(){
				newroom.gameState.deck = [];
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
						newroom.gameState.deck.push(card);
						if(i!=0){
							var card2 = Object();
							card2.color = color;
							card2.value = cardtypes[i];
							newroom.gameState.deck.push(card2);
						}
					}
					var wildcard = Object();
					wildcard.color = "Wild";
					wildcard.value = "None";
					newroom.gameState.deck.push(wildcard);
					var wild4 = Object();
					wild4.color = "Wild";
					wild4.value = "Draw 4";
					newroom.gameState.deck.push(wild4);
				}

			}
			newroom.isEmpty = function(){
				for(var l=0;l<newroom.playersockets.length;l++){
					if(newroom.playersockets[l]){
						return false;
					}
				}
				return true;
			}
			newroom.playerJoin = function(userSocket){
				if(newroom.playersockets.indexOf(userSocket)!=-1){
					userSocket.emit('joinRoomFailure', 'Full');
					return false;
				}
				if(newroom.gameState.status!="Waiting for Players"){
					userSocket.emit('joinRoomFailure', 'Not accepting players');
					return false;
				}
				for(var l=0;l<newroom.playersockets.length;l++){
					if(!newroom.playersockets[l]){
						newroom.playersockets[l] = userSocket;
						newroom.players[l] = clients.getNameFromSocket(userSocket);
						break;
					}
				}

				var startgame = true;
				for(var l=0;l<newroom.playersockets.length;l++){
					if(!newroom.playersockets[l]){
						startgame = false;
					}
				}
				
				var toEmit = {};
				toEmit["id"] = newroom.id;
				toEmit["name"] = newroom.name;
				toEmit["players"] = newroom.players;
				toEmit["game"] = newroom.game;
				toEmit["gameState"] = newroom.gameState;

				userSocket.emit('joinRoomSuccess', JSON.stringify(toEmit));
				console.log("Room "+newroom.id+": User "+clients.getNameFromSocket(userSocket)+" joined the room");
				//update game room list
				gamerooms.broadcastAllRooms();
				//broadcast join to all users
				var n = clients.getNameFromSocket(userSocket);
				newroom.emitToPlayers('playerJoin', JSON.stringify([newroom.id, n, newroom.players.indexOf(n)]));

				if(startgame){
					newroom.gameState.status = "Preparing to start";
					setTimeout(function(){
						newroom.startNewGame();
					}, 1000);
				}
				return true;
			}
			newroom.playerLeave = function(userSocket){
				//remove user from room roomid
				var i = newroom.playersockets.indexOf(userSocket);
				var n = clients.getNameFromSocket(userSocket);
				
				newroom.players[i] = null;
				newroom.playersockets[i] = null;
				console.log("Room "+newroom.id+": User "+clients.getNameFromSocket(userSocket)+" left the room");
				userSocket.emit('leaveStatus', 1);
				if(newroom.isEmpty()){
					gamerooms.deleteRoom(newroom.id);
				}else{
					newroom.emitToPlayers('playerLeave', JSON.stringify([newroom.id, n, i]));
					//if only one player left, player wins.
				}
				gamerooms.broadcastAllRooms();
			}
			newroom.startNewGame = function(){
				newroom.resetDeck();
				newroom.gameState.discard = [];
				newroom.gameState.activeCard = null;
				newroom.gameState.status = "Dealing";
				var toEmit = {};
				toEmit['message'] = 'gameStart';
				newroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
				newroom.gameState.playerhands = [];
				newroom.gameState.turn = 0;
				newroom.gameState.direction = 1;
				var delay = 500;
				for(var l=0;l<newroom.playersockets.length;l++){
					newroom.gameState.playerhands[l] = [];
					newroom.dealRandomCardsToPlayer(7, l, delay);
				}
				newroom.gameState.status = "Playing";
				//find starting card
				setTimeout(function(){
					var i = Math.floor(Math.random()*newroom.gameState.deck.length);
					var card = newroom.gameState.deck[i];
					var nums = ["0","1","2","3","4","5","6","7","8","9"];
					//for convenience, starting card has to be number
					while(nums.indexOf(card.value)==-1){
						i = Math.floor(Math.random()*newroom.gameState.deck.length);
						card = newroom.gameState.deck[i];
					}
					newroom.gameState.activeCard = card;
					newroom.gameState.deck.splice(i, 1);
					newroom.gameState.discard.push(card);
					var toEmit = Object();
					toEmit.message = 'firstCard';
					toEmit.card = card;
					newroom.emitToPlayers('gameMessage', JSON.stringify(toEmit));
					newroom.emitTurns();
				}, delay*8);
			}

			newroom.emitTurns = function(){
				for(var j=0;j<newroom.playersockets.length;j++){
					var toEmit = Object();
					if(j==newroom.gameState.turn){
						toEmit.message = 'yourTurn';
					}else{
						toEmit.message = 'opponentTurn';
						toEmit.player = newroom.gameState.turn;
					}
					newroom.playersockets[j].emit('gameMessage', JSON.stringify(toEmit));
				}
			}
			newroom.dealRandomCardsToPlayer = function(numCards, playerNum, delay){
				if(numCards>0){
					var i = Math.floor(Math.random()*newroom.gameState.deck.length);
					var card = newroom.gameState.deck[i];
					newroom.gameState.playerhands[playerNum].push(card);
					newroom.gameState.deck.splice(i, 1);
					for(var k=0;k<newroom.playersockets.length;k++){
						if(k==playerNum){
							//emit the card
							var toEmit = Object();
							toEmit.message = 'idraw';
							toEmit.color = card.color;
							toEmit.value = card.value;
							newroom.playersockets[k].emit('gameMessage', JSON.stringify(toEmit));
						}else{
							//emit that the player drew a card
							var toEmit = Object();
							toEmit.message = 'playerdraw';
							toEmit.player = playerNum;
							newroom.playersockets[k].emit('gameMessage', JSON.stringify(toEmit));
						}
					}
					setTimeout(function(){
						newroom.dealRandomCardsToPlayer(numCards-1, playerNum, delay);
					}, delay);
				}
			}
			newroom.makeMove = function(userSocket, received){
				if(received.id!=newroom.id){
					return false;
				}
				var i = newroom.playersockets.indexOf(userSocket);
				if(i!=newroom.gameState.turn){
					return false;
				}
				if(!newroom.playerHasCard(i, received.card)){
					return false;
				}
			}
			newroom.playerHasCard = function(player, card){
				var hand = newroom.gameState.playerhands[player];
				for(var i=0;i<hand.length;i++){
					if(card.value==hand[i].value && card.color==hand[i].color){
						return true;
					}
				}
				return false;
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