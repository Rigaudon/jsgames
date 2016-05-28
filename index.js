var express = require('express');
var app = express();
app.use(express.static(__dirname+"/"))
var http = require('http').Server(app);
var io = require('socket.io')(http);
var validGames = ["Connect Four"];
var validPlayers = {};
validPlayers["Connect Four"] = ["2"];

var gameroom = false;

var clients = Object();
clients.sockets = [];
clients.names = [];
clients.colors = [];
clients.online = 0;
clients.addClient = function(socket, name){
	clients.sockets.push(socket);
	clients.names.push(name);
	clients.colors.push('#FFFFFF');
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

//consider using clients.sockets instead of io.emit

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
  		}else{
  			console.log("There were "+errors+" errors.");
  			socket.emit('makeRoomResponse', 0);
  		}
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