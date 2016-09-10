//require();
function baseInit(room, clients, gamerooms){
	//Set other gameState variables; 
	room.gameState.status = "Waiting for Players";
	room.gameState.activePlayers = 0;

	//Required
	//Returns true on success, false if not.
	room.playerJoin = function(userSocket){
		if(room.playersockets.indexOf(userSocket)!=-1){
			return false;
		}

		//Check if room is full...
		if(room.gameState.activePlayers >= room.numPlayers){
			userSocket.emit('joinRoomFailure', 'Room is full');
			return false;
		}
		//Populate into room.playersockets AND room.players
		for(var l=0;l<room.playersockets.length;l++){
			if(!room.playersockets[l]){
				room.playersockets[l] = userSocket;
				room.players[l] = clients.getNameFromSocket(userSocket);
				room.gameState.activePlayers ++;
				break;
			}
		}

		//Emit a room join success to the player
		var toEmit = {};
		toEmit.id = room.id;
		toEmit.name = room.name;
		toEmit.players = room.players;
		toEmit.game = room.game;
		toEmit.gameState = room.gameState;
		userSocket.emit('joinRoomSuccess', JSON.stringify(toEmit));
		console.log("Room "+room.id+": User "+clients.getNameFromSocket(userSocket)+" joined the room");
		
		//Broadcast join to users in the room
		var n = clients.getNameFromSocket(userSocket);
		var toEmit = Object();
		toEmit.message = 'playerJoin';
		toEmit.id = room.id;
		toEmit.player = n;
		//toEmit.playernum = l;
		room.emitToPlayers('gameMessage', JSON.stringify(toEmit), userSocket);

		//Broadcast the update to all users
		gamerooms.broadcastAllRooms();
	
		//Start the game if the room is full		
		if(room.gameState.activePlayers == room.numPlayers){
			room.startGame();
		}
		return true;
	}

	room.playerLeave = function(userSocket){
		//Remove user from room[roomid]
		var i = unoroom.playersockets.indexOf(userSocket);
		var n = clients.getNameFromSocket(userSocket);
		
		room.players[i] = null;
		room.playersockets[i] = null;
		console.log("Room "+room.id+": User "+clients.getNameFromSocket(userSocket)+" left the room");
		userSocket.emit('leaveStatus', 1);
		if(room.isEmpty()){
			gamerooms.deleteRoom(room.id);
			gamerooms.broadcastAllRooms();
			return;
		}

		var toEmit = Object();
		toEmit.message = 'playerLeave';
		toEmit.id = room.id;
		toEmit.playerName = n;
		toEmit.player = i;
		room.emitToPlayers('gameMessage', JSON.stringify(toEmit));		
		gamerooms.broadcastAllRooms();
		
	}

	room.startGame = function(){
		room.gameState.status = "Playing";
	}

	room.isEmpty = function(){
		return drawroom.gameState.activePlayers == 0;
	}


}

module.exports = baseInit;