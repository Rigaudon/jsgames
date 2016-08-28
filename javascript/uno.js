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