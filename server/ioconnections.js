function init(io, clients, gamerooms){
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
    		clients.broadcastOnlineUsers();
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
  		clients.requestJoin(clients.getNameFromSocket(socket), gamerooms[roomid]);
  	});

  	socket.on('leaveRoom', function(roomid){
  		clients.leaveRoom(clients.getNameFromSocket(socket), gamerooms[roomid]);
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
}

function validStr(str){
  //TODO: Implement me
  return true;
}

var validGames = ["Connect Four", "Uno", "Draw My Thing"];
var validPlayers = {};
validPlayers["Connect Four"] = ["2"];
validPlayers["Uno"] = ["2", "3", "4", "5", "6"];
validPlayers["Draw My Thing"] = ["3", "4", "5", "6", "7", "8"];

module.exports = {
  "init": init
};