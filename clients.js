var clients = Object();
clients.sockets = {};
clients.colors = {};
clients.gameRooms = {};
clients.online = 0;
clients.io = undefined;

clients.setIO = function(io){
	clients.io = io;
}

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
		clients.io.emit('userDisconnect', name);
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

clients.emitAll = function(topic, msg){
	for(var i=0; i<clients.sockets.length; i++){
		clients.sockets[i].emit(topic, msg);
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
		return false;
	}
}

clients.broadcastOnlineUsers = function(){
	var toEmit = [[],[]];
	for(var k in clients.colors){
		toEmit[0].push(k);
		toEmit[1].push(clients.colors[k]);
	}
	clients.io.emit('onlineUsers',JSON.stringify(toEmit));
}

clients.requestJoin = function(name, room){
	if(!room){
		console.log("Error: User "+name+" attempted to join room "+room.id+" (invalid ID)");
	}
	else if(room.playerJoin(clients.getSocketFromName(name))){
		clients.gameRooms[name].push(room);
	}
}

clients.leaveRoom = function(name, room){
	var j = clients.gameRooms[name].indexOf(room);
	if(j!=-1){
		clients.gameRooms[name].splice(j, 1);
		room.playerLeave(clients.getSocketFromName(name), room.id);
	}
}

module.exports = clients;