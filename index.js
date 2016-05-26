var express = require('express');
var app = express();
app.use(express.static(__dirname+"/"))
var http = require('http').Server(app);
var io = require('socket.io')(http);
var client_sockets = [];
var client_names = [];
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
});


//Fixme: logging in, turning server off/on, but client stays active, lets another person log in with same name... or not?
function name_available(name){
	//also check if valid char?
	return client_names.indexOf(name)==-1;
}

http.listen(3000, function(){
  console.log('Listening on port 3000');
});