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

//Server com for logging in
function attemptLogin(picked_name){
  usrname = picked_name;
  socket.emit('pickname', usrname);
}

//Get the room info
function getRoomInfo(roomid){
  //console.log("Requesting room info...");
  socket.emit('requestRoomInfo', roomid);
  getPlayerNum(roomid);
}

function getPlayerNum(roomid){
  socket.emit('requestPlayerNum', roomid);
}

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

function validChars(str){
  //TODO: IMPLEMENT ME
  return true;
}
