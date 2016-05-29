//Variables
var socket = io();
var usrname = false;
var myColor;
var colors = {}
colors["#337AB7"] = "primary";
colors["#5CB85C"] = "success";
colors["#5BC0DE"] = "info";
colors["#F0AD4E"] = "warning";
colors["#D9534F"] = "danger";

var gameRooms = {};
gameRooms.active = 0;

var makeRoomStatus = false;
var activeGame = null;
var currRoom = null;
var onlineUsers = null;
var playernum = null;
//Game Room code
//Connect Four
var ConnectFourRoom = Object();
ConnectFourRoom.joinedRoom = function(){
	$("#gameroombox").animate({
		left: '-50%'
	}, 500);
	ConnectFourRoom.resize();
	$("#create_room_button").hide();
	$("#back_to_lobby").show();
	$("#active_game_div").animate({
		left: '42.5%'
	}, 500);
	getRoomInfo(currRoom);
	$("#room_info").animate({
		top: '84%'
	}, 500);
	activeGame = "Connect Four";
}
ConnectFourRoom.leaveRoom = function(){
	$("#active_game_div").animate({
		left: '150%'
	});
	//empty the div?
	$("#back_to_lobby").hide();
	$("#create_room_button").show();
	$("#gameroombox").animate({
		left: '42.5%'
	}, 500);
	$("#room_info").animate({
		top: '105%'
	}, 500);
	socket.emit('leaveRoom', currRoom);
	activeGame = null;
	currRoom = null;
	playernum = null;
}
ConnectFourRoom.resize = function(){
	var setTo = $(".c4row").height();
	$(".c4box").width(setTo);
	$("#c4hoveranim").width(setTo);
	$("#c4hoveranim").height(setTo);
	var margins = ($("#connect_four_board").width()-7*(setTo))/2;
	$(".c4row").css("margin-left", margins+"px");
}

ConnectFourRoom.buildRoom = function(gameState){
	var active = $("#active_game_div");
	
	active.empty();
	var toptxt = "Waiting for opponent...";
	var bottomtxt = "Me";
	//todo: colors
	if(gameState.player1!=null && gameState.player2!=null){
		if(gameState.player1==usrname){
			toptxt = gameState.player2;
			bottomtxt = gameState.player1;
		}else{
			toptxt = gameState.player1;
			bottomtxt = gameState.player2;
		}
	}else{
		bottomtxt = usrname;
	}
	active.append($("<div id='c4opponent'>").append($("<span class='label label-default'>").text(toptxt)));
	var rows = 6;
	var cols = 7;

	var board = $("<div id='connect_four_board'>");
	for(var j=0;j<rows;j++){
		var r = $("<div class='row c4row'>")
		for(var i=0;i<cols;i++){
			var c4box = $("<div class='col-md-1 c4box' id='c4"+j+i+"'>");
			c4box.click(function(){
				var c4move = Object();
				//c4move.row = j;
				c4move.col = parseInt(this.id.charAt(3));
				c4move.id = currRoom;
				console.log("Attempting to make move "+c4move.col);
				socket.emit('makeMove', JSON.stringify(c4move));
			});

			c4box.hover(function(){
				$("#c4hoveranim").css('left', $("#"+this.id).position().left+'px');
			});
			
			if(gameState.boardState[j][i]!=0){
				c4box.addClass('c4'+ConnectFourRoom.colors[gameState.boardState[j][i]-1]);
			}
			//c4box.text("Row "+j+", Col "+i);
			r.append(c4box);
		}
		board.append(r);	
	}
	
	active.append(board);
	active.append($("<div id='c4me'>").append($("<span class='label label-default'>").text(bottomtxt)));
	var hover = $("<div id='c4hoveranim'>");
	active.append(hover);
}

ConnectFourRoom.playerJoin = function(received){
	 if(currRoom==received[0] && received[1]!=usrname){
	 	$("#c4opponent span").text(received[1]);
	 	getRoomInfo(currRoom);
	 }
}

ConnectFourRoom.playerLeave = function(received){
	if(currRoom==received[0]){
		$("#c4opponent span").text("Waiting for opponent...");
		getRoomInfo(currRoom);
	}
}

