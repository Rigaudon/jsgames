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
var emotesEnabled = true;

function preloadImages(imgarr){
	for (var i = 0; i < imgarr.length; i++) {
		$("<img />").attr("src", imgarr[i]);
	}
}

//Lobby Code
var Lobby = Object();
Lobby.build = function(){
	
}

//Game Room code
//Uno
var UnoRoom = Object();
UnoRoom.selectedCard = null;
UnoRoom.myTurn = false;
UnoRoom.opHandSize = [];
UnoRoom.uno_btn_disabled = false;
UnoRoom.preloaded = false;
UnoRoom.joinedRoom = function(){
	if(!UnoRoom.preloaded){
		preloadImages(unoimglist);
		UnoRoom.preloaded = true;
	}
	$("#gameroombox").css('left', '-50%');
	$("#create_room_button").hide();
	$("#back_to_lobby").show();
	$("#active_game_div").css('left', '42.5%');
	$("#room_info").css('top', '85%');
	$("#game_messages").css('top','90%');
	getRoomInfo(currRoom);
	activeGame = "Uno";
}
UnoRoom.buildRoom = function(room){
	var active = $("#active_game_div");
	active.empty();
	var row1 = $("<div class='row uno_top_row'>");
	var divlen = 100/(room.players.length-1);
	for(var i=0;i<room.players.length;i++){
		var d = $("<div style='width:"+Math.floor(divlen)+"%;height:100%;float:left'>");
		var txt = room.players[i];
		var color = 'white';
		if(txt==usrname){
			continue;
		}
		if(!room.players[i]){
			txt = "Waiting...";
			d.append($("<div class='row uno_op_name'>").append($("<span style='color:"+color+"'>").text(txt)));	
			d.append($("<div class='row uno_op_hand hand0'>"));
		}else{
			color = onlineUsers[1][onlineUsers[0].indexOf(txt)];
			var colorspan = $("<span style='color:"+color+"'>").text(txt);
			var divrow = $("<div class='row uno_op_name' id='uno_op_"+i+"'>").append(colorspan);
			d.append(divrow);	
			d.append($("<div class='row uno_op_hand hand0' id='uno_op_hand_"+i+"'>"));
		}
		row1.append(d);
	}
	active.append(row1);
	var row2 = $("<div class='row uno_main_row'>");
	var padrow = $("<div class='row uno_pad_row'>");
	var padrow2 = $("<div class='row uno_pad_row'>");
	var cardrow = $("<div class='row uno_card_row'>");
	
	var deckimg = $("<img id='uno_deck' src='res/uno/deck.png'>");
	deckimg.hover(function(){
		deckimg.attr('src', 'res/uno/deckdraw.png');
	}, function(){
		deckimg.attr('src', 'res/uno/deck.png');
	});
	deckimg.click(function(){
		if(UnoRoom.myTurn){
			var toEmit = Object();
			toEmit.id = currRoom;
			toEmit.requestDraw = true;
			socket.emit('makeMove', JSON.stringify(toEmit));
		}
	});
	cardrow.append(deckimg);

	var discardimg = $("<img id='uno_discard' src='res/uno/blank.png'>");
	cardrow.append(discardimg);

	var unobtn = $("<a href='#' class='btn-big' id='uno_btn'>UNO</a>");
	unobtn.click(function(){
		if(!UnoRoom.uno_btn_disabled){
			var toEmit = Object();
			toEmit.callUno = true;
			toEmit.id = currRoom;
			socket.emit('makeMove', JSON.stringify(toEmit));
			UnoRoom.disableUnoBtn();
		}
	});
	cardrow.append(unobtn);
	
	var handrow = $("<div class='row uno_hand_row'>");
	row2.append(padrow);
	row2.append(cardrow);
	row2.append(padrow2);
	row2.append(handrow);
	active.append(row2);
	$(".uno_hand_row").sortable();
	$("#uno_discard").droppable({
		over: function(event, ui){
			$(this).css('height', '100%');
		},
		out: function(event, ui){
			$(this).css('height', '90%');
		},
		drop: function(event, ui){
			$(this).css('height', '90%');
			if(!UnoRoom.myTurn){
				return false;
			}
			if(UnoRoom.selectedCard){
				if(UnoRoom.selectedCard.color=="Wild"){
					$("#uno_wild_picker .panel-body").empty();
					$("#uno_wild_picker").show();
					var draw4 = "";
					if(UnoRoom.selectedCard.value=="Draw 4"){
						draw4 = "draw4";
					}
					var red = $("<img src='res/uno/wild"+draw4+"red.png' class='uno_picker_card'>");
					red.click(function(){ 
						UnoRoom.selectedCard.selectedColor = "Red";
					});
					var yellow = $("<img src='res/uno/wild"+draw4+"yellow.png' class='uno_picker_card'>");
					yellow.click(function(){ 
						UnoRoom.selectedCard.selectedColor = "Yellow"; 
					});
					var green = $("<img src='res/uno/wild"+draw4+"green.png' class='uno_picker_card'>");
					green.click(function(){ 
						UnoRoom.selectedCard.selectedColor = "Green"; 
					});
					var blue = $("<img src='res/uno/wild"+draw4+"blue.png' class='uno_picker_card'>");
					blue.click(function(){ 
						UnoRoom.selectedCard.selectedColor = "Blue"; 
					});
					$("#uno_wild_picker .panel-body").append(red);
					$("#uno_wild_picker .panel-body").append(yellow);
					$("#uno_wild_picker .panel-body").append(green);
					$("#uno_wild_picker .panel-body").append(blue);
					$(".uno_picker_card").click(function(){
						$("#uno_wild_picker a.close_btn").click();
						var toEmit = Object();
						toEmit.id = currRoom;
						toEmit.card = Object();
						toEmit.card.color = UnoRoom.selectedCard.color;
						toEmit.card.value = UnoRoom.selectedCard.value;
						toEmit.card.selectedColor = UnoRoom.selectedCard.selectedColor;
						socket.emit('makeMove', JSON.stringify(toEmit));
					});

				}else{
					var toEmit = Object();
					toEmit.id = currRoom;
					toEmit.card = Object();
					toEmit.card.color = UnoRoom.selectedCard.color;
					toEmit.card.value = UnoRoom.selectedCard.value;
					socket.emit('makeMove', JSON.stringify(toEmit));
				}
			}
		}
	});

	var uno_wild_picker = $("<div class='box panel panel-default' id='uno_wild_picker'>");
	var close_btn = $('<a href="#" class="close_btn btn btn-default glyphicon glyphicon-remove">');
	close_btn.click(function(){
		$("#uno_wild_picker").hide();
	});
	uno_wild_picker.append(close_btn);
	uno_wild_picker.append($("<div class='panel-heading'>").text('Choose one'));
	uno_wild_picker.append($("<div class='panel-body'>"));
	active.append(uno_wild_picker);
}
UnoRoom.leaveRoom = function(){
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
}
UnoRoom.disableUnoBtn = function(){
	UnoRoom.uno_btn_disabled = true;
	$("#uno_btn").addClass('disabled');
	console.log("HI");
	setTimeout(function(){
		UnoRoom.enableUnoBtn();
	}, 4000);
}
UnoRoom.enableUnoBtn = function(){
	$("#uno_btn").removeClass('disabled');
	UnoRoom.uno_btn_disabled = false;
}
UnoRoom.playerJoin = function(received){
	if(currRoom==received[0] && received[1]!=usrname){
		var added = false;
		$(".uno_op_name").each(function(index){
			if(!this.id && !added){
				this.id = "uno_op_"+received[2];
				var color = onlineUsers[1][onlineUsers[0].indexOf(received[1])];
				$(this).empty();
				$(this).append($("<span style='color:"+color+"'>").text(received[1]));
				$(this).next().attr('id', 'uno_op_hand_'+received[2]);
				added = true;
			}
		});

	 	getRoomInfo(currRoom);

	 }
}
UnoRoom.playerLeave = function(received){
	if(currRoom==received[0]){
		var target = $("#uno_op_"+received[2]);
		target.empty();
		target.text("Waiting...");
		target.removeAttr('id');
		target.next().removeAttr('id');
		target.next().removeClass('hand'+UnoRoom.opHandSize[received[2]]);
		target.next().addClass('hand0');
		UnoRoom.opHandSize[received[2]] = 0;
	}
}
UnoRoom.removeMyCard = function(card){
	var src = card.color.toLowerCase()+card.value.toLowerCase().replace(" ", "");
	var removed = false;
	$(".uno_hand_row img").each(function(index){
		if($(this).attr('src')=='res/uno/'+src+'.png' && !removed){
			$(this).remove();
			removed = true;
		}
	});
}
UnoRoom.gameMessage = function(msg){
	var r = JSON.parse(msg);
	switch(r.message){
		case 'gameStart':
			UnoRoom.opHandSize = [];
			getRoomInfo(currRoom);
		break;
		case 'idraw':
			var orig = $("#uno_deck").position();
			var h = $("#uno_deck").height();
			//this assumes 20px margins;;
			var animimg= $("<img class='transition-fast' src='res/uno/"+r.color.toLowerCase()+r.value.toLowerCase().replace(" ", '')+".png' style='position:absolute;top:"+orig.top+"px;left:+"+(orig.left+20)+"px' height='"+h+"px'>");
			$("#active_game_div").append(animimg);
			animimg.css('left', $(".uno_hand_row").position().left+"px");
			animimg.css('top', $(".uno_hand_row").position().top+"px");
			animimg.css('height', $(".uno_hand_row").height()/2+"px");
			setTimeout(function(){
				animimg.remove(); 
				var staticimg = $("<img src='res/uno/"+r.color.toLowerCase()+r.value.toLowerCase().replace(" ", '')+".png'>");
				staticimg.mousedown(function(){
					UnoRoom.selectedCard = Object();
					UnoRoom.selectedCard.value = r.value;
					UnoRoom.selectedCard.color = r.color;
					UnoRoom.selectedCard.dom = staticimg;
				});
				$(".uno_hand_row").prepend(staticimg);
			}, 300);		
		break;
		case 'playerdraw':
			var orig = $("#uno_deck").position();
			var h = $("#uno_deck").height();
			//this assumes 20px margins;;
			var animimg= $("<img class='dropdiv' src='res/uno/cardback.png' style='position:absolute;top:"+orig.top+"px;left:+"+(orig.left+20)+"px' height='"+h+"px'>");
			$("#active_game_div").append(animimg);
			animimg.css('left', ($("#uno_op_"+r.player).position().left+$("#uno_op_"+r.player).width()/2)+"px");
			animimg.css('top', $("#uno_op_"+r.player).position().top+"px");
			animimg.css('height', $(".uno_hand_row").height()/2+"px");
			setTimeout(function(){
				animimg.remove();
				if(!UnoRoom.opHandSize[r.player] || UnoRoom.opHandSize[r.player]==0){
					UnoRoom.opHandSize[r.player] = 1;
					$("#uno_op_hand_"+r.player).removeClass('hand0');
					$("#uno_op_hand_"+r.player).addClass('hand1');
				}else if(UnoRoom.opHandSize[r.player]<8){
					$("#uno_op_hand_"+r.player).removeClass('hand'+UnoRoom.opHandSize[r.player]);
					UnoRoom.opHandSize[r.player]++;
					$("#uno_op_hand_"+r.player).addClass('hand'+UnoRoom.opHandSize[r.player]);
				}else{
					UnoRoom.opHandSize[r.player]++;
				}
			}, 800);
		break;
		case 'firstCard':
			var orig = $("#uno_deck").position();
			var h = $("#uno_deck").height();
			//this assumes 20px margins;;
			var imgname = r.card.color.toLowerCase() + r.card.value.replace(" ", "").toLowerCase();
			var animimg= $("<img class='dropdiv' src='res/uno/"+imgname+".png' style='position:absolute;top:"+orig.top+"px;left:+"+(orig.left+20)+"px' height='"+h+"px'>");
			$("#active_game_div").append(animimg);
			//also assumes 20px margins
			animimg.css('left', $("#uno_discard").position().left+20);
			setTimeout(function(){
				animimg.remove();
				$("#uno_discard").attr('src', 'res/uno/'+imgname+'.png');
			}, 800);
		break;
		case 'yourTurn':
			UnoRoom.myTurn = true;
			$(".uno_active").removeClass("uno_active");
			$(".uno_hand_row").addClass("uno_active");
		break;
		case 'opponentTurn':
			UnoRoom.myTurn = false;
			$(".uno_active").removeClass("uno_active");
			$("#uno_op_"+r.player).addClass("uno_active");
		break;
		case 'makeMove':
			var imgname;
			if(r.card.color=="Wild"){
				if(r.card.value=="Draw 4"){
					imgname = 'wilddraw4'+r.card.selectedColor.toLowerCase();
				}else{
					imgname = 'wild'+r.card.selectedColor.toLowerCase();
				}
			}else{
				imgname = r.card.color.toLowerCase()+r.card.value.toLowerCase().replace(" ", "");
			}
			
			if(r.player!=playernum){
				var l = ($("#uno_op_"+r.player).position().left+$("#uno_op_"+r.player).width()/2);
				var t = $("#uno_op_"+r.player).position().top;
				var h = $(".uno_hand_row").height()/2;
				//this assumes 20px margins;;
				var animimg= $("<img class='dropdiv' src='res/uno/"+imgname+".png' style='position:absolute;top:"+t+"px;left:+"+l+"px' height='"+h+"px'>");
				$("#active_game_div").append(animimg);

				var orig = $("#uno_discard").position();
				animimg.css('left', (orig.left+20)+"px");
				animimg.css('top', orig.top+"px");
				animimg.css('height',  $("#uno_deck").height()+"px");
				setTimeout(function(){
					animimg.remove();
					if(UnoRoom.opHandSize[r.player]<=8){
						$("#uno_op_hand_"+r.player).removeClass('hand'+UnoRoom.opHandSize[r.player]);
						UnoRoom.opHandSize[r.player]--;
						$("#uno_op_hand_"+r.player).addClass('hand'+UnoRoom.opHandSize[r.player]);
					}else{
						UnoRoom.opHandSize[r.player]--;
					}
					$("#uno_discard").attr('src', 'res/uno/'+imgname+'.png');
				}, 800);

			}else{
				$("#uno_discard").attr('src', 'res/uno/'+imgname+'.png');
				UnoRoom.removeMyCard(r.card);
			}
		break;
		case 'victory':
			getRoomInfo(currRoom);
			var i = onlineUsers[0].indexOf(r.playerName);
			$("#game_messages").append($("<span style='color:"+onlineUsers[1][i]+"'>").text(onlineUsers[0][i]));
			$("#game_messages").append($("<span>").text(" won!"));
			UnoRoom.myTurn = false;
		break;
		case 'callUno':
			var yell_uno = $("<div class='yell_uno'>").text("UNO!");
			var outerwidth = 290/2;
			if(r.player!=playernum){
				var l = ($("#uno_op_"+r.player).position().left+$("#uno_op_"+r.player).outerWidth()/2)-outerwidth/2;
				var t = $("#uno_op_"+r.player).position().top;
				yell_uno.css('top', t+'px');
				yell_uno.css('left', l+'px');
			}else{
				var l = $(".uno_hand_row").position().left+$(".uno_hand_row").outerWidth()/2-outerwidth;
				var t = $(".uno_hand_row").position().top;
				yell_uno.css('top', t+'px');
				yell_uno.css('left', l+'px');
			}
			$("#active_game_div").append(yell_uno);
			yell_uno.css('top', ($("#active_game_div").height()/2-200)+'px');
			yell_uno.css('left', ($("#active_game_div").width()/2-outerwidth)+'px');
			yell_uno.css('opacity', '0');
			setTimeout(function(){
				yell_uno.remove();
			}, 1500);
		break;
		case 'playerJoin':
			UnoRoom.playerJoin([r.id, r.playerName, r.player]);
		break;
		case 'playerLeave':
			UnoRoom.playerLeave([r.id, r.playerName, r.player]);
		break;
	}
}
//Connect Four
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
		var r = $("<div class='row c4row'>")
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
	}, 600);	
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

	if(msgbox[0].scrollHeight-msgbox.scrollTop()==msgbox.outerHeight()){
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
			$("#gameModal").modal('hide');
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
	var tb = $("#gameroomtable tbody");
	tb.empty();
	tb.append($('<tr id="placeholder"><td colspan="6">No games to display</td></tr>'));
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
		case "Uno":
		UnoRoom.buildRoom(r);
		UnoRoom.joinedRoom();
		break;
	}

});

socket.on('joinRoomFailure', function(msg){

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
	}else if(activeGame=="Uno"){
		UnoRoom.gameMessage(msg);
	}
});

socket.on('playerNum', function(msg){
	console.log("Player number "+msg);
	playernum = msg;
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
	tr.append($("<td>").text(room.status));
	//tr.append($("<td>").text(room.players));
	tr.append(playersColor(room.players));
	var joinbutton = $("<a class='btn btn-primary' href='#' role='button'>").text("Join Game");
	joinbutton.click(function(){
		socket.emit('joinRoom', room.id);
		console.log("Attempting to join room "+room.id);
	});
	if(room.status=="Waiting for Players"){
		tr.append($("<td>").append(joinbutton));
	}else{
		tr.append($("<td>").text("Started"));
	}
	gameRooms[room.id] = tr;
	gameRooms.active++;
	$('#gameroomtable > tbody:last-child').append(tr);
	$("#placeholder").hide();

	function playersColor(players){
		var td = $("<td>");
		for(var i=0;i<players.length;i++){
			if(players[i]){
				var k = onlineUsers[0].indexOf(players[i]);
				td.append($("<span>").css('color',onlineUsers[1][k]).text(onlineUsers[0][k]+" "));		
			}
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

function processChatMessage(jqelem){
	var txt = jqelem.text();
	if(emotesEnabled && typeof emoteList != "undefined"){
		var path = "res/emotes/";
		for(var i=0;i<emoteList.length;i++){
			txt = txt.replace(new RegExp(emoteList[i], "g"), "<img title='"+emoteList[i]+"' src='"+path+emoteList[i]+".png' />");
		}
		jqelem.html(txt);
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
//todo: move these into builder

//bring up settings screen
$("#settings_btn a").click(function(){
	$("#emoteSwitch").bootstrapSwitch({onColor:'success', offColor:'danger'});
	$("#emoteSwitch").on('switchChange.bootstrapSwitch', function(event, state){
		emotesEnabled = state;
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
			}else{
				error = "Please select a game/players.";
			}
		}else{
			error = "Invalid room password!";
		}
	}else{
		error = "Invalid room name!";
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
		case "Uno":
		UnoRoom.leaveRoom();
		break;
	}
});

$(".colorpicker button").click(function(){
	for(k in colors){
		if($(this).hasClass("btn-"+colors[k])){
			$("#chatname").removeClass('label-'+colors[myColor]);
			myColor = k;
			socket.emit('choosecolor', myColor);
			$("#chatname").addClass('label-'+colors[myColor]);
			break;
		}
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
game_players["Uno"] = [2,3,4,5,6];
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
	preloadImages(emoteimglist);
});