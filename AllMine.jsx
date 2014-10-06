// $Id$
// rev 9 Oct 08
//
// Intended usage:
// Label Pix
#target photoshop
app.bringToFront();

/// from xlib ///////////////////////////////////////

//
// Set
//     these are a collection of functions for operating
//     on arrays as proper Set: each entry in the array
//     is unique in the array. This is useful for things
//     like doc.info.keywords
//
Set = function Set() {}
Set.add = function(ar, str) { return Set.merge(ar, new Array(str)); }
Set.remove = function(ar, str) {
  var nar = Set.copy(ar);
  for (var idx in nar) {
    if (nar[idx] == str) {
      nar.splice(idx, 1);
    }
  }
  return nar;
};
Set.contains = function(ar, str) {
  for (var idx in ar) {
    if (ar[idx] == str) {
      return true;
    }
  }
  return false;
};
Set.merge = function(ar1, ar2) {
  var obj = new Object();
  var ar = [];

  if (ar1 != undefined) {
    for (var idx in ar1) {
      obj[ar1[idx]] = 1;
    }
  }
  if (ar2 != undefined) {
    for (var idx in ar2) {
      obj[ar2[idx]] = 1;
    }
  }
  for (var idx in obj) {
    ar.push(idx);
  }
  ar.sort();
  return ar;
}
Set.copy = function(ar) {
  return ar.slice(0);
};

function no_ext(name) {
  if (!name) return "";
  var len = name.length;
  var idx = name.lastIndexOf('.', len-2);
  var base = name;
  if (idx != -1) {
    base = name.substr(0,idx);
  }
  return base;
};

//////// add keywords from a list ///

function add_keys(Info,ItemList) {
	var i;
	for (i in ItemList) {
		Info.keywords = Set.add(Info.keywords, ItemList[i]);
	}
}


////////////// march through EXIF tags //////////////

