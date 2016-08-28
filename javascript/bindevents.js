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