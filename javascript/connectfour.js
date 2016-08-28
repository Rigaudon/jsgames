var ConnectFourRoom = Object();
ConnectFourRoom.joinedRoom = function(){
	preloadImages(c4imglist);
	$("#gameroombox").css('left', '-50%');
	ConnectFourRoom.resize();
	$("#create_room_button").hide();
	$("#back_to_lobby").show();
	$("#active_game_div").css('left', '42.5%');
	getRoomInfo(currRoom);
	$("#room_info").css('top', '84%');
	$("#game_messages").css('top', '84%');
	activeGame = "Connect Four";
}
ConnectFourRoom.leaveRoom = function(){
	$("#active_game_div").css('left', '150%');
	$("#back_to_lobby").hide();
	$("#create_room_button").show();
	$("#gameroombox").css('left', '42.5%');
	$("#room_info").css('top', '105%');
	$("#game_messages").css('top', '105%');
	$("#game_messages").empty();
	socket.emit('leaveRoom', currRoom);
	activeGame = null;
	currRoom = null;
	playernum = null;
	roomStatus = null;
}
ConnectFourRoom.resize = function(){
	var setTo = $(".c4row").height();
	var margins = ($("#connect_four_board").width()-7*(setTo))/2;
	if(margins < 0){
		$(".c4row").height($("#connect_four_board").width()/7-2);
		ConnectFourRoom.resize();
		return;
	}
	$(".c4box").width(setTo);
	//$(".c4row").height(setTo);
	$("#c4hoveranim").width(setTo);
	$("#c4hoveranim").height(setTo);
	$(".c4row").css("margin-left", margins+"px");
}
ConnectFourRoom.buildRoom = function(gameState){
	var active = $("#active_game_div");
	
	active.empty();
	var toptxt = "Waiting for opponent...";
	var bottomtxt = "Me";
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
		var r = $("<div class='row c4row'>");
		for(var i=0;i<cols;i++){
			var c4box = $("<div class='col-md-1 c4box' id='c4"+j+i+"'>");
			c4box.click(function(){
				if(!$("#c4hoveranim").hasClass('nomove')){
					var c4move = Object();
					//c4move.row = j;
					c4move.col = parseInt(this.id.charAt(3));
					c4move.id = currRoom;
					console.log("Attempting to make move "+c4move.col);
					socket.emit('makeMove', JSON.stringify(c4move));
				}
			});

			c4box.hover(function(){
				if(!$("#c4hoveranim").hasClass('nomove')){
					$("#c4hoveranim").css('left', $("#"+this.id).position().left+'px');
					$("#c4hoveranim").css('top', '-20px');
				}
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
	ConnectFourRoom.resize();
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
		$("#c4hoveranim").hide();
		getRoomInfo(currRoom);
	}
}
ConnectFourRoom.resetRoom = function(msg){
	$("#game_messages").empty();
	getPlayerNum(currRoom);
	getRoomInfo(currRoom);
	$(".c4box").each(function(index){
		if($(this).hasClass("c4"+ConnectFourRoom.colors[0])||$(this).hasClass("c4"+ConnectFourRoom.colors[1])){
			var dropdiv = $("<div class='dropdiv'>");
			dropdiv.css('position', 'absolute');
			dropdiv.css('background-image', $(this).css('background-image'));
			dropdiv.css('height', $(this).css('height'));
			dropdiv.css('width', $(this).css('width'));
			dropdiv.css('top', $(this).position().top);
			dropdiv.css('left', $(this).position().left);
			dropdiv.css('background-size', 'contain');
			$("#active_game_div").append(dropdiv);
			$(this).css('background-image', 'none');
			var dropto = $("#connect_four_board").position().top = $("#connect_four_board").height();
			dropdiv.css('top', dropto+'px');
			dropdiv.css('opacity', '0');
		}
	});
	setTimeout(function(){
		ConnectFourRoom.buildRoom(msg.gameState);
	}, 800);
}
ConnectFourRoom.gameMessage = function(msg){
	var r = JSON.parse(msg);
	switch(r.message){
		case "gameStart":
			//add colors
			console.log("Game started");
			getPlayerNum(currRoom);
			setTimeout(function(){
				$("#c4hoveranim").css('background-image','url("res/c4'+ConnectFourRoom.colors[playernum]+'.png")');
			},100);
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
			$("#c4me span").css('border', '20px outset white');
			$("#c4opponent span").css('border-width', '0px');
			$("#c4hoveranim").show();
		break;
		case "opponentTurn":
			$("#c4opponent span").css('border', '20px outset white');
			$("#c4me span").css('border-width', '0px');
			//$("#c4hoveranim").hide();
		break;
		case "playerJoin":
			ConnectFourRoom.playerJoin([r.id, r.player]);
		break;
		case "playerLeave":
			ConnectFourRoom.playerLeave([r.id, r.playerName]);
		break;
		case "makeMove":
			ConnectFourRoom.makeMove(r.move);
		break;
		case "victory":
			ConnectFourRoom.victory(r);
		break;
		case "gameReset":
			ConnectFourRoom.resetRoom(r);
		break;
	}	
}
//changeme
ConnectFourRoom.colors = ["yellow", "blue"];
ConnectFourRoom.makeMove = function(received){
	//received.id, received.col, received.row, received.user (int 0 or 1)
	if(received.id!=currRoom){
		console.log("Error: received move for wrong game id");
		return false;
	}
	var target = $("#c4"+received.row+received.col);
	$("#c4hoveranim").addClass('nomove');
	var l = target.position().left;
	var t = target.position().top;
	$("#c4hoveranim").css('opacity', '1');
	$("#c4hoveranim").css('left', l+'px');
	$("#c4hoveranim").css('top', '-20px');
	$("#c4hoveranim").css('background-image','url("res/c4'+ConnectFourRoom.colors[received.user]+'.png")');
	$("#c4hoveranim").show();
	$("#c4hoveranim").animate({
		top: t+'px'
	}, 500,	function(){
		$("#c4hoveranim").removeClass('nomove');
		$("#c4hoveranim").css('opacity', '0.4');
		$("#c4hoveranim").css('top', '-20px');
		if(received.user==playernum){
			//at this point, the move was already made so flip flop
			$("#c4hoveranim").hide();
		}
		$("#c4hoveranim").css('background-image','url("res/c4'+ConnectFourRoom.colors[(received.user+1)%2]+'.png")');
		
		target.addClass('c4'+ConnectFourRoom.colors[received.user]);
		$.playSound('res/sounds/drop');
	});
}

ConnectFourRoom.victory = function(received){
	//received.id, received.user, received.details
	if(received.id!=currRoom){
		return false;
	}
	getRoomInfo(currRoom);

	setTimeout(function(){
		$("#c4hoveranim").hide();
		if(received.details[2]=="v"){
			for(var i=received.details[0];i<received.details[0]+4;i++){
				console.log("#c4"+i+received.details[1]);
				$("#c4"+i+received.details[1]).css('background-color', 'white');
			}
		}else if(received.details[2]=="h"){
			for(var i=received.details[1];i<received.details[1]+4;i++){
				$("#c4"+received.details[0]+i).css('background-color', 'white');
			}
		}else if(received.details[2]=="l"){
			var m = received.details[1];
			for(var i=received.details[0];i<received.details[0]+4;i++){
				$("#c4"+i+m).css('background-color', 'white');
				m--;
			}
		}else if(received.details[2]=="r"){
			var m = received.details[1];
			for(var i=received.details[0];i<received.details[0]+4;i++){
				$("#c4"+i+m).css('background-color', 'white');
				m++;
			}
		}

		var i = onlineUsers[0].indexOf(received.user);
		$("#game_messages").append($("<span style='color:"+onlineUsers[1][i]+"'>").text(onlineUsers[0][i]));
		$("#game_messages").append($("<span>").text(" won!"));
		var reset_btn = $("<a class='btn btn-default' href='#' role='button'>").text("Reset game");
		reset_btn.click(function(){
			socket.emit('requestReset', currRoom);
		});
		$("#game_messages").append($("<div>").append(reset_btn));
		$.playSound('res/sounds/win');
	}, 600);	
}