function scan_exif_stuff(doc)
{
    var info = doc.info;
    var digiCam = false;
	var lumix = false;
	var fujix = false;
    var blah = "EXIF:\n";
    var FL = 0;
    var oFL = 0;
    var multiplier = 1.6;
    var used = false;
    var debugEXIF = false;
    var descBits = {
    	camera: 'Scanned',
    	lens: '',
    	shutter: '',
    	aperture: '',
    	iso: '',
    	flash: '',
    	exifMsgs: ''
    };
    var fls;
    for (var i = 0; i < info.exif.length; i++) {
		q = info.exif[i];
		blah += q[0] + ": " + q[1] + "\n";
		if (q[0] == "Make") {
		    info.keywords = Set.add(info.keywords, q[1]);
		    digiCam = true;
		    used = true;
		} else if (q[0] == "Flash") {
		    // alert("Flash ["+q[1]+"]");
		    var flashVal = 0 + q[1]
		    if (flashVal < 16) {
				blah += "STROBE FIRED\n";
				info.keywords = Set.add(info.keywords, "Strobe");
				descBits.flash = "+ Flash";
		    }
		    used = true;
		} else if (q[0] == "Scene Type") {
		    info.source = q[1];
		    used = true;
		} else if (q[0] == "Custom Rendered") {
		    if (q[1] == "Custom Process") {
				info.keywords = Set.add(info.keywords, "BW");
		    }
		    used = true;
		} else if (q[0] == "Model") {
			used = true;
		    if (q[1] == "DMC-LX1") {
		    	add_keys(info,["LX1","DMC_LX1"]);
				lumix = true;
				multiplier = 4.4;
				descBits.camera = 'LX1';
		    } else if (q[1] == "DMC-LX2") {
		    	add_keys(info,["LX2","DMC_LX2"]);
				lumix = true;
				multiplier = 4.4;
				descBits.camera = 'LX2';
		    } else if (q[1] == "DMC-LX3") {
		    	add_keys(info,["LX3","DMC_LX3"]);
		    	//add_keys(info,["Bike","Bicycle"]);
				lumix = true;
				multiplier = 4.67;
				descBits.camera = 'LX3';
		    } else if (q[1] == "DMC-LX5") {
		    	add_keys(info,["LX5","DMC_LX5"]);
				lumix = true;
				multiplier = 4.67;
				descBits.camera = 'LX5';
		    } else if (q[1] == "DMC-LX7") {
		    	add_keys(info,["LX7","DMC_LX7"]);
				lumix = true;
				multiplier = 4.67;
				descBits.camera = 'LX7';
		    } else if (q[1] == "X100S") {
		    	add_keys(info,["Fuji","Fujifilm","Fuji X","Fuji X100s","X100s"]);
				lumix = false;
				fujix = true;
				multiplier = (35.0/23.0);
				descBits.camera = 'X100s';
		    } else if (q[1] == "X-T1") {
		    	add_keys(info,["Fuji","Fujifilm","Fuji X","Fuji X-T1","X-T1"]);
				lumix = false;
				fujix = true;
				multiplier = (35.0/23.0);
				descBits.camera = 'X-T1';
		    } else if (q[1] == "Canon EOS 5D") {
		    	add_keys(info,["5D","EOS","Canon 5D"]);
			    digiCam = true;
			    multiplier = 1.0;
				descBits.camera = '5D';
		    } else if (q[1] == "Canon EOS 40D") {
		    	add_keys(info,["40D","EOS","Canon 40D"]);
			    digiCam = true;
			    multiplier = 1.6;
				descBits.camera = '40D';
		    } else if (q[1] == "Canon EOS DIGITAL REBEL") {
		    	add_keys(info,["300D","EOS"]);
			    multiplier = 1.6;
				descBits.camera = '300D';
		    } else if (q[1] == "Glass1") {
		    	add_keys(info,["Google","Glass","Google Glass","Android"]);
			    multiplier = 8.0;
				descBits.camera = 'Google Glass';
		    } else {
				if (descBits.exifMsgs != "") {
					descBits.exifMsgs += "\n";
				}
				descBits.exifMsgs += ("Model: \"" + q[1] + "\"");
				descBits.camera = ('Camera: '+q[1]);
				// alert("Model: \""+q[1]+"\"");
		    }
		} else if ((q[0] == "Date Time") ||
					(q[0] == "Date Time Original")) {
		    info.keywords = Set.add(info.keywords,q[1].substr(0,4));
		    used = true;
		} else if (q[0] == "Focal Length in 35mm Film") {
		    // alert("35mm FL was ["+q[1]+"]");
		    FL = 0 + q[1];
		    used = true;
		} else if (q[0] == "Orientation") {
		} else if (q[0] == "Shutter Speed") {
				descBits.shutter = (' - '+q[1]);
		} else if (q[0] == "Focal Length") {
		    // alert("Base FL was ["+q[1]+"]");
		    oFL = 0 + q[1];
		    fls = (Math.floor(oFL+0.49)).toString();
			descBits.lens = (', '+fls+'mm');
			used = true;
		} else if (q[0] == "Metering Mode") {
		} else if (q[0] == "Copyright") {
			if (q[1].match(/[0-9]/)) {
				descBits.exifMsgs += ("\nEXIF Copyright Notice: \""+q[1]+"\"");
			}
			used = true;
		} else if (q[0] == "Color Space") {
		} else if (q[0] == "Pixel X Dimension") {
		} else if (q[0] == "Pixel Y Dimension") {
		} else if (q[0] == "Focal Plane X Resolution") {
		} else if (q[0] == "Focal Plane Y Resolution") {
		} else if (q[0] == "Focal Plane Resolution Unit") {
		} else if (q[0] == "Image Width") {
		} else if (q[0] == "Image Height") {
		} else if (q[0] == "X Resolution") {
		} else if (q[0] == "Y Resolution") {
		} else if (q[0] == "Resolution Unit") {
		} else if (q[0] == "yCbCr Positioning") {
		} else if (q[0] == "Exposure Time") {
				//descBits.shutter = (descBits.shutter+'- T'+q[1]);
		} else if (q[0] == "F-Stop") {
			descBits.aperture = (' '+q[1]);
			used = true;
		} else if (q[0] == "Aperture Value") {
				//descBits.aperture = (descBits.aperture+'@ f'+q[1]);
		} else if (q[0] == "Max Aperture Value") {
		} else if (q[0] == "Exposure Bias Value") {
		} else if (q[0] == "Exposure Mode") {
		} else if (q[0] == "Exposure Program") {
		} else if (q[0] == "White Balance") {
		} else if (q[0] == "Scene Capture Type") {
			if (q[1] != "Normal") {
			    info.keywords = Set.add(info.keywords, q[1]);
			}
			used = true;
		} else if (q[0] == "ISO Speed Ratings") {
			descBits.iso = (', ISO '+q[1]);
			used = true;
		} else if (q[0] == "Sensing Method") {
		} else if (q[0] == "File Source") {
		} else if (q[0] == "ExifVersion") {
		} else if (q[0] == "FlashPix Version") {
		} else if (q[0] == "Date Time Digitized") {
		} else if (q[0] == "Software") {
		} else if (q[0] == "Digital Zoom Ratio") {
		} else if (q[0] == "Compressed Bits Per Pixel") {
		} else if (q[0] == "Light Source") {
			if (q[1] != "Unknown") {
			    info.keywords = Set.add(info.keywords, q[1]);
			}
			used = true;
		} else if (q[0] == "Gain Control") {
		} else if (q[0] == "Contrast") {
		} else if (q[0] == "Saturation") {
		} else if (q[0] == "Sharpness") {
		} else if (q[0] == "EXIF tag 258") { // "8 8 8"
		} else if (q[0] == "EXIF tag 262") { // "RGB"
		} else if (q[0] == "EXIF tag 277") { // "3"
		} else if (q[0] == "EXIF tag 34864") {
		} else if (q[0] == "EXIF tag 41483") { // Glass
		} else if (q[0] == "EXIF tag 42034") { // X-T1: "1800/100"
		} else if (q[0] == "EXIF tag 42035") { // X-T1: "FUJIFILM" - Lens Maker
		} else if (q[0] == "EXIF tag 42036") { // X-T1: "XF18-55mmF2.8-4 R LM OIS"
			if (q[1] = "XF18-55mmF2.8-4 R LM OIS") {
			    info.keywords = Set.add(info.keywords, "18-55mm");
			    // info.keywords = Set.add(info.keywords, "Zoom");
			    // info.keywords = Set.add(info.keywords, "Kit Lens");
			}
			used = true;
		} else if (q[0] == "EXIF tag 42037") { // X-T1: serial #
		} else if (q[0] == "Brightness Value") { // first seen on x100s
		} else if (q[0] == "Subject Distance Range") { // first seen on x100s
		} else if (q[0] == "Subject Distance") { // first seen on Glass
		} else if (q[0] == "Image Unique ID") { // first seen on Glass
		} else if (q[0] == "Artist") {
		    if (q[1] != "Kevin Bjorke") {
				if (descBits.exifMsgs != "") {
					descBits.exifMsgs += "\n";
				}
				descBits.exifMsgs += ("Artist tag: \""+q[1]+"\"");
				// alert("Artist tag: \""+q[1]+"\"");
		    }
		    used = true;
		} else {
		    if (descBits.exifMsgs != "") {
		    	descBits.exifMsgs += "\n";
		    }
		    descBits.exifMsgs += ("EXIF \""+q[0]+"\" was \""+q[1]+"\"");
		    // alert("EXIF \""+q[0]+"\" was \""+q[1]+"\"");
		}
		if (debugEXIF && (! used)) {
			alert(q.toString());
			used = false;
		}
    }
    //
    //
    if (lumix) {
		    	add_keys(info,["Leica","Lumix"]);
		if (doc.width > doc.height) {
		    info.keywords = Set.add(info.keywords, "16_9");
		} else {
		    info.keywords = Set.add(info.keywords, "9_16");
		}
		digiCam = true;
	} else if (fujix) {
		digiCam = true;
		if (oFL == 45) {
			add_keys(info,["Zeiss","Contax","Planar","f/2","Fotodiox"]);
		} else if (oFL == 90) {
			add_keys(info,["Zeiss","Contax","Sonnar","f/2.8","Fotodiox"]);
		} else if (oFL == 50) {
			add_keys(info,["Canon","Canon FD","f/1.8","Fotodiox"]);
		} else if (oFL == 16) {
			add_keys(info,["Rokinon","f/2.8"]);
		}
	}
    if (! digiCam) {
		add_keys(info,["film","scanned"]);
    }
    if (FL <= 0) {
		FL = oFL * multiplier;
		FL = Math.floor(FL+0.49);
		//alert("Calculated FL was "+FL);
	} else { // equivalent supplied by camera
		fls = (Math.floor(oFL+0.49)).toString();
        if (fls.substr(0,1) == "0") {
           fls = fls.substr (1);
	    }
		info.keywords = Set.add(info.keywords, (fls+"mm_orig"));
    }
    if (FL > 0) {
		//alert("Final oFL was "+oFL);
		//alert("Final FL was "+FL);
		if (FL <= 35) {
		    info.keywords = Set.add(info.keywords, "Wide_Angle");
		} else if (FL >= 85) {
		    info.keywords = Set.add(info.keywords, "Telephoto");
		}
	    if (multiplier != 1.0) {
	        fls = FL.toString();
	        if (fls.substr(0,1) == "0") {
	           fls = fls.substr (1);
		    }
	        info.keywords = Set.add(info.keywords, (fls+"mm"));
	        info.keywords = Set.add(info.keywords, (fls+"mm_equiv"));
		}
    }
    // alert(blah);
    return descBits;
}