ConnectFourRoom.gameMessage = function(msg){
	switch(msg){
		case "gameStart":
			//add colors
			var opponent = $("#c4opponent span").text();
			var i = onlineUsers[0].indexOf(opponent);
			$("#c4opponent span").removeClass('label-default');
			$("#c4opponent span").addClass('label-'+colors[onlineUsers[1][i]]);
			$("#c4me span").removeClass('label-default');
			$("#c4me span").addClass('label-'+colors[myColor]);
		break;
		case "gameStop":
			var opponent = $("#c4opponent span").text();
			var i = onlineUsers[0].indexOf(opponent);
			$("#c4opponent span").removeClass('label-'+colors[onlineUsers[1][i]]);
			$("#c4opponent span").addClass('label-default');
			$("#c4me span").removeClass('label-'+colors[myColor]);
			$("#c4me span").addClass('label-default');
		break;
		case "yourTurn":
			$("#c4me span").css('border', '20px outset lightblue');
			$("#c4opponent span").css('border', 'none');
			$("#c4hoveranim").show();
		break;
		case "opponentTurn":
			$("#c4opponent span").css('border', '20px outset lightblue');
			$("#c4me span").css('border', 'none');
			$("#c4hoveranim").hide();
		break;
	}	
}
//changeme
ConnectFourRoom.colors = ["yellow", "blue"];
ConnectFourRoom.makeMove = function(msg){
	var received = JSON.parse(msg);
	//received.id, received.col, received.row, received.user (int 0 or 1)
	if(received.id!=currRoom){
		console.log("Error: received move for wrong game id");
		return false;
	}

	$("#c4"+received.row+received.col).addClass('c4'+ConnectFourRoom.colors[received.user]);;

}
//Server com for logging in
function attemptLogin(picked_name){
	usrname = picked_name;
	socket.emit('pickname', usrname);
}

//Get the room info
function getRoomInfo(roomid){
	console.log("Requesting room info...");
	socket.emit('requestRoomInfo', roomid);
	getPlayerNum(roomid);
}

function getPlayerNum(roomid){
	socket.emit('requestPlayerNum', roomid);
}

//Login code, moving to selection 
socket.on('login status', function(status){
	if(status==1){
		//Success!
		//Name select goes away
		$("#name_select").animate({
			left: '-100%'
		}, 500);

		//Chat box comes in
		$("#chatmain").animate({
			left: '105%'
		}, 500);

		//Game roomes come in
		$("#gameroombox").animate({
			left: '42.5%'
		}, 500);

		//Create room/join number comes in
		$("#creategamebox").animate({
			left: '47%'
		}, 500);

		//Who's online comes in
		$("#onlinebox").animate({
			left: '25%'
		}, 500);

		//Set chatbox username
		$("#chatname").text(usrname+":");

		//Give user a random color
		var cols = ['#337AB7', '#5CB85C', '#5BC0DE', '#F0AD4E', '#D9534F'];
		myColor = cols[Math.floor(Math.random()*cols.length)];

		//send color
		socket.emit('choosecolor', myColor);
		$("#chatname").addClass('label-'+colors[myColor]);
		socket.emit('joinchatroom', 'main');
		socket.emit('getGameRooms', '');
		//set cookie
		Cookies.set('name', usrname, {expires: 7});
		//settings top left
		$("#settings_btn").show();
		$("#settings_btn").animate({
			left: '0%'
		}, 500);
	}else if(status==0){
		//already taken
		usrname = false;
		var msg = $("#name_select_msg");
		msg.addClass('alert-danger');
		msg.text('That username is already taken!');
		msg.fadeIn().delay(1000).fadeOut("slow");

	}
});

//main chatroom receiving
socket.on('message2c', function(msg){
	if(!usrname){
		return false;
	}
	var received = JSON.parse(msg);
	//handle here
	//replace me
	var msgbox = $('#messages');
	var scrollBottom = false;

	if(msgbox[0].scrollHeight-msgbox.scrollTop()==msgbox.outerHeight()){
		scrollBottom = true;
	}

	var adiv = $("<div>");
	var aspan = $("<span style='color:"+received.color+";font-weight:bold'>").text(received.user+": ");
	adiv.append(aspan);
	var ali = $('<span>').text(received.content);
	adiv.append(ali);

	msgbox.append(adiv);
	if(scrollBottom){
		$('#messages').scrollTop($('#messages')[0].scrollHeight);
	}

});

//updating online users
socket.on('onlineUsers', function(msg){
	var received = JSON.parse(msg);
	onlineUsers = received;
	var list = $("#onlinelist");
	list.empty();
	for(var i=0;i<received[0].length;i++){
		list.append($("<span>").css('color',received[1][i]).text(received[0][i]));
	}
	$("#numonline").text(received[0].length);
});

//updating chat when user joins
socket.on('userJoinMainChat', function(username){
	var txt = username;
	if(username==usrname){
		txt+=" (You)";
	}
	txt+=" joined the room";
	$("#messages").append($("<div class='subtle'>").text(txt));
});

//updating chat when user leaves; TODO: Make this apply for all chats
socket.on('userDisconnect', function(username){
	var txt = username+" left the room";
	$("#messages").append($("<div class='subtle'>").text(txt));
});

