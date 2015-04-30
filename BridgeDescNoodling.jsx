#target bridge  
if( BridgeTalk.appName == "bridge" ) {  
	copy_meta = MenuElement.create("command", "Caption_to_Author", "at the end of Thumbnail");
}
copy_meta.onSelect = function () { 
	copy_Description();
}
function copy_Description(){ 
	var sels = app.document.selections; 
	for (var i = 0; i < sels.length; i++){ 
		var md = sels[i].synchronousMetadata; 
		md.namespace = "http://purl.org/dc/elements/1.1/"; 
		var str = md.description[0]; 
		md.namespace = "http://ns.adobe.com/photoshop/1.0/"  
		md.Author = str; 
	} 
};