function main()
{
    if (!app.documents.length > 0) {    // stop if no document is opened.
		alert("Sorry, No Current Document");
		return;
    }
    var strtRulerUnits = app.preferences.rulerUnits;
    if (strtRulerUnits != Units.PIXELS) {
		app.preferences.rulerUnits = Units.PIXELS; // selections always in pixels
    }
    var info = app.activeDocument.info;
    var initKeys = info.keywords.length;
    var msgs = "";
    if (initKeys > 0) {
		msgs = (msgs + initKeys.toString() + " keys already defined");
		// alert(initKeys.toString()+" keys already defined");
    }
    var newKeys = [];
    if (app.activeDocument.mode == DocumentMode.GRAYSCALE) {
		newKeys = newKeys.concat(["BW","Black_and_White","Black_&_White","Monochrome"]);
		// info.keywords = Set.add(info.keywords, "bw");
		// info.keywords = Set.add(info.keywords, "black_and_white");
		// info.keywords = Set.add(info.keywords, "monochrome");
    }
    var dt = new Date();
    var thisYear = dt.getFullYear()
    var thisYearS = thisYear.toString()
    if (info.CreationDate == "") {
		info.creationDate = dt.toString();
	//    } else {
	//	alert("Image Created <"+info.creationDate+">");
    }
    // alert("Title is ("+info.title+")");
    newKeys = newKeys.concat(["Kevin_Bjorke","Bjorke","PhotoRant","Botzilla.com",
	    						"San_Francisco","SF"/*,"Santa_Clara"*/,"Bay_Area","California"]);
    //
    // keywords added to doc...
    //
    add_keys(info,newKeys);
    var descBits = scan_exif_stuff(app.activeDocument);
    if (descBits.exifMsgs != "") {
		if (msgs != "") { msgs += "\n"; }
		msgs += descBits.exifMsgs;
    }
    info.author = "Kevin Bjorke";
    info.credit = "Kevin Bjorke";
    info.authorPosition = "Owner";
    info.copyrighted = CopyrightedType.COPYRIGHTEDWORK;
    info.copyrightNotice = "©"+thisYearS+" Kevin Bjorke";
    info.ownerUrl = "http://www.botzilla.com/";
    if (info.title == "") {
		info.title = no_ext(app.activeDocument.name);
    }
    // alert("New Title is ("+info.title+")");
    if (info.headline == "") {
		info.headline = info.title;
    }
   if (info.caption == "") {
		info.caption = (descBits.camera+
						descBits.lens+
						descBits.shutter+
						descBits.aperture+
						descBits.iso+
						descBits.flash+'\n'+
						no_ext(app.activeDocument.name));
		info.captionWriter = "Kevin Bjorke";
    }
    if (info.city == "") {info.city = "San Francisco"; }
    if (info.provineState == "") {info.provinceState = "California"; }
    if (info.country == "") { info.country == "USA"; }
    if (initKeys == 0) {
		info.keywords = Set.add(info.keywords, "needs_tags");
    }
    if (msgs != "") {
		alert (msgs);
    }
    if (strtRulerUnits != Units.PIXELS) {
		app.preferences.rulerUnits = strtRulerUnits;
    }
}

main();

// eof
