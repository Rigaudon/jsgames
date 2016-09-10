var buildRoom = {
	"Connect Four": require("./connectfourroom.js"),
	"Uno": require("./unoroom.js"),
	"Draw My Thing": require("./drawroom.js")
};
var gamerooms = {};
gamerooms.idlist = [];
var io;
var clients;
gamerooms.setIO = function(globalio){
	io = globalio;
}
gamerooms.setClients = function(globalclients){
	clients = globalclients;
}

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
	var toEmit = Object();
	toEmit.id = newroom.id;
	io.emit('gameRoomCreated', JSON.stringify(toEmit));
	newroom.emitToPlayers = function(msg, val){
		for(var i=0;i<newroom.playersockets.length;i++){
			if(newroom.playersockets[i]){
				newroom.playersockets[i].emit(msg, val);
			}
		}
	}
	
	newroom.emitToOtherPlayers = function(msg, val, who){
		for(var i=0;i<newroom.playersockets.length;i++){
			if(newroom.playersockets[i] && who != newroom.playersockets[i]){
				newroom.playersockets[i].emit(msg, val);
			}
		}
	}

	buildRoom[type](newroom, clients, gamerooms);
	

	//handle pw protected rooms later
	gamerooms[newroom.id] = newroom;
	clients.requestJoin(clients.getNameFromSocket(playersocket), newroom);

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

module.exports = gamerooms;