//response from making room
socket.on('makeRoomResponse', function(code){
	if(makeRoomStatus){
		makeRoomStatus = false;
		$("#loading").hide();
		$("#create_room_button2").show();
		if(code==0){
			//Server error
			$("#createmsg").text("There was a problem creating the room");
			$("#createmsg").fadeIn().delay(1000).fadeOut("slow");
		}else if(code==1){
			//Success
			console.log("Made room successfully");
			$("#create_room_name").val("");
			$("#create_room_pw").val("");
			$("#create_num_players").selectpicker('refresh');
			$("#create_game_type").selectpicker('refresh');

			$("#close_btn").click();
		}
	}
});

socket.on('gameRoomCreated', function(msg){
	var room = JSON.parse(msg);
	console.log("New room detected: "+room.id);
	addRoom(room);
});

socket.on('gameRoomDeleted', function(id){
	console.log("Room removed: "+id);
	removeRoom(id);
});

socket.on('allRooms', function(rooms){
	console.log("Getting all game rooms");
	var r = JSON.parse(rooms);
	//remove all first
	if(gameRooms.active>0){
		for(var k in gameRooms){
			if(typeof gameRooms[k] == "object"){
				removeRoom(k);
			}
		}
	}
	//add all new ones
	for(var i=0;i<r.length;i++){
		addRoom(r[i]);
	}
});

socket.on('joinRoomSuccess', function(room){
	var r = JSON.parse(room);
	console.log("Successfully joined room "+r.id);
	currRoom = r.id;
	getPlayerNum(currRoom);
	//move the player into the room...
	switch(r.game){
		case "Connect Four":
		ConnectFourRoom.buildRoom(r.gameState);
		ConnectFourRoom.joinedRoom();
		break;
	}

});

socket.on('joinRoomFailure', function(msg){

});

socket.on('playerJoin', function(msg){
	var received = JSON.parse(msg);
	console.log("User "+received[1]+" has joined room "+received[0]);
	if(activeGame=="Connect Four"){
		ConnectFourRoom.playerJoin(received);
	}
});

socket.on('playerLeave', function(msg){
	var received = JSON.parse(msg);
	console.log("User "+received[1]+" has left room "+received[0]);
	if(activeGame=="Connect Four"){
		ConnectFourRoom.playerLeave(received);
	}
});

socket.on('leaveStatus', function(code){
	if(code==1){
		console.log("Successfully left room.");
	}
});

//Game logic
socket.on('gameMessage', function(msg){
	if(activeGame=="Connect Four"){
		ConnectFourRoom.gameMessage(msg);
	}
});

socket.on('makeMove', function(msg){
	if(activeGame=="Connect Four"){
		ConnectFourRoom.makeMove(msg);
	}
});

socket.on('playerNum', function(msg){
	console.log("Player number "+msg);
	playernum = msg;
	if(activeGame=="Connect Four"){
		$("#c4hoveranim").css('background-image','url("res/c4'+ConnectFourRoom.colors[playernum]+'.png")');
	}
});

//getting room info for the box
socket.on('roomInfo', function(room){
	console.log("Received room information");
	var received = JSON.parse(room);
	$("#gameroomname").text(received.name+" ("+received.status+")");
	$("#gameroomid").text("ID: "+received.id);
	if(received.pw==""){
		$("#gameroompw").empty();
		$("#gameroompw").text("PW: ").append($("<span class='subtle'>").text("none"));
	}else{
		$("#gameroompw").text("Password: "+received.pw);
	}
	$("#gameroomgame").text(received.game);
	$("#gameroomplayers").text(received.players+" Players");
});
//add a room to the list of available rooms
function addRoom(room){
	var tr = $("<tr>");
	tr.append($("<td>").text(room.id));
	tr.append($("<td>").text(room.name));
	tr.append($("<td>").text(room.game));
	//tr.append($("<td>").text(room.players));
	tr.append(playersColor(room.players));
	var joinbutton = $("<a class='btn btn-primary' href='#' role='button'>").text("Join Game");
	joinbutton.click(function(){
		socket.emit('joinRoom', room.id);
		console.log("Attempting to join room "+room.id);
	});
	tr.append($("<td>").append(joinbutton));
	gameRooms[room.id] = tr;
	gameRooms.active++;
	$('#gameroomtable > tbody:last-child').append(tr);
	$("#placeholder").hide();

	function playersColor(players){
		var td = $("<td>");
		for(var i=0;i<players.length;i++){
			var k = onlineUsers[0].indexOf(players[i]);
			td.append($("<span>").css('color',onlineUsers[1][k]).text(onlineUsers[0][k]));
		}
		return td;
	}
}

function removeRoom(roomId){
	//remove it from list
	if(gameRooms[roomId]==undefined){
		return false;
	}
	gameRooms[roomId].remove();
	gameRooms.active--;
	console.log("Removing room "+roomId+". "+gameRooms.active+" are active.");
	if(gameRooms.active==0){
		//$("#placeholder").css('display', 'inline');
		$("#placeholder").show();
	}
}


//Client JS Code


//Name picking
$("#input_name").bind('keypress', function(e){
	if(e.which==13 && this.value!="" && usrname==false){
		attemptLogin(this.value);
	}
}).on('input', function(e){
	this.value = this.value.replace(/[^A-Za-z0-9]/g, '');
});

//Sending messages in main chat
$("#chatbox_main_msg").bind('keypress', function(e){
	if(e.which==13 && this.value.trim()!="" && usrname!=false){
		var m = new Object();
		m.chatroom = "main";
		m.message = this.value
		m.color = myColor;
		socket.emit('message2s', JSON.stringify(m));
		this.value="";
	}
});

//bring up creating room screen
$("#create_room_button").click(function(){
	$("#dim_div").css('left', '25%');
	$("#dim_div").css('background-color','rgba(0,0,0,0.9)')
	$("#create_room_box").animate({
		left: '31%'
	}, 500);
});

//bring up settings screen
$("#settings_btn a").click(function(){
	$("#dim_div").css('left', '25%');
	$("#dim_div").css('background-color','rgba(0,0,0,0.9)')
	$("#settings_box").animate({
		left: '31%'
	}, 500);
});

//close creating room screen
$("#close_btn").click(function(){
	$("#create_room_box").animate({
		left: '125%'
	}, 500, function(){
		$("#dim_div").css('left', '125%');
		$("#dim_div").css('background-color','rgba(0,0,0,0)')
	});
});

//close settings screen
$("#close_btn2").click(function(){
	$("#settings_box").animate({
		left: '125%'
	}, 500, function(){
		$("#dim_div").css('left', '125%');
		$("#dim_div").css('background-color','rgba(0,0,0,0)')
	});
});

//Send create room message to server
$("#create_room_button2").click(function(){
	if(makeRoomStatus){
		return false;
	}
	var room = Object();
	room.name = $("#create_room_name").val().trim();
	room.pw = $("#create_room_pw").val().trim();
	room.gameType = $("#create_game_type").val();
	room.numPlayers = $("#create_num_players").val();
	var error = "";
	//validate
	if(!(room.name.length>20) && room.name.length>0 && validChars(room.name)){
		if(!(room.pw.length>20) && validChars(room.pw)){
			if(!(room.gameType.length==0) && !(room.numPlayers.length==0)){
				socket.emit('makeRoom', JSON.stringify(room));
				makeRoomStatus = true;
				$("#create_room_button2").hide();
				$("#loading").show();
				//TODO: game room players should show players' colors
			}else{
				error = "Please select a game/players.";
			}
		}else{
			error = "Invalid room password!";
		}
	}else{
		error = "Invalid room name!";
		console.log(room.name);
	}

	if(error!=""){
		$("#createmsg").text(error);
		$("#createmsg").fadeIn().delay(1000).fadeOut("slow");
	}
});

//send user from game back to lobby
$("#back_to_lobby").click(function(){
	switch(activeGame){
		case null:
		return false;
		case "Connect Four":
		ConnectFourRoom.leaveRoom();
		break;
		}
	});

function validChars(str){
	//TODO: IMPLEMENT ME
	return true;
}

//Populating the num players in create game menu
var game_players = {};
game_players["Connect Four"] = [2];
game_players["Chess"] = [2];
game_players["Uno"] = [2,3,4];
game_players["Checkers"] = [2];
$("#create_game_type").change(function(){
	var possible = game_players[$("#create_game_type").val()];
	var list = $("#create_num_players");
	list.empty();
	for(var i=0;i<possible.length;i++){
		list.append($("<option>").text(possible[i]));
	}
	list.selectpicker('refresh');
});


//Misc chatbox focus
/*
$("#messages").click(function(){
	$("#chatbox_main_msg").focus();
});
*/
/*
//Misc chatbox hover, todo: move to css
$(".list-group-item").hover(
	function(){$(this).addClass('active')},
	function(){$(this).removeClass('active')}
	);
*/

//Correcting size for the connect 4 window.

$(window).resize(function(){
	if(activeGame=="Connect Four"){
		ConnectFourRoom.resize();
	}
})

$(document).ready(function(){
	$("#name_select").fadeIn(2000);
	$("#input_name").focus();
	if(Cookies.get('name')!=undefined){
		$("#input_name").val(Cookies.get('name'));
	}
});