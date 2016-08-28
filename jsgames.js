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
var soundsEnabled = false;
var emoteList = [];
var roomStatus = null;

function preloadImages(imgarr){
	for (var i = 0; i < imgarr.length; i++) {
		$("<img />").attr("src", imgarr[i]);
	}
}

(function($){
  $.extend({
    playSound: function(){
      if(soundsEnabled){
      	return $(
        '<audio autoplay="autoplay" style="display:none;">'
	          + '<source src="' + arguments[0] + '.mp3" />'
	          + '<embed src="' + arguments[0] + '.mp3" hidden="true" autostart="true" loop="false" class="playSound" />'
	        + '</audio>'
	      ).appendTo('body');
      }
    }
  });

})(jQuery);

//Lobby Code
var Lobby = Object();
Lobby.build = function(){
	//implement me
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
	roomStatus = null;
}
UnoRoom.disableUnoBtn = function(){
	UnoRoom.uno_btn_disabled = true;
	$("#uno_btn").addClass('disabled');
	console.log("HI");;
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
			$.playSound('res/sounds/card');
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
			$.playSound('res/sounds/card');
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
			$.playSound('res/sounds/card');
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
			UnoRoom.enableUnoBtn();
		break;
		case 'opponentTurn':
			UnoRoom.myTurn = false;
			$(".uno_active").removeClass("uno_active");
			$("#uno_op_"+r.player).addClass("uno_active");
			UnoRoom.enableUnoBtn();
		break;
		case 'makeMove':
			var imgname;
			$.playSound('res/sounds/card');
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
			$.playSound('res/sounds/win');
		break;
		case 'callUno':
			var yell_uno = $("<div class='yell_uno'>").text("UNO!");
			var outerwidth = 290/2;
			$.playSound('res/sounds/buzz');
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

var DrawRoom = Object();
DrawRoom.myTurn;
DrawRoom.context;
DrawRoom.canvas;
DrawRoom.topContext;
DrawRoom.overlayContext;
DrawRoom.selectedColor;
DrawRoom.brushSize;
DrawRoom.transactions;
DrawRoom.currTransaction;
DrawRoom.tool;
DrawRoom.playerScores;
DrawRoom.numPlayers;
DrawRoom.countdown = 5;
DrawRoom.turnTime = 60;
DrawRoom.timersize = 40;
DrawRoom.timerPositionOffset = 10;
DrawRoom.timerid;

DrawRoom.joinedRoom = function(){
	$("#gameroombox").css('left', '-50%');
	$("#create_room_button").hide();
	//$("#back_to_lobby").show();
	$("#active_game_div").css('width', '85%');
	$("#active_game_div").css('left', '32.5%');
	$("#room_info").css('left', '77.5%');
	$("#room_info").css('top', '85%');
	//$("#game_messages").css('top','90%');
	getRoomInfo(currRoom);
	$("#onlinebox").css('left', '0%');
	$("#chatmain").css('left', '125%');
	$("#creategamebox").css('top', '105%');
	activeGame = "Draw My Thing";
}
DrawRoom.leaveRoom = function(){
	$("#active_game_div").css('left', '150%');
	//$("#back_to_lobby").hide();
	$("#create_room_button").show();
	$("#gameroombox").css('left', '42.5%');
	$("#room_info").css('top', '105%');
	$("#room_info").css('left', '56.5%');
	//$("#game_messages").css('top', '105%');
	//$("#game_messages").empty();
	$("#onlinebox").css('left', '25%');
	$("#chatmain").css('left', '105%');
	$("#active_game_div").css('width', '60%');
	$("#creategamebox").css('top', '87%');
	socket.emit('leaveRoom', currRoom);
	activeGame = null;
	currRoom = null;
	playernum = null;
	roomStatus = null;
	DrawRoom.myTurn = false;
	DrawRoom.context = null;
	DrawRoom.canvas = null;
	DrawRoom.topContext = null;
	DrawRoom.selectedColor = "#000000";
	DrawRoom.brushSize = 8;
	DrawRoom.transactions = Array();
	DrawRoom.currTransaction = Object();
	DrawRoom.tool = "line";
}
DrawRoom.buildRoom = function(received, players){
	var active = $("#active_game_div");
	active.empty();
	DrawRoom.myTurn = false; 
	DrawRoom.context = null;
	DrawRoom.canvas = null;
	DrawRoom.topContext = null;
	DrawRoom.selectedColor = "#000000";
	DrawRoom.brushSize = 8;
	DrawRoom.transactions = Array();
	DrawRoom.currTransaction = Object();
	DrawRoom.tool = "line";
	DrawRoom.numPlayers = parseInt(received.maxPlayers);
	var border = 20; // changeme

	var drawingCanvas = $("<canvas id='drawcanvas' width='1000' height='800' />");
	var borderX = drawingCanvas.css("border-left-width");
	var borderY = drawingCanvas.css("border-top-width");

	var topLayer = $("<canvas id='toplayer' width='1000' height='800' />");
	var overlayLayer = $("<canvas id='overlaylayer' width='1000' height='800' />");
	overlayLayer.mousedown(function(e){
		if(DrawRoom.myTurn){
			var rect = DrawRoom.canvas.getBoundingClientRect(); //changeme: move so not called so much
			var mouseX = e.clientX - rect.left - border;
			var mouseY = e.clientY - rect.top - border;
			if(DrawRoom.tool=="line"){
				DrawRoom.currTransaction.type = "line";
				DrawRoom.currTransaction.x = mouseX;
				DrawRoom.currTransaction.y = mouseY;
				DrawRoom.currTransaction.arrayX = Array();
				DrawRoom.currTransaction.arrayY = Array();
				DrawRoom.currTransaction.brushSize = DrawRoom.brushSize;
				DrawRoom.currTransaction.color = DrawRoom.selectedColor; //?changeme
			}else if(DrawRoom.tool=="fill"){
				DrawRoom.currTransaction.type = "fill";
				DrawRoom.currTransaction.x = mouseX;
				DrawRoom.currTransaction.y = mouseY;
				DrawRoom.currTransaction.color = DrawRoom.selectedColor; //?changeme
				DrawRoom.doFill(DrawRoom.currTransaction);
				DrawRoom.killCurrentTransaction();
			}else if(DrawRoom.tool=="eraser"){
				DrawRoom.currTransaction.type = "line";
				DrawRoom.currTransaction.x = mouseX;
				DrawRoom.currTransaction.y = mouseY;
				DrawRoom.currTransaction.arrayX = Array();
				DrawRoom.currTransaction.arrayY = Array();
				DrawRoom.currTransaction.brushSize = DrawRoom.brushSize;
				DrawRoom.currTransaction.color = "#FFFFFF";
			}
		} 
	});

	overlayLayer.mousemove(function(e){
		if(DrawRoom.myTurn){
			if(DrawRoom.currTransaction.type=="line" || DrawRoom.currTransaction.type=="eraser"){
				var rect = DrawRoom.canvas.getBoundingClientRect();
				var mouseX = e.clientX - rect.left - border;
				var mouseY = e.clientY - rect.top - border;
				DrawRoom.currTransaction.arrayX.push(mouseX);
				DrawRoom.currTransaction.arrayY.push(mouseY);
				DrawRoom.drawLineTick();
			}
			if(DrawRoom.tool=="line"){
				var rect = DrawRoom.canvas.getBoundingClientRect();
				var mouseX = e.clientX - rect.left - border;
				var mouseY = e.clientY - rect.top - border;
				DrawRoom.drawPreviewBrush(mouseX, mouseY);
			}
		}
	});
	
	overlayLayer.mouseup(function(e){
		if(DrawRoom.myTurn){
			DrawRoom.killCurrentTransaction();
		}
	});

	overlayLayer.mouseleave(function(e){
		if(DrawRoom.myTurn && DrawRoom.currTransaction.arrayX && DrawRoom.currTransaction.arrayX.length > 0){
			DrawRoom.killCurrentTransaction();
		}
	});


	active.append($("<div>").append(drawingCanvas).append(topLayer).append(overlayLayer));
	
	var optionsDiv = $("<div id='drawOptions' class='panel panel-default'>");
	optionsDiv.append($("<div class='panel-heading'>").text("Options"));

	var optionsBody = $("<div class='panel-body'>");

	optionsBody.append($("<div class='option-label'>").text("Tools"));
	var toolsDiv = $("<div id='drawToolsDiv'>");
	var tools1 = $("<div class='btn-group'>");

	var brushTool = $("<button type='button' class='btn btn-default'><img src='res/dmt/brush.png'/></button>");
	brushTool.click(function(e){
		if(!DrawRoom.myTurn){
			return false;
		}
		DrawRoom.tool = "line";
		overlayLayer.css('cursor', 'none');
	});
	tools1.append(brushTool);

	var fillTool = $("<button type='button' class='btn btn-default'><img src='res/dmt/fill.png'/></button>");
	fillTool.click(function(e){
		if(!DrawRoom.myTurn){
			return false;
		}
		DrawRoom.tool = "fill";
		DrawRoom.topContext.clearRect(0, 0, DrawRoom.topContext.canvas.width, DrawRoom.topContext.canvas.height);		
		overlayLayer.css('cursor', 'url("res/dmt/fillsmall.png"), default');
	});
	tools1.append(fillTool);

	var eraserTool = $("<button type='button' class='btn btn-default'><img src='res/dmt/eraser.png'/></button>");
	eraserTool.click(function(e){
		if(!DrawRoom.myTurn){
			return false;
		}
		DrawRoom.tool = "eraser";
		DrawRoom.topContext.clearRect(0, 0, DrawRoom.topContext.canvas.width, DrawRoom.topContext.canvas.height);		
		overlayLayer.css('cursor', 'url("res/dmt/erasersmall.png"), default');
	});
	tools1.append(eraserTool);
	toolsDiv.append(tools1);

	toolsDiv.append("&nbsp;");
	
	var tools2 = $("<div class='btn-group'>");
	var undoTool = $("<button type='button' class='btn btn-default'><img src='res/dmt/undo.png'/></button>");
	undoTool.click(function(e){
		if(!DrawRoom.myTurn){
			return false;
		}
		DrawRoom.topContext.clearRect(0, 0, DrawRoom.topContext.canvas.width, DrawRoom.topContext.canvas.height);		
		DrawRoom.undoLastTransaction();
	});
	tools2.append(undoTool);

	var clearTool = $("<button type='button' class='btn btn-default'><img src='res/dmt/clear.png'/></button>");
	clearTool.click(function(e){
		if(!DrawRoom.myTurn){
			return false;
		}
		DrawRoom.topContext.clearRect(0, 0, DrawRoom.topContext.canvas.width, DrawRoom.topContext.canvas.height);
		var toEmit = Object();
		toEmit.id = currRoom;
		toEmit.event = "draw";
		toEmit.type = "clear";
		socket.emit("makeMove", JSON.stringify(toEmit));
		
		DrawRoom.clearCanvas();
	});
	tools2.append(clearTool);

	toolsDiv.append(tools2);
	optionsBody.append(toolsDiv);

	optionsBody.append($("<div class='option-label'>").text("Brush Size"));
	var sizeSlider = $("<div id='drawSlider'>");
	optionsBody.append(sizeSlider);	

	optionsBody.append($("<div class='option-label'>").text("Color"));
	var colorPicker = $("<input id='drawColor' value='"+DrawRoom.selectedColor+"' type='button' />");
	optionsBody.append(colorPicker);

	var backBtn = $("<button role='button'><span class='glyphicon glyphicon-home' style='float:left' aria-hidden='true'></span>Exit Game Room</button>");
	backBtn.css('width', '90%');
	backBtn.css('color', 'black');
	backBtn.css('margin-top', '30px');
	backBtn.css('font-size', '25px');
	backBtn.css('padding-top', '8px');
	backBtn.click(function(){
		$("#back_to_lobby").click();
	});
	optionsBody.append(backBtn);

	optionsDiv.append(optionsBody);
	active.append(optionsDiv);

	var playerListDiv = $("<div class='panel panel-default drawplayers'>");
	playerListDiv.append($("<div class='panel-heading'>").text("Players"));
	playerListDiv.append($("<div class='panel-body' id='drawPlayers'>").css('height', '80%'));
	active.append(playerListDiv);

	var answerDiv = $("<div class='panel panel-default drawguesses'>");
	answerDiv.append($("<div class='panel-heading'>").text("Guesses"));
	var guessesChat = $("<div id='drawGuesses' class='panel-body'>");
	guessesChat.append($("<ul id='drawMessageList' class='messageList'></ul>").css('height', '88%'));
	guessesChat.append('<div class="input-group"><span class="input-group-addon">Guess:</span><input id="drawguess" autocomplete="off" style="height:35px" class="form-control inputMessage" type="text" placeholder="Enter guess..."/></div>');
	answerDiv.append(guessesChat);
	active.append(answerDiv);

	$("#drawguess").bind('keypress', function(e){
		if(e.keyCode==13){
			//Enter
			var toEmit = Object();
			toEmit.id = currRoom;
			toEmit.event = "guess";
			toEmit.value = this.value;
			socket.emit('makeMove', JSON.stringify(toEmit));
			this.value = "";
		}
	});

	$("#drawSlider").slider({
		max: 30,
		min: 1,
		step: 1,
		value: 8,
		change: function(event, ui){
			DrawRoom.brushSize = $(this).slider("value");
			//$("#drawBrushSize").text(DrawRoom.brushSize);
		}
	});
	$("#drawColor").colorPicker({
		init: function(elm, colors) { 
			elm.style.backgroundColor = elm.value;
		},
		actionCallback: function(e, action){
			DrawRoom.selectedColor = $("#drawColor").attr("value");
		},
		memoryColors: [	{r:255, g:0, b:0},
						{r:255, g:150, b:0},
						{r:255, g:255, b:0},
						{r:0, g:255, b:0},
						{r:0, g:255, b:255},
						{r:0, g:0, b:255},
						{r:255, g:0, b:255},
						{r:255, g:255, b:255}
						],
		size:2,
		resizeable:false
	});
	DrawRoom.canvas = document.getElementById("drawcanvas");
	DrawRoom.context = DrawRoom.canvas.getContext("2d");
	DrawRoom.topContext = document.getElementById("toplayer").getContext("2d");
	DrawRoom.overlayContext = document.getElementById("overlaylayer").getContext("2d");
	console.log(players);
	for(var i=0; i<players.length; i++){
		if(players[i]){
			DrawRoom.addPlayer(players[i], i);
		}
	}

	setTimeout(function(){ DrawRoom.resize(); }, 1000);
}

DrawRoom.resize = function(){
	var p = $("#drawcanvas").position();
	$("#toplayer").css('top', p.top);
	$("#toplayer").css('left', p.left);
	$("#overlaylayer").css('top', p.top);
	$("#overlaylayer").css('left', p.left);
}

DrawRoom.killCurrentTransaction = function(){
	if(DrawRoom.currTransaction.type=="line" || DrawRoom.currTransaction.type=="eraser"){
		if(DrawRoom.currTransaction.arrayX && DrawRoom.currTransaction.arrayX.length > 0){
			DrawRoom.transactions.push(DrawRoom.currTransaction);

			var toEmit = Object();
			toEmit.id = currRoom;
			toEmit.event = "draw";
			toEmit.type = "line";
			toEmit.arrayX = DrawRoom.currTransaction.arrayX;
			toEmit.arrayY = DrawRoom.currTransaction.arrayY;
			toEmit.x = DrawRoom.currTransaction.x;
			toEmit.y = DrawRoom.currTransaction.y;
			toEmit.brushSize = DrawRoom.brushSize;

			if(DrawRoom.currTransaction.type=="eraser"){
				toEmit.color = "white";
			}else{
				toEmit.color = DrawRoom.currTransaction.color;
			}
			socket.emit('makeMove', JSON.stringify(toEmit));
		}
		DrawRoom.currTransaction = Object();
	}else if(DrawRoom.currTransaction.type=="fill"){
		var toEmit = Object();
		toEmit.id = currRoom;
		toEmit.event = "draw";
		toEmit.type = "fill";
		toEmit.x = DrawRoom.currTransaction.x;
		toEmit.y = DrawRoom.currTransaction.y;
		toEmit.color = DrawRoom.currTransaction.color;
		socket.emit('makeMove', JSON.stringify(toEmit));

		DrawRoom.transactions.push(DrawRoom.currTransaction);
		DrawRoom.currTransaction = Object();
	}
}

DrawRoom.undoLastTransaction = function(){
	if(DrawRoom.transactions.length > 0){
		DrawRoom.transactions.pop();
		DrawRoom.redraw();
		
		var toEmit = Object();
		toEmit.id = currRoom;
		toEmit.event = "draw";
		toEmit.type = "undo";
		socket.emit("makeMove", JSON.stringify(toEmit));
	}
}

DrawRoom.drawPreviewBrush = function(x, y){
	if(!DrawRoom.topContext){
		return false;
	}
	
	DrawRoom.topContext.clearRect(0, 0, DrawRoom.topContext.canvas.width, DrawRoom.topContext.canvas.height);		
	DrawRoom.topContext.beginPath();
	DrawRoom.topContext.moveTo(x-1, y);
	DrawRoom.topContext.lineJoin = "round";
	DrawRoom.topContext.lineTo(x, y);
	DrawRoom.topContext.closePath();
	DrawRoom.topContext.strokeStyle = DrawRoom.selectedColor;
	DrawRoom.topContext.lineWidth = DrawRoom.brushSize;
	DrawRoom.topContext.stroke();
}

DrawRoom.clearCanvas = function(){
	DrawRoom.context.fillStyle = "white";
	DrawRoom.context.fillRect(0, 0, DrawRoom.context.canvas.width, DrawRoom.context.canvas.height);
	var clearTrans = Object();
	clearTrans.type = "clear";
	DrawRoom.transactions.push(clearTrans);
}

DrawRoom.clearTopCanvas = function(){
	var tmp = DrawRoom.topContext.fillStyle;
	DrawRoom.topContext.fillStyle = "white";
	DrawRoom.topContext.fillRect(0, 0, DrawRoom.topContext.canvas.width, DrawRoom.topContext.canvas.height);
	DrawRoom.topContext.fillStyle = tmp;
}

DrawRoom.clearOverlayCanvas = function(){
	var tmp = DrawRoom.overlayContext.fillStyle;
	DrawRoom.overlayContext.fillStyle = "white";
	DrawRoom.overlayContext.clearRect(0, 0, DrawRoom.overlayContext.canvas.width, DrawRoom.overlayContext.canvas.height);
	DrawRoom.overlayContext.fillStyle = tmp;
}

DrawRoom.matchStartColor = function(colorLayer, pixelPos, startColor){
	var r = colorLayer.data[pixelPos];
	var g = colorLayer.data[pixelPos+1];
	var b = colorLayer.data[pixelPos+2];
	var thresh = 0;
	return Math.abs(r-startColor[0])<=thresh && Math.abs(g-startColor[1])<=thresh && Math.abs(b-startColor[2])<=thresh;
}

DrawRoom.colorPixel = function(colorLayer, pixelPos, color){
	colorLayer.data[pixelPos] = color[0];
	colorLayer.data[pixelPos+1] = color[1];
	colorLayer.data[pixelPos+2] = color[2];
	colorLayer.data[pixelPos+3] = 255;
}

DrawRoom.hexToRgb = function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

DrawRoom.doFill = function(transaction){
	var pixelStack = [[Math.round(transaction.x), Math.round(transaction.y)]];
	var canvasWidth = DrawRoom.context.canvas.width;
	var canvasHeight = DrawRoom.context.canvas.height;
	var imgdata = DrawRoom.context.getImageData(transaction.x, transaction.y, 1, 1).data;
	var startColor = [imgdata[0], imgdata[1], imgdata[2]];
	var curColorHex = DrawRoom.hexToRgb(transaction.color);
	if(startColor[0]==curColorHex[0] && startColor[1]==curColorHex[1] && startColor[2]==curColorHex[2]){
		return;
	}
	var colorLayer = DrawRoom.context.getImageData(0, 0, canvasWidth, canvasHeight);
	while(pixelStack.length){
		var newPos, x, y, pixelPos, reachLeft, reachRight;
		newPos = pixelStack.pop();
		x = newPos[0];
		y = newPos[1];
		pixelPos = (y*canvasWidth+x)*4;
		while(y-- >= 0 && DrawRoom.matchStartColor(colorLayer, pixelPos, startColor)){
			pixelPos -= canvasWidth*4;
		}
		pixelPos += canvasWidth*4;
		++y;
		reachLeft = false;
		reachRight = false;
		while(y++ < canvasHeight-1 && DrawRoom.matchStartColor(colorLayer, pixelPos, startColor)){
			DrawRoom.colorPixel(colorLayer, pixelPos, curColorHex);
			if(x>0){
				if(DrawRoom.matchStartColor(colorLayer, pixelPos-4, startColor)){
					if(!reachLeft){
						pixelStack.push([x-1, y]);
						reachLeft = true;
					}
				}else if(reachLeft){
					reachLeft = false;
				}
			}

			if(x < canvasWidth-1){
				if(DrawRoom.matchStartColor(colorLayer, pixelPos+4, startColor)){
					if(!reachRight){
						pixelStack.push([x+1, y]);
						reachRight = true;
					}
				}else if(reachRight){
					reachRight = false;
				}
			}
			pixelPos += canvasWidth*4;

		}
	}
	DrawRoom.context.putImageData(colorLayer, 0, 0);
}

DrawRoom.redraw = function(){ 
	if(!DrawRoom.context || DrawRoom.transactions.length==0){
		return false;
	}
	DrawRoom.context.fillStyle = "white";
	DrawRoom.context.fillRect(0, 0, DrawRoom.context.canvas.width, DrawRoom.context.canvas.height);	
	DrawRoom.context.lineJoin = "round";	
	var i = DrawRoom.transactions.length-1;
	while(i>0 && DrawRoom.transactions[i].type != "clear"){
		i--;
	}
	for(; i < DrawRoom.transactions.length; i++) {
		var currTrans = DrawRoom.transactions[i];
		if(currTrans.type=="line"){
			DrawRoom.context.lineWidth = currTrans.brushSize;
			DrawRoom.context.strokeStyle = currTrans.color;
			DrawRoom.context.beginPath();

			DrawRoom.context.moveTo(currTrans.arrayX[0]-1, currTrans.arrayY[0]);
			DrawRoom.context.lineTo(currTrans.arrayX[0], currTrans.arrayY[0]);
			for(var j=1; j<currTrans.arrayX.length; ++j){
				DrawRoom.context.lineTo(currTrans.arrayX[j], currTrans.arrayY[j]);
			}

			//Second retrace helps with the splitting ends, performance seems to be not an issue
			for(var j=currTrans.arrayX.length; j>=0; --j){
				DrawRoom.context.lineTo(currTrans.arrayX[j], currTrans.arrayY[j]);
			}

			DrawRoom.context.closePath();
			DrawRoom.context.stroke();
		}else if(currTrans.type=="fill"){
			DrawRoom.doFill(currTrans);
		}
	}
	//DrawRoom.context.stroke();
}

DrawRoom.interval = 1;
DrawRoom.drawLine = function(x, y, last, color, size){
	if(!DrawRoom.context){
		return false;
	}
	DrawRoom.context.beginPath();

	if(last){
		DrawRoom.context.moveTo(x[last-1], y[last-1]);
	}else{
		DrawRoom.context.moveTo(x[last]-1, y[last]);
	}
	DrawRoom.context.lineJoin = "round";
	DrawRoom.context.lineTo(x[last], y[last]);
	DrawRoom.context.closePath();
	DrawRoom.context.strokeStyle = color;
	DrawRoom.context.lineWidth = size;
	DrawRoom.context.stroke();
	if(last < x.length-1){
		//DrawRoom.drawLine(x, y, last+1, color, size);
		
		setTimeout(function(){
			DrawRoom.drawLine(x, y, last+1, color, size);	
		}, DrawRoom.interval);
		
	}
}

DrawRoom.drawLineTick = function(){
	if(!DrawRoom.context){
		return false;
	}
	DrawRoom.context.beginPath();
	var last = DrawRoom.currTransaction.arrayX.length-1;
	if(last < 1){
		return;
	}
	if(last){
		DrawRoom.context.moveTo(DrawRoom.currTransaction.arrayX[last-1], DrawRoom.currTransaction.arrayY[last-1]);
	}else{
		DrawRoom.context.moveTo(DrawRoom.currTransaction.arrayX[last]-1, DrawRoom.currTransaction.arrayY[last]);
	}
	DrawRoom.context.lineJoin = "round";
	DrawRoom.context.lineTo(DrawRoom.currTransaction.arrayX[last], DrawRoom.currTransaction.arrayY[last]);
	DrawRoom.context.closePath();
	DrawRoom.context.strokeStyle = DrawRoom.currTransaction.color;
	DrawRoom.context.lineWidth = DrawRoom.currTransaction.brushSize;
	DrawRoom.context.stroke();
}

DrawRoom.gameMessage = function(msg){
	var r = JSON.parse(msg);
	if(r.id != currRoom){
		return;
	}
	//console.log(r);
	switch(r.message){
		case 'playerJoin':
			getRoomInfo(currRoom);
			if(r.player != usrname){
				DrawRoom.addPlayer(r.player, r.playernum);
			}
		break;
		case 'playerLeave':
			DrawRoom.removePlayer(r.playerid);
		break;
		case 'gameStart':
			DrawRoom.resetScores();
			DrawRoom.calculateRanks();
		break;
		case 'yourTurn':
			DrawRoom.drawCountdown(DrawRoom.countdown, r.time, usrname);
			DrawRoom.drawWord(r.word);
			$("#overlaylayer").css("cursor", "none");
			DrawRoom.resetGuesses();
			$("#drawguess").prop('disabled', true);
			$("#drawOptions").css('left', '85%');
		break;
		case 'opponentTurn':
			DrawRoom.drawCountdown(DrawRoom.countdown, r.time, r.playerName);
			DrawRoom.drawWord(r.word);
			$("#overlaylayer").css("cursor", "auto");
			DrawRoom.resetGuesses();
			$("#drawOptions").css('left', '110%');
			DrawRoom.myTurn = false;
		break;
		case "makeGuess":
			DrawRoom.addGuess(r);
		break;
		case "scoreUpdate":
			DrawRoom.updateScores(r.scores);
		break;
		case "drawEvent":
			DrawRoom.processEvent(r);
		break;
		case "victory":
			DrawRoom.myTurn = false;
			DrawRoom.clearCanvas();
			DrawRoom.clearTopCanvas();
			DrawRoom.clearOverlayCanvas();
			DrawRoom.resetGuesses();
			DrawRoom.drawVictory();
			$("#overlaylayer").css('cursor', 'auto');
			$("#drawOptions").css('left', '85%');
		break;
	}
}

DrawRoom.drawVictory = function(player){
	var context = DrawRoom.overlayContext;
	var width = context.canvas.width;
	var height = context.canvas.height;
	var center = [width/2, height/2];
	context.font = width/15 + "px adobe clean";
	context.textAlign = "center";
	context.fillStyle = "black";
	context.lineWidth = 7;
	context.strokeText(player+" won!", center[0], center[1]);
	context.fillStyle = "white";
	context.fillText(player+" won!", center[0], center[1]);
}

DrawRoom.processEvent = function(received){
	switch(received.type){
		case "fill":
			DrawRoom.currTransaction = Object();
			DrawRoom.currTransaction.type = "fill";
			DrawRoom.currTransaction.x = received.x;
			DrawRoom.currTransaction.y = received.y;
			DrawRoom.currTransaction.color = received.color;

			DrawRoom.doFill(DrawRoom.currTransaction);
			
			DrawRoom.transactions.push(DrawRoom.currTransaction);
			DrawRoom.currTransaction = Object();
		break;
		case "undo":
			DrawRoom.undoLastTransaction();
		break;
		case "clear":
			DrawRoom.clearCanvas();
		break;
		case "line":
			DrawRoom.currTransaction = Object();
			DrawRoom.currTransaction.type = "line";
			DrawRoom.currTransaction.color = received.color;
			DrawRoom.currTransaction.brushSize = received.brushSize;
			DrawRoom.currTransaction.arrayX = received.arrayX;
			DrawRoom.currTransaction.arrayY = received.arrayY;
			DrawRoom.transactions.push(DrawRoom.currTransaction);
			//Maybe prefer better implementation later
			DrawRoom.drawLine(received.arrayX, received.arrayY, 0, received.color, received.brushSize);
			DrawRoom.currTransaction = Object();
		break;
	}
}

DrawRoom.updateScores = function(scores){
	for(var i=0; i<scores.length; i++){
		$("#drawplayer"+i+" .drawpoints").text(scores[i]);
	}
	DrawRoom.calculateRanks();
}

DrawRoom.resetGuesses = function(){
	$("#drawMessageList").empty();
	$("#drawguess").prop('disabled', false);
}

DrawRoom.resetScores = function(){
	DrawRoom.playerScores = Array();
	for(var i=0; i<DrawRoom.numPlayers; i++){
		DrawRoom.playerScores[i] = 0;
	}
	$(".drawpoints").each(function(){
		$(this).text("0");
	});
}

DrawRoom.addGuess = function(received){

	var msgbox = $("#drawMessageList");
	var scrollBottom = false;
	if(Math.abs(msgbox[0].scrollHeight-msgbox.scrollTop() - msgbox.outerHeight()) < 50){
		scrollBottom = true;
	}

	if(received.guessed){
		var adiv = $("<div>");
		var aspan = $("<span style='color:green;font-weight:bold;text-align:center'>").text(received.playername+" guessed the word!");
		adiv.append(aspan);
		if(received.playername==usrname){
			$("#drawguess").prop('disabled', true);
		}
	}else{
		var adiv = $("<div>");
		var aspan = $("<span style='color:"+received.color+";font-weight:bold'>").text(received.playername+": ");
		adiv.append(aspan);
		var ali = $('<span>');
		ali.text(received.value);
		adiv.append(ali);
	}

	msgbox.append(adiv);
	if(scrollBottom){
		$('#drawMessageList').scrollTop($('#drawMessageList')[0].scrollHeight);
	}
}

DrawRoom.calculateRanks = function(){
	var toSort = Array();
	$(".drawpoints").each(function(){
		toSort.push([parseInt($(this).text()), $(this).parent().attr('id')]);
	});
	toSort.sort(function(a, b){ return a[0] < b[0] });
	var temp = Array();
	for(var i=0; i<toSort.length; i++){
		$("#"+toSort[i][1]+" .drawrank").text((i+1)+".");
		temp.push($("#"+toSort[i][1]));
	}
	$("#drawPlayers").empty();
	
	for(var i=0; i<temp.length; i++){
		$("#drawPlayers").append(temp[i]);
	}
}	

DrawRoom.addPlayer = function(playername, playernum){
	var appendTo = $("#drawPlayers");
	var newPlayerDiv = $("<div class='drawplayer' id='drawplayer"+playernum+"'>");
	newPlayerDiv.append($("<span class='drawrank'>").text("#"));
	newPlayerDiv.append($("<span class='drawname'>").text(playername));
	newPlayerDiv.append($("<span class='drawpoints'>").text("0"));
	appendTo.append(newPlayerDiv)
}

DrawRoom.removePlayer = function(id){
	$("#drawplayer"+id).remove();
	if(roomStatus == "Playing"){
		DrawRoom.calculateRanks();
	}
}

DrawRoom.drawCountdown = function(remaining, startTime, player){
	if(DrawRoom.timerid){
		clearTimeout(DrawRoom.timerid);
		DrawRoom.clearCanvas();
	}
	var context = DrawRoom.overlayContext;
	var width = context.canvas.width;
	var height = context.canvas.height;
	context.clearRect(0, 0, width, height-200);
	//context.clearCanvas();
	if(remaining == 0){
		if(player == usrname){
			DrawRoom.myTurn = true;
		}
		DrawRoom.drawTimer(startTime);
		return;
	}
	context.font = width/20 + "px adobe clean";
	context.textAlign = "center";
	context.fillStyle = "black";
	context.fillText(player + " is drawing in", width/2, height/2 - height/8);
	context.font = width/10 + "px adobe clean";
	context.fillText(remaining, width/2, height/2);
	setTimeout(function(){
			DrawRoom.drawCountdown(remaining-1, startTime, player);
	}, 1000);
}

DrawRoom.drawWord = function(word){
	DrawRoom.clearOverlayCanvas();
	var context = DrawRoom.overlayContext;
	var width = context.canvas.width;
	var height = context.canvas.height;
	var center = [width/2, height-width/25];
	context.font = width/25 + "px adobe clean";
	context.textAlign = "center";
	context.fillStyle = "black";
	context.lineWidth = 5;
	context.strokeText(word, center[0], center[1]);
	context.fillStyle = "white";
	context.fillText(word, center[0], center[1]);
}

DrawRoom.drawTimer = function(startTime){
	
	var context = DrawRoom.overlayContext;
	var width = context.canvas.width;
	var height = context.canvas.height;
	
	//top right
	//var center = [width - DrawRoom.timerPositionOffset - DrawRoom.timersize, DrawRoom.timersize + DrawRoom.timerPositionOffset];
	//top center
	var center = [width/2, DrawRoom.timersize + DrawRoom.timerPositionOffset];
	context.clearRect(center[0] - DrawRoom.timersize, DrawRoom.timerPositionOffset, center[0] + DrawRoom.timersize, center[1] + DrawRoom.timersize);
	var remaining = Math.round((startTime + (DrawRoom.turnTime+DrawRoom.countdown)*1000 - (new Date).getTime()) / 1000);
	if(remaining <= 0){
		DrawRoom.myTurn = false;
		$("#overlaylayer").css('cursor', 'auto');
		DrawRoom.clearCanvas();
		DrawRoom.clearTopCanvas();
		return;
	}

	context.beginPath();
	context.arc(center[0], center[1], DrawRoom.timersize-1, 0, 2*Math.PI);
	context.closePath();
	context.fillStyle = "#DDDDDD";
	context.fill();

	context.beginPath();
	context.moveTo(center[0], center[1]);
	context.lineTo(center[0], center[1] - DrawRoom.timersize);
	context.arc(center[0], center[1], DrawRoom.timersize, Math.PI*1.5, remaining/DrawRoom.turnTime * 2*Math.PI + Math.PI*1.5);
	context.closePath();
	context.fillStyle = "#80B3FF";
	context.fill();

	context.font = "bold "+(DrawRoom.timersize/1.5) + "px adobe clean";
	context.textAlign = "center";
	if(remaining <= 10){
		context.fillStyle = "red";
	}else{
		context.fillStyle = "black";
	}
	context.fillText(remaining, center[0], center[1]+DrawRoom.timersize/5);

	DrawRoom.timerid = setTimeout(function(){
		DrawRoom.drawTimer(startTime);
	}, 1000);
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
	//var room = JSON.parse(msg);
	console.log("New room detected: "+msg.id);
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
	console.log("Player number "+msg);
	playernum = msg;
});

//getting room info for the box
socket.on('roomInfo', function(room){
	console.log("Received room information");
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
//add a room to the list of available rooms
function addRoom(room, alterCount){
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
	if(alterCount){
		gameRooms.active++;
	}
	$('#gameroomtable > tbody:last-child').append(tr);
	$("#placeholder").hide();

	function playersColor(players){
		var td = $("<td>");
		for(var i=0;i<players.length;i++){
			if(players[i] && onlineUsers){
				var k = onlineUsers[0].indexOf(players[i]);
				td.append($("<span>").css('color',onlineUsers[1][k]).text(onlineUsers[0][k]+" "));		
			}
		}
		return td;
	}
}

function removeRoom(roomId, alterCount){
	//remove it from list
	if(gameRooms[roomId]==undefined){
		return false;
	}
	gameRooms[roomId].remove();
	if(alterCount){
		gameRooms.active--;
	}
	console.log(gameRooms.active+" gameroom(s) are active.");
	if(gameRooms.active==0){
		//$("#placeholder").css('display', 'inline');
		$("#placeholder").show();
	}
}

function processChatMessage(jqelem){
	if(emotesEnabled && typeof emoteList != "undefined"){
		var path = "res/emotes/";
		var txt;
		var new_txt;
		for(var i=0;i<emoteList.length;i++){
			txt = jqelem.text();
			new_txt = txt.replace(new RegExp(emoteList[i], "g"), "<img title='"+emoteList[i]+"' src='"+path+emoteList[i]+".png' />");
			if(txt!=new_txt){
				jqelem.html(new_txt);
			}
		}
	}
}

//Client JS Code
//Bugs: Chat only 1 emote, draw4red drawn, uno table ordering

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
	$("#soundSwitch").bootstrapSwitch({onColor:'success', offColor:'danger'});
	$("#soundSwitch").on('switchChange.bootstrapSwitch', function(event, state){
		soundsEnabled = state;
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
		case "Draw My Thing":
		DrawRoom.leaveRoom();
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

$("#create_room_button").click(function(){
	$.playSound('res/sounds/click2');
	$("#create_room_name").val(usrname+"'s room");
});

$("#create_room_button2").click(function(){
	$.playSound('res/sounds/click2');
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
game_players["Draw My Thing"] = [3,4,5,6,7,8];
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
	}else if(activeGame=="Draw My Thing"){
		DrawRoom.resize();
	}
})


$(document).ready(function(){
	$("#name_select").fadeIn(2000);
	$("#input_name").focus();
	if(Cookies.get('name')!=undefined){
		$("#input_name").val(Cookies.get('name'));
	}
	preloadImages(emoteimglist);
	if(typeof emoteimglist != "undefined"){
		var path = "res/emotes/";
		var ext = ".png";
		for(var i=0;i<emoteimglist.length;i++){
			emoteList.push(emoteimglist[i].replace(path, "").replace(ext, ""));
		}
	}
});