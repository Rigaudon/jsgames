var emoteList = [];
if(typeof emoteimglist != "undefined"){
	var path = "res/emotes/";
	var ext = ".png";
	for(var i=0;i<emoteimglist.length;i++){
		emoteList.push(emoteimglist[i].replace(path, "").replace(ext, ""));
	}
}