var DrawRoom = Object();
DrawRoom.myTurn = undefined;
DrawRoom.context = undefined;
DrawRoom.canvas = undefined;
DrawRoom.topContext = undefined;
DrawRoom.overlayContext = undefined;
DrawRoom.selectedColor = undefined;
DrawRoom.brushSize = undefined;
DrawRoom.transactions = undefined;
DrawRoom.currTransaction = undefined;
DrawRoom.tool = undefined;
DrawRoom.playerScores = undefined;
DrawRoom.numPlayers = undefined;
DrawRoom.countdown = 5;
DrawRoom.turnTime = 60;
DrawRoom.timersize = 40;
DrawRoom.timerPositionOffset = 10;
DrawRoom.timerid = undefined;

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
	DrawRoom.brushSize = 0;
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
	DrawRoom.brushSize = 6;
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
		if(DrawRoom.myTurn && e.which==1){
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
				DrawRoom.addPartialLine(mouseX, mouseY);
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

	overlayLayer.on('contextmenu', function(){ 
		return false; 
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
		
		DrawRoom.clearCanvas(true);
	});
	tools2.append(clearTool);

	toolsDiv.append(tools2);
	optionsBody.append(toolsDiv);

	optionsBody.append($("<div class='option-label'>").text("Brush Size"));
	var sizeSlider = $("<div id='drawSlider'>");
	optionsBody.append(sizeSlider);	

	optionsBody.append($("<div class='option-label'>").text("Color"));
	var basicColors = $("<div class='btn-group' style='width:95%'>");
	var basicColorList = ["#000000", "#FFFFFF", "#FF0000", "#FF9600", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF"];
	for(var i=0;i<basicColorList.length;i++){
		var currColorButton = $("<button type='button' class='btn btn-default'></button>");
		currColorButton.css('background-color', basicColorList[i]);
		currColorButton.css('height', '25px');
		currColorButton.css('width', (100/basicColorList.length)+"%");
		currColorButton.attr('value', basicColorList[i]);
		currColorButton.click(function(){
			$("#drawColor").attr('value', this.value);
			$("#drawColor").css('background-color', this.value);
			DrawRoom.selectedColor = this.value;
		});
		basicColors.append(currColorButton);	
	}
	optionsBody.append(basicColors);

	var secondaryColors = $("<div class='btn-group' style='width:95%'>");
	var secondaryColorList = ["#5F5F5F", "#5B2D00", "#FFBBBB", "#7200FF", "#005AFF", "#167700", "#FFBA00", "#00C6FF", "#FF4200"];
	for(var i=0;i<secondaryColorList.length;i++){
		var currColorButton = $("<button type='button' class='btn btn-default'></button>");
		currColorButton.css('background-color', secondaryColorList[i]);
		currColorButton.css('height', '25px');
		currColorButton.css('width', (100/secondaryColorList.length)+"%");
		currColorButton.attr('value', secondaryColorList[i]);
		currColorButton.click(function(){
			$("#drawColor").attr('value', this.value);
			$("#drawColor").css('background-color', this.value);
			DrawRoom.selectedColor = this.value;
		});
		secondaryColors.append(currColorButton);	
	}
	optionsBody.append(secondaryColors);
	optionsBody.append($("<span style='font-size:15px'>").text("Click below for custom color"));
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
		value: DrawRoom.brushSize,
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
	for(var i=0; i<players.length; i++){
		if(players[i]){
			DrawRoom.addPlayer(players[i], i);
		}
	}

	setTimeout(function(){ DrawRoom.resize(); }, 1000);
}

DrawRoom.partialMaxLen = 10;
DrawRoom.partialX = [];
DrawRoom.partialY = [];
DrawRoom.addPartialLine = function(x, y){
	if(DrawRoom.partialX.length < DrawRoom.partialMaxLen){
		DrawRoom.partialX.push(x);
		DrawRoom.partialY.push(y);
	}else{
		var toEmit = Object();
		toEmit.id = currRoom;
		toEmit.event = "draw";
		toEmit.type = "partialline";
		toEmit.arrayX = DrawRoom.partialX;
		toEmit.arrayY = DrawRoom.partialY;
		toEmit.brushSize = DrawRoom.brushSize;
		if(DrawRoom.currTransaction.type=="eraser"){
			toEmit.color = "white";
		}else{
			toEmit.color = DrawRoom.currTransaction.color;
		}
		socket.emit('makeMove', JSON.stringify(toEmit));
		DrawRoom.partialX = [x];
		DrawRoom.partialY = [y];
	}
}

DrawRoom.resize = function(){
	var p = $("#drawcanvas").position();
	$("#toplayer").css('top', p.top);
	$("#toplayer").css('left', p.left);
	$("#overlaylayer").css('top', p.top);
	$("#overlaylayer").css('left', p.left);
	$("#overlaylayer").css('display', 'block');
	$("#toplayer").css('display', 'block');
}

DrawRoom.killCurrentTransaction = function(){
	if(DrawRoom.currTransaction.type=="line" || DrawRoom.currTransaction.type=="eraser"){
		if(DrawRoom.currTransaction.arrayX && DrawRoom.currTransaction.arrayX.length > 0){
			DrawRoom.transactions.push(DrawRoom.currTransaction);

			var toEmit = Object();
			toEmit.id = currRoom;
			toEmit.event = "draw";
			toEmit.type = "partialline";
			//toEmit.arrayX = DrawRoom.currTransaction.arrayX;
			//toEmit.arrayY = DrawRoom.currTransaction.arrayY;
			toEmit.arrayX = DrawRoom.partialX;
			toEmit.arrayY = DrawRoom.partialY;
			toEmit.brushSize = DrawRoom.brushSize;

			if(DrawRoom.currTransaction.type=="eraser"){
				toEmit.color = "white";
			}else{
				toEmit.color = DrawRoom.currTransaction.color;
			}
			toEmit.arrayX.push('end');
			toEmit.arrayY.push('end');
			socket.emit('makeMove', JSON.stringify(toEmit));
			DrawRoom.partialX = [];
			DrawRoom.partialY = [];
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
	
	//Add "stroke" effect
	DrawRoom.topContext.beginPath();
	DrawRoom.topContext.moveTo(x-1, y);
	DrawRoom.topContext.lineJoin = "round";
	DrawRoom.topContext.lineTo(x, y);
	DrawRoom.topContext.closePath();
	DrawRoom.topContext.strokeStyle = "black";
	DrawRoom.topContext.lineWidth = DrawRoom.brushSize + 2;
	DrawRoom.topContext.stroke();

	DrawRoom.topContext.beginPath();
	DrawRoom.topContext.moveTo(x-1, y);
	DrawRoom.topContext.lineJoin = "round";
	DrawRoom.topContext.lineTo(x, y);
	DrawRoom.topContext.closePath();
	DrawRoom.topContext.strokeStyle = DrawRoom.selectedColor;
	DrawRoom.topContext.lineWidth = DrawRoom.brushSize;
	DrawRoom.topContext.stroke();
}

DrawRoom.clearCanvas = function(push){
	DrawRoom.context.fillStyle = "white";
	DrawRoom.context.fillRect(0, 0, DrawRoom.context.canvas.width, DrawRoom.context.canvas.height);
	if(push){
		var clearTrans = Object();
		clearTrans.type = "clear";
		DrawRoom.transactions.push(clearTrans);
	}
}

DrawRoom.clearTopCanvas = function(){
	var tmp = DrawRoom.topContext.fillStyle;
	DrawRoom.topContext.fillStyle = "white";
	DrawRoom.topContext.clearRect(0, 0, DrawRoom.topContext.canvas.width, DrawRoom.topContext.canvas.height);
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
	if(!DrawRoom.context){
		return false;
	}
	DrawRoom.context.fillStyle = "white";
	DrawRoom.context.fillRect(0, 0, DrawRoom.context.canvas.width, DrawRoom.context.canvas.height);	
	if(DrawRoom.transactions.length==0){
		return;
	}
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
			DrawRoom.changeTurn(r.player);

		break;
		case 'opponentTurn':
			DrawRoom.drawCountdown(DrawRoom.countdown, r.time, r.playerName);
			DrawRoom.drawWord(r.word);
			$("#overlaylayer").css("cursor", "auto");
			DrawRoom.resetGuesses();
			$("#drawOptions").css('left', '110%');
			DrawRoom.myTurn = false;
			DrawRoom.changeTurn(r.player);
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
			clearTimeout(DrawRoom.timerid);
			DrawRoom.clearCanvas();
			DrawRoom.clearTopCanvas();
			DrawRoom.clearOverlayCanvas();
			DrawRoom.resetGuesses();
			DrawRoom.drawVictory(r.players);
			$("#overlaylayer").css('cursor', 'auto');
			$("#drawOptions").css('left', '85%');
			DrawRoom.changeTurn(-1);
		break;
		case "revealWord":
			$("#drawguess").prop('disabled', true);
			DrawRoom.revealWord(r.word);
		break;
	}
}

DrawRoom.changeTurn = function(player){
	DrawRoom.clearTopCanvas();
	for(var i=0; i<DrawRoom.numPlayers; i++){
		var tmp = $("#drawplayer"+i+" .drawname");
		if(i==player){
			tmp.css('background-color', '#87CEEB');
			tmp.css('color', 'black');
			tmp.css('font-weight', 'bold');
		}else{
			tmp.css('background-color', '#666666');
			tmp.css('color', 'white');
			tmp.css('font-weight', 'normal');
		}
	}
	DrawRoom.transactions = [];
}

DrawRoom.revealWord = function(word){
	clearTimeout(DrawRoom.timerid);
	DrawRoom.myTurn = false;
	DrawRoom.clearOverlayCanvas();
	DrawRoom.drawWord(word);
	//changme to disable on server as well
	$("#drawguess").prop('disabled', true);
}

DrawRoom.drawVictory = function(players){
	var context = DrawRoom.overlayContext;
	var width = context.canvas.width;
	var height = context.canvas.height;
	var center = [width/2, height/2];
	context.font = width/15 + "px adobe clean";
	context.textAlign = "center";
	context.fillStyle = "black";
	context.lineWidth = 7;
	var text = players[0];
	for(var i=1; i<players.length; i++){
		if(i==players.length-1){
			text += " and "+players[i];
		}else{
			text += ", " + players[i];
		}
	}
	text+= " won!";
	context.strokeText(text, center[0], center[1]);
	context.fillStyle = "white";
	context.fillText(text, center[0], center[1]);
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
			DrawRoom.tempqX = [];
			DrawRoom.tempqY = [];
			DrawRoom.undoLastTransaction();
		break;
		case "clear":
			DrawRoom.tempqX = [];
			DrawRoom.tempqY = [];
			DrawRoom.clearCanvas(true);
		break;
		case "partialline":
			if(!DrawRoom.currTransaction || !DrawRoom.currTransaction.arrayX){
				DrawRoom.currTransaction = Object();
				DrawRoom.currTransaction.arrayX = [];
				DrawRoom.currTransaction.arrayY = [];
				DrawRoom.currTransaction.type = "line";
				DrawRoom.currTransaction.color = received.color;
				DrawRoom.currTransaction.brushSize = received.brushSize;
			}
			
			for(var i=0, len=received.arrayX.length; i<len; i++){
				if(received.arrayX[i] == "end"){
					DrawRoom.transactions.push(DrawRoom.currTransaction);
					DrawRoom.currTransaction = Object();
					return;
				}else{
					DrawRoom.currTransaction.arrayX.push(received.arrayX[i]);
					DrawRoom.currTransaction.arrayY.push(received.arrayY[i]);
					DrawRoom.drawLineTick();
				}
			}

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
		//DrawRoom.clearCanvas();
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
	context.fillStyle = "#87CEEB";
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
