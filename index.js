var express = require('express');
var app = express();
app.use(express.static(__dirname+"/"))
var http = require('http').Server(app);
var io = require('socket.io')(http);
var client_sockets = [];
var client_names = [];
//var gamerooms = [];
var gameroom = false;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
//TODO: REPLACE WITH HASHTABLE LATER
io.on('connection', function(socket){
	socket.on('pickname', function(name){
		console.log('User attempted to pick name '+name);
		if(name_available(name)){
			client_sockets.push(socket);
			client_names.push(name);
			socket.emit('login status', 1);
			console.log('User '+name+' logged in');
		}else{
			socket.emit('login status', 0);
			console.log('Username '+name+' was already taken.');
		}
	});

	socket.on('disconnect', function(){
		var i = client_sockets.indexOf(socket);
		if(i!=-1){
			console.log('User '+client_names[i]+' disconnected');
			client_sockets.splice(i, 1);
			client_names.splice(i, 1);
		}else{
			//error
		}
  	});

	//TODO: linkify things
  	socket.on('message2s', function(msg){
  		var received = JSON.parse(msg);
  		var usermsg = new Object();
  		usermsg.user = client_names[client_sockets.indexOf(socket)];
  		usermsg.content = received.message;
  		if(received.chatroom=="main"){
	  		console.log("Got message from "+usermsg.user+": "+msg);
	  		io.emit('message2c', JSON.stringify(usermsg));
  		}else{
  			//handle pm here
  		}
  	});

  	//Joining rooms
  	socket.on('join', function(msg){
  		//Replace me
  		if(msg=='Connect Four'){
  			if(gameroom==false){
  				//join as p1
  				//replace with predefined obj on rewrite
  				gameroom = Object();
  				gameroom.gametype = 'Connect Four';
  				gameroom.player1 = socket;
  				gameroom.player2 = false;
  				gameroom.board = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
				gameroom.turn = 0;
				gameroom.id = 'Connect Four';
				console.log('User '+client_names[client_sockets.indexOf(socket)]+' joined as Player 1 in Connect 4');
				gameroom.player1.emit('c4gamestate', 'waiting');
  			}else if(gameroom.player2==false){
  				//join as p2
  				gameroom.player2 = socket;
  				gameroom.turn = 1;
  				console.log('User '+client_names[client_sockets.indexOf(socket)]+' joined as Player 2 in Connect 4');
  				gameroom.player2.emit('c4opponent_name', client_names[client_sockets.indexOf(gameroom.player1)]);
  				gameroom.player1.emit('c4opponent_name', client_names[client_sockets.indexOf(gameroom.player2)]);
  				gameroom.player2.emit('c4gamestate', 'waiting');
  				gameroom.player1.emit('c4gamestate', 'turn'+gameroom.turn);
  				gameroom.player2.emit('c4gamestate', 'turn'+gameroom.turn);
  			}
  		}
  	});
});


//Fixme: logging in, turning server off/on, but client stays active, lets another person log in with same name... or not?
function name_available(name){
	//also check if valid char?
	return client_names.indexOf(name)==-1;
}

//TODO:
//Chatroom: timestamps, message when someone joins, how many online, who is typing, different chat rooms by #
//Back button
//Redo selection into room selection*
//Implement games
//Implement mouse tracking in game
//Implement database

http.listen(3000, function(){
  console.log('Listening on port 3000');
});