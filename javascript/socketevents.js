socket.on('login status', function(status){
	if(status==1){
		//Success!
		$("#name_select").css('left', '-100%');
		$("#chatmain").css('left', '105%');
		$("#gameroombox").css('left', '42.5%');
		$("#creategamebox").css('left', '47.25%');
		$("#onlinebox").css('left', '25%');

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
		$("#settings_btn").css('left', '0%');
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

	if(Math.abs(msgbox[0].scrollHeight-msgbox.scrollTop() - msgbox.outerHeight()) < 50){
		scrollBottom = true;
	}

	var adiv = $("<div>");
	var aspan = $("<span style='color:"+received.color+";font-weight:bold'>").text(received.user+": ");
	adiv.append(aspan);
	var ali = $('<span>');
	ali.text(received.content);
	processChatMessage(ali);
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
			$("#gameModal").modal('hide');
		}
	}
});

socket.on('gameRoomCreated', function(msg){
	var room = JSON.parse(msg);
	console.log("New room detected: "+room.id);
	//addRoom(room, true);
	gameRooms.active++;
});

socket.on('gameRoomDeleted', function(id){
	console.log("Room removed: "+id);
	removeRoom(id, true);
});

socket.on('allRooms', function(rooms){
	console.log("Getting all game rooms");
	var r = JSON.parse(rooms);
	//remove all first
	if(gameRooms.active>0){
		for(var k in gameRooms){
			if(typeof gameRooms[k] == "object"){
				removeRoom(k, false);
			}
		}
	}
	var tb = $("#gameroomtable tbody");
	tb.empty();
	tb.append($('<tr id="placeholder"><td colspan="6">No games to display</td></tr>'));
	//add all new ones
	for(var i=0;i<r.length;i++){
		addRoom(r[i], false);
	}
});

socket.on('joinRoomSuccess', function(room){
	$.playSound('res/sounds/join');
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
		case "Uno":
		UnoRoom.buildRoom(r);
		UnoRoom.joinedRoom();
		break;
		case "Draw My Thing":
		DrawRoom.buildRoom(r.gameState, r.players);
		DrawRoom.joinedRoom();
		DrawRoom.clearCanvas();
		break;
	}

});

socket.on('joinRoomFailure', function(msg){

});

socket.on('leaveStatus', function(code){
	if(code==1){
		$.playSound('res/sounds/leave');
		console.log("Successfully left room.");
	}
});

//Game logic
socket.on('gameMessage', function(msg){
	if(activeGame=="Connect Four"){
		ConnectFourRoom.gameMessage(msg);
	}else if(activeGame=="Uno"){
		UnoRoom.gameMessage(msg);
	}else if(activeGame=="Draw My Thing"){
		DrawRoom.gameMessage(msg);
	}
});

socket.on('playerNum', function(msg){
	//console.log("Player number "+msg);
	playernum = msg;
});

//getting room info for the box
socket.on('roomInfo', function(room){
	//console.log("Received room information");
	var received = JSON.parse(room);
	$("#gameroomname").text(received.name+" ("+received.status+")");
	roomStatus = received.status;
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