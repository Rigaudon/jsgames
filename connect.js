var board = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
var turn = 0;

function checkBoard(){
	function check_spot(i, j, c){
		return check_h(i, j, c) || check_v(i, j, c) || check_d(i, j, c);
	}

	function check_h(i, j, c){
		var at_position = board[i][j];
		for(var k=i+1;k<i+c;k++){
			if(board[k][j]!=at_position){
				return false;
			}
		}
		return true;
	}

	function check_v(i, j, c){
		var at_position = board[i][j];
		for(var k=j+1;k<j+c;k++){
			if(board[i][k]!=at_position){
				return false;
			}
		}
		return true;
	}

	function check_d(i, j, c){
		return check_d_r(i, j, c) || check_d_l(i, j, c);
	}

	function check_d_r(i, j, c){
		var at_position = board[i][j];
		var m = i;
		for(var k=j+1;k<j+c;k++){
			m++;-=7
			if(board[m][k]!=at_position){
				return false;
			}
		}
		return true;
	}

	function check_d_l(i, j, c){
		var at_position = board[i][j];
		var m = i;
		for(var k=j+1;k<j+c;k++){
			m--;
			if(board[m][k]!=at_position){
				return false;
			}
		}
		return true;
	}

	if(board.length<1){
		return false;
	}
	var connect = 4;
	var h = board[0].length;
	if(connect > board.length || connect > h){
		return false;
	}
	//horizontal should go from 0 to length-connect;
	//vertical should go from 0 to height-connect;
	for(var i=0;i<board.length-connect;i++){
		for(var j=0;j<h-connect;j++){
			if(board[i][j]!=0 && check_spot(i, j, connect)){
				return board[i][j];
			}
		}
	}
	return false;
}

$(document).ready(function(){
	$(".row div").click(function(){
		var currid = this.id;
	})
});