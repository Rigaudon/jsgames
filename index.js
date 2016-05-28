var express = require('express');
var app = express();
app.use(express.static(__dirname+"/"))
var http = require('http').Server(app);
var io = require('socket.io')(http);
var validGames = ["Connect Four"];
var validPlayers = {};
validPlayers["Connect Four"] = ["2"];

var clients = Object();
clients.sockets = [];
clients.names = [];
clients.colors = [];
clients.gameRooms = [];
clients.online = 0;
clients.addClient = function(socket, name){
	clients.sockets.push(socket);
	clients.names.push(name);
	clients.colors.push('#FFFFFF');
	clients.gameRooms.push([]);
	socket.emit('login status', 1);
	console.log('User '+name+' logged in');
	clients.online++;
	clients.broadcastOnlineUsers();
}
clients.removeClient = function(socket){
	var i = clients.sockets.indexOf(socket);
	if(i!=-1){
		console.log('User '+clients.names[i]+' disconnected');
		io.emit('userDisconnect', clients.names[i]);
		//handle client's game rooms here
		console.log("User's games: "+clients.gameRooms[i]);
		for(var j=0;j<clients.gameRooms[i].length;j++){
			clients.leaveRoom(socket, clients.gameRooms[i][j]);
		}

		clients.sockets.splice(i, 1);
		clients.names.splice(i, 1);
		clients.colors.splice(i,1);
		clients.online--;
		clients.broadcastOnlineUsers();
	}else{
		//error
	}
}
clients.name_available = function(name){
	return clients.names.indexOf(name)==-1;
}
clients.getNameFromSocket = function(socket){
	var i = clients.sockets.indexOf(socket);
	if(i!=-1){
		return clients.names[i];
	}else{
		return false;
	}
}
clients.getSocketFromName = function(name){
	var i = clients.names.indexOf(name);
	if(i!=-1){
		return clients.sockets[i];
	}else{
		return false;
	}
}
clients.setColor = function(userSocket, color){
	var i = clients.sockets.indexOf(userSocket);
	if(i!=-1){
		console.log("Set user color to "+color);
		clients.colors[i] = color;
		clients.broadcastOnlineUsers();
	}else{
		return false;
	}
}
clients.broadcastOnlineUsers = function(){
	io.emit('onlineUsers',JSON.stringify([clients.names, clients.colors]));
}

clients.requestJoin = function(userSocket, roomid){
	console.log("User "+clients.getNameFromSocket(userSocket)+" attempted to join room "+roomid);
	if(gamerooms.playerJoin(userSocket, roomid)){
		console.log("User joined successfully");
		var i = clients.sockets.indexOf(userSocket);
		clients.gameRooms[i].push(roomid);
	}
}
clients.leaveRoom = function(userSocket, roomid){
	var i = clients.sockets.indexOf(userSocket);
	var j = clients.gameRooms[i].indexOf(roomid);
	if(j!=-1 && gamerooms[roomid].playersockets.indexOf(userSocket)!=-1){
		clients.gameRooms[i].splice(j, 1);
		gamerooms.playerLeave(userSocket, roomid);
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
	gamerooms.idlist.push(id);
	gamerooms[newroom.id] = newroom;
	//handle pw protected rooms later
/*
	//dont need to emit because playerJoin emits to all
	var toEmit = {};
	toEmit["id"] = newroom.id;
	toEmit["name"] = newroom.name;
	toEmit["players"] = newroom.players;
	toEmit["game"] = newroom.game;
	io.emit('gameRoomCreated', JSON.stringify(toEmit));
*/
	clients.requestJoin(playersocket, id);

}

gamerooms.deleteRoom = function(id){
	delete gamerooms[id];
	gamerooms.idlist.splice(gamerooms.idlist.indexOf(id), 1);
	io.emit('gameRoomDeleted', id);
}

gamerooms.playerJoin = function(userSocket, roomid){
	var room = gamerooms[roomid];
	if(room.players.length < room.numPlayers && room.playersockets.indexOf(userSocket)==-1){
		room.playersockets.push(userSocket);
		room.players.push(clients.getNameFromSocket(userSocket));
		
		var toEmit = {};
		toEmit["id"] = room.id;
		toEmit["name"] = room.name;
		toEmit["players"] = room.players;
		toEmit["game"] = room.game;
		
		userSocket.emit('joinRoomSuccess', JSON.stringify(toEmit));

		//update game room list
		gamerooms.broadcastAllRooms();
		//broadcast join to all users
		for(var i=0;i<room.playersockets.length;i++){
			room.playersockets[i].emit('playerJoin', room.id);
		}
		return true;
	}else{
		userSocket.emit('joinRoomFailure', 'Full');
		return false;
	}
}

gamerooms.playerLeave = function(userSocket, roomid){
	//remove user from room roomid
	var i = gamerooms[roomid].playersockets.indexOf(userSocket);
	gamerooms[roomid].players.splice(i, 1);
	gamerooms[roomid].playersockets.splice(i, 1);
	console.log("User left room "+roomid);
	console.log("Remaing players: "+gamerooms[roomid].players);
	userSocket.emit('leaveStatus', 1);
	if(gamerooms[roomid].players.length==0){
		gamerooms.deleteRoom(roomid);
	}
	gamerooms.broadcastAllRooms();
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
		console.log('User attempted to pick name '+name);
		if(clients.name_available(name)){
			clients.addClient(socket, name);
		}else{
			socket.emit('login status', 0);
			console.log('Username '+name+' was already taken.');
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
  		clients.setColor(socket, col);
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
  			console.log("Error making room: name was empty.");  
  		}
  		if(r.name.length>20){
  			errors++;
  			console.log("Error making room: name was too long: "+ r.name);
  		}
  		if(r.pw.length>20){
  			errors++;
  			console.log("Error making room: password was too long: "+r.pw);
  		}
  		if(!validStr(r.name) || !validStr(r.pw)){
  			errors++;
  			console.log("Error making room: name/pw was invalid.");
  		}
  		if(validGames.indexOf(r.gameType)==-1){
  			errors++;
  			console.log("Error making room: Invalid game type: "+r.gameType);
  		}else{
  			if(validPlayers[r.gameType].indexOf(r.numPlayers)==-1){
  				errors++;
  				console.log("Error making room: number of players was invalid: "+r.numPlayers);
  			}
  		}

  		if(errors==0){
  			//make room
  			console.log("Making room");
  			socket.emit('makeRoomResponse', 1);
  			gamerooms.createRoom(gamerooms.generatedId(), r.name, r.pw, r.gameType, r.numPlayers, socket);
  		}else{
  			console.log("There were "+errors+" errors.");
  			socket.emit('makeRoomResponse', 0);
  		}
  	});
	
	//sending all the current room info
	socket.on('getGameRooms', function(msg){
		socket.emit('allRooms',JSON.stringify(gamerooms.getAllRooms()));
	});

	//client requests to join room id
	socket.on('joinRoom', function(roomid){
		clients.requestJoin(socket, roomid);
	});
});



//TODO:
//Chatroom: timestamps, message when someone joins, how many online, who is typing, different chat rooms by #
//Back button
//Implement games
//refactor ids 
//Implement mouse tracking in game
//Implement database
//Make mobile version

http.listen(3000, function(){
  console.log('Listening on port 3000');
});