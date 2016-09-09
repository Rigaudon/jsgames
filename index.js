"use strict";

var express = require('express');
var app = express();
app.use(express.static(__dirname+"/"))
var http = require('http').Server(app);
var io = require('socket.io')(http);

var clients = require('./clients.js');
clients.setIO(io);

var gamerooms = require('./gamerooms.js');
gamerooms.setIO(io);
gamerooms.setClients(clients);

app.get('/' function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var ioConnections = require('./ioconnections.js');
ioConnections.init(io, clients, gamerooms);

http.listen(8080, function(){
  console.log('Listening on port 8080');
});