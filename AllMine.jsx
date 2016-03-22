// $Id$
// rev 7 feb 2015
//
// Intended usage:
// Label Pix
#target photoshop
app.bringToFront();

// User Personalization //////////////////////////
//
// This is not 'designed' code I'm afraid -- it's grown from my own practical use and has a few warts.
// This data structure can help personalize it a little -- tailor  the fields 'to fit'
//
// The script recognizes a few different Canon, Leica, Fuji, Google and Panasonic cameras and gives them extra tags. Other
//    camera metadata won't break anything, and should get picked up fine.
//

var Person = {
	fullname: 'Kevin Bjorke',
	url: 'http://www.botzilla.com/',
	blog: 'http://www.botzilla.com/blog/',
	relation: 'Owner',
	city: 'San Francisco',
	region: 'California',
	country: 'USA',
	commonTags: ['Bjorke','PhotoRant','Botzilla.com', 'SF', 'Bay Area'], // added to every pic
	reminder: 'needs_tags' // added only if the image has NO tags before being processed...
};


/// from xlib ///////////////////////////////////////

//
// Set
//     these are a collection of functions for operating
//     on arrays as proper Set: each entry in the array
//     is unique in the array. This is useful for things
//     like doc.info.keywords
//
Set = function Set() {};
Set.add = function(ar, str) {
	'use strict';
	return Set.merge(ar, new Array(str));
};
Set.remove = function(ar, str) {
  'use strict';
  var nar = Set.copy(ar);
  for (var idx in nar) {
    if (nar[idx] === str) {
      nar.splice(idx, 1);
    }
  }
  return nar;
};
Set.contains = function(ar, str) {
  'use strict';
  for (var idx in ar) {
    if (ar[idx] === str) {
      return true;
    }
  }
  return false;
};
Set.merge = function(ar1, ar2) {
  'use strict';
  var obj = new Object();
  var ar = [];
  var idx;

  if (ar1 !== undefined) {
    for (idx in ar1) {
      obj[ar1[idx]] = 1;
    }
  }
  if (ar2 !== undefined) {
    for (idx in ar2) {
      obj[ar2[idx]] = 1;
    }
  }
  for (idx in obj) {
    ar.push(idx);
  }
  ar.sort();
  return ar;
};
Set.copy = function(ar) {
  'use strict';
  return ar.slice(0);
};

function noExtension(name) {
  'use strict';
  if (!name) { return ''; }
  var len = name.length;
  var idx = name.lastIndexOf('.', len-2);
  var base = name;
  if (idx !== -1) {
    base = name.substr(0,idx);
  }
  return base;
}

//////// add keywords from a list ///

function addKeys(Info,ItemList) {
	'use strict';
	var i;
	for (i in ItemList) {
		Info.keywords = Set.add(Info.keywords, ItemList[i]);
	}
}

///////// Camera-model bits ////////////////////

function cameraID(ModelName,info,descBits) {
	'use strict';
    if (ModelName === 'DMC-LX1') {
    	addKeys(info,['LX1','DMC_LX1']);
		descBits.lumix = true;
		descBits.multiplier = 4.4;
		descBits.camera = 'LX1';
    } else if (ModelName === 'DMC-LX2') {
    	addKeys(info,['LX2','DMC_LX2']);
		descBits.lumix = true;
		descBits.multiplier = 4.4;
		descBits.camera = 'LX2';
    } else if (ModelName === 'DMC-LX3') {
    	addKeys(info,['LX3','DMC_LX3']);
    	//addKeys(info,['Bike','Bicycle']);
		descBits.lumix = true;
		descBits.multiplier = 4.67;
		descBits.camera = 'LX3';
    } else if (ModelName === 'DMC-LX5') {
    	addKeys(info,['LX5','DMC_LX5']);
		descBits.lumix = true;
		descBits.multiplier = 4.67;
		descBits.camera = 'LX5';
    } else if (ModelName === 'DMC-LX7') {
    	addKeys(info,['LX7','DMC_LX7']);
		descBits.lumix = true;
		descBits.multiplier = 4.67;
		descBits.camera = 'LX7';
    } else if (ModelName === 'X100S') {
    	addKeys(info,['Fuji X100s','X100s']);
		descBits.fujix = true;
		descBits.multiplier = (35.0/23.0);
		descBits.camera = 'X100s';
    } else if (ModelName === 'X100T') {
    	addKeys(info,['Fuji X100T','X100T']);
		descBits.fujix = true;
		descBits.multiplier = (35.0/23.0);
		descBits.camera = 'X100T';
    } else if (ModelName === 'X-T1') {
    	addKeys(info,['Fuji X-T1','X-T1']);
		descBits.fujix = true;
		descBits.multiplier = (35.0/23.0);
		descBits.camera = 'X-T1';
    } else if (ModelName === 'X-Pro2') {
    	addKeys(info,['Fuji X-Pro2','X-Pro2']);
		descBits.fujix = true;
		descBits.multiplier = (35.0/23.0);
		descBits.camera = 'X-Pro2';
    } else if (ModelName === 'M Monochrom') {
    	addKeys(info,['Leica','Leica M',ModelName,'Monochrom','M']);
		descBits.multiplier = 1.0;
		descBits.camera = 'M Monochrom';
    } else if (ModelName === 'Canon EOS 5D') {
    	addKeys(info,['5D','EOS','Canon 5D']);
	    descBits.multiplier = 1.0;
		descBits.camera = '5D';
    } else if (ModelName === 'Canon EOS 40D') {
    	addKeys(info,['40D','EOS','Canon 40D']);
	    descBits.multiplier = 1.6;
		descBits.camera = '40D';
    } else if (ModelName === 'Canon EOS DIGITAL REBEL') {
    	addKeys(info,['300D','EOS']);
	    descBits.multiplier = 1.6;
		descBits.camera = '300D';
    } else if (ModelName === 'Glass1') {
    	addKeys(info,['Google','Glass','Google Glass','Android']);
	    descBits.multiplier = 8.0;
		descBits.camera = 'Google Glass';
    } else {
		if (descBits.alertText !== '') {
			descBits.alertText += '\n';
		}
		descBits.alertText += ('Model: ="' + ModelName + '"');
		descBits.camera = ('Camera: '+ModelName);
		// alert('Model: "=+q[1]+='"');
    }
	return info;
}

////////////// march through EXIF tags //////////////

function scanEXIFstuff(doc)
{
	'use strict';
    var info = doc.info;
    var FL = 0;
    var oFL = 0;
    var fls;
    var debugMsg = false;
    var descBits = {
    	camera: 'Scanned',
    	lens: '',
    	shutter: '',
    	aperture: '',
    	iso: '',
    	flash: '',
    	alertText: '',
    	multiplier: 1.6,
    	fujix: false,
    	lumix: false,
    	minAperture: 1.4,
    };
    for (var i = 0; i < info.exif.length; i++) {
		var q = info.exif[i];
		switch (q[0]) {
			case 'Make':
			    info.keywords = Set.add(info.keywords, q[1]);
			    break;
			case 'Model':
				cameraID(q[1],info,descBits);  // identify specific model of camera
			    break;
			case 'Date Time':
			case 'Date Time Original':
			    info.keywords = Set.add(info.keywords,q[1].substr(0,4));
			    break;
			case 'Focal Length in 35mm Film':
			    FL = 0 + q[1];
			    break;
			case 'Shutter Speed':
				descBits.shutter = (' - '+q[1]);
			    break;
			case 'Focal Length':
			    oFL = 0 + q[1];
			    fls = (Math.floor(oFL+0.49)).toString();
				descBits.lens = (', '+fls+'mm');
			    break;
			case 'F-Stop':
				descBits.aperture = (' '+q[1]);
			    break;
			case 'ISO Speed Ratings':
				descBits.iso = (', ISO '+q[1]);
			    break;
			case 'Copyright':
				if (q[1].match(/[0-9]/)) {
					descBits.alertText += ('\nEXIF Copyright Notice: "'+q[1]+'"');
				}
			    break;
			case 'Scene Capture Type':
				if (q[1] !== 'Normal') {
				    info.keywords = Set.add(info.keywords, q[1]);
				}
			    break;
			case 'Light Source':
				if (q[1] !== 'Unknown') {
				    info.keywords = Set.add(info.keywords, q[1]);
				}
			    break;
			case 'Flash':
			    var flashVal = 0 + q[1];
			    if (flashVal < 16) {
					info.keywords = Set.add(info.keywords, 'Strobe');
					descBits.flash = '+ Flash';
			    }
			    break;
			case 'Scene Type':
			    info.source = q[1];
			    break;
			case 'Custom Rendered':
			    if (q[1] === 'Custom Process') {
					info.keywords = Set.add(info.keywords, 'BW');
			    }
			    break;
			case 'Artist':
			    if (q[1] !== Person.fullname) {
					if (descBits.alertText !== '') {
						descBits.alertText += '\n';
					}
					descBits.alertText += ('Artist tag: "'+q[1]+'"');
					// alert('Artist tag: "'+q[1]+'"');
			    }
			    break;
			case 'Exposure Program':
				info.keywords = Set.add(info.keywords, q[1]);
				break;
			case 'EXIF tag 42036': // X-T1: "XF18-55mmF2.8-4 R LM OIS'
				if (q[1] === 'XF18-55mmF2.8-4 R LM OIS') {
					addKeys(info,['18-55mm','f/2.8']);
				} else if (q[1] === 'XF35mmF1.4 R') {
					info.keywords = Set.add(info.keywords, 'f/1.4');
				} else if (q[1] === 'Leica Summicron-M 50mm f/2 (IV, V)') {
					addKeys(info,['Summicron','Summicron-M','f/2']);
				} else {
					descBits.alertText += (q[1]);
				}
				break;
			case 'Metering Mode': // debugMsg=true;
			case 'Orientation': // debugMsg=true;
			case 'Color Space':
			case 'Pixel X Dimension':
			case 'Pixel Y Dimension':
			case 'Focal Plane X Resolution':
			case 'Focal Plane Y Resolution':
			case 'Focal Plane Resolution Unit':
			case 'Image Width':
			case 'Image Height':
			case 'X Resolution':
			case 'Y Resolution':
			case 'Resolution Unit':
			case 'yCbCr Positioning':
			case 'Exposure Time':
			case 'Aperture Value':
			case 'Max Aperture Value':
			case 'Exposure Bias Value':
			case 'Exposure Mode': //debugMsg=true;
			case 'White Balance':
			case 'Sensing Method':
			case 'File Source':
			case 'ExifVersion':
			case 'FlashPix Version':
			case 'Date Time Digitized':
			case 'Software':
			case 'Digital Zoom Ratio':
			case 'Compressed Bits Per Pixel':
			case 'Gain Control':
			case 'Contrast':
			case 'Saturation':
			case 'Sharpness':
			case 'EXIF tag 258': // '8 8 8'
			case 'EXIF tag 262': // 'RGB'
			case 'EXIF tag 277': // "3'
			case 'EXIF tag 34864':
			case 'EXIF tag 41483': // Glass
			case 'EXIF tag 42034': // X-T1: "1800/100'
			case 'EXIF tag 42035': // X-T1: "FUJIFILM' - Lens Maker
			case 'EXIF tag 42037': // X-T1: serial #
			case 'Brightness Value': // first seen on x100s
			case 'Subject Distance Range': // first seen on x100s
			case 'Subject Distance': // first seen on Glass
			case 'Image Unique ID': // first seen on Glass
				break;
			default:
				debugMsg = true;
		}
		if (debugMsg) {
		    if (descBits.alertText !== '') {
		    	descBits.alertText += '\n';
		    }
		    descBits.alertText += ('EXIF "'+q[0]+'" was "'+q[1]+'"');
			debugMsg = false;
		}
    }
    //
    //
    if (descBits.lumix) {
    	// used to accomodate the Leica/Panasonic relationship
    	addKeys(info,['Leica','Lumix','Leicasonic','Panaleica']);
	} else if (descBits.fujix) {
		// Various "Fuji X' cameras
    	addKeys(info,['Fuji','Fujifilm','Fuji X',('Fujifilm '+descBits.camera)]);
    	// some Fuji-X lens adapters (just nes I've used)
		if (oFL == 45) {
			addKeys(info,['Zeiss','Contax','Planar','f/2','Fotodiox','planar245','carlzeiss']);
			descBits.minAperture = 2;
		} else if (oFL == 90) {
			addKeys(info,['Zeiss','Contax','Sonnar','f/2.8','Fotodiox','sonnar2890','carlzeiss']);
			descBits.minAperture = 2.8;
		} else if (oFL == 50) {
			addKeys(info,['Canon','Canon FD','f/1.8','Fotodiox']);
			descBits.minAperture = 1.8;
		} else if (oFL == 16) {
			addKeys(info,['Rokinon','f/2.8']);
			descBits.minAperture = 2.8;
		}
	}
    if (descBits.camera === 'Scanned') { // never saw any camera data - this must have been a film scan
		addKeys(info,['film','scanned']);
    }
    if (FL <= 0) {
		FL = oFL * descBits.multiplier;
		FL = Math.floor(FL+0.49);
	} else { // equivalent supplied by camera
		fls = (Math.floor(oFL+0.49)).toString();
        if (fls.substr(0,1) === '0') {
           fls = fls.substr (1);
	    }
		info.keywords = Set.add(info.keywords, (fls+'mm_orig'));
    }
    if (FL > 0) {
		if (FL <= 35) {
		    info.keywords = Set.add(info.keywords, 'Wide Angle');
		    if (FL < 27) {
		    	info.keywords = Set.add(info.keywords, 'Ultra Wide Angle');
		    }
		} else if (FL >= 85) {
		    info.keywords = Set.add(info.keywords, 'Telephoto');
		}
	    if (descBits.multiplier != 1.0) {
	        fls = FL.toString();
	        if (fls.substr(0,1) === '0') {
	           fls = fls.substr (1);
		    }
	        info.keywords = Set.add(info.keywords, (fls+'mm'));
	        info.keywords = Set.add(info.keywords, (fls+'mm_equiv'));
	        //info.keywords = Set.add(info.keywords, ('Mult:'+descBits.multiplier));
		}
    }
    if ((descBits.aperture === undefined) || (descBits.aperture < descBits.minAperture)) {
    	descBits.aperture = descBits.minAperture;
    }
    return descBits;
}

/////////////////////////////////////////////////////////////

function aspectDesc(doc)
{
	'use strict';
    var info = doc.info;
    var l = Math.max(doc.width,doc.height);
    var s = Math.min(doc.width,doc.height);
    var aspect = (l/s);
    var wide = (doc.width > doc.height);
    if (aspect>2.36) {
    	info.keywords = Set.add(info.keywords, 'Panorama');
    	if (!wide) {
	   		info.keywords = Set.add(info.keywords, 'Tall');
	   	}
    } else if (aspect>2.3) {
    	info.keywords = Set.add(info.keywords, (wide?'2.35:1':'1:2.35'));	
    } else if (aspect>1.97) {
    	info.keywords = Set.add(info.keywords, (wide?'2:1':'1:2'));	
    } else if (aspect>1.68) {
	   	info.keywords = Set.add(info.keywords, (wide?'16:9':'9:16'));
     } else if (aspect>1.45) {
    	info.keywords = Set.add(info.keywords, (wide?'3:2':'2:3'));	
    } else if (aspect>1.25) {
    	info.keywords = Set.add(info.keywords, (wide?'4:3':'3:4'));	
    } else {
    	info.keywords = Set.add(info.keywords, 'Square');	    	
    	info.keywords = Set.add(info.keywords, '1:1');	    	
    }
}

////////////////////////////////////////////

function main()
{
	'use strict';
    if (!(app.documents.length > 0)) {    // stop if no document is opened.
		alert('Sorry, No Current Document');
		return;
    }
    var strtRulerUnits = app.preferences.rulerUnits;
    if (strtRulerUnits !== Units.PIXELS) {
		app.preferences.rulerUnits = Units.PIXELS; // selections always in pixels
    }
    var info = app.activeDocument.info;
    var initKeys = info.keywords.length;
    var msgs = '';
    if (initKeys > 0) {
		msgs = (msgs + initKeys.toString() + ' key'+((initKeys>1)?'s':'')+' already defined');
    }
    var newKeys = [];
    if (app.activeDocument.mode === DocumentMode.GRAYSCALE) {
		newKeys = newKeys.concat(['BW','Black_and_White','Black_&_White','Monochrome']);
    }
    var dt = new Date();
    var thisYear = dt.getFullYear();
    var thisYearS = thisYear.toString();
    if (info.CreationDate === '') {
		info.creationDate = dt.toString();
    }
    newKeys = newKeys.concat(Person.commonTags.concat([Person.fullname,Person.city,Person.region]));
    //
    // keywords added to doc...
    //
    addKeys(info,newKeys);
    var descBits = scanEXIFstuff(app.activeDocument);
    aspectDesc(app.activeDocument);
    if (descBits.alertText !== '') {
		if (msgs !== '') { msgs += '\n'; }
		msgs += descBits.alertText;
    }
    info.author = Person.fullname;
    info.credit = Person.fullname;
    info.authorPosition = Person.relation;
    info.copyrighted = CopyrightedType.COPYRIGHTEDWORK;
    info.copyrightNotice = '©'+thisYearS+' '+Person.fullname;
    info.ownerUrl = Person.url;
    if (info.title === '') {
		info.title = noExtension(app.activeDocument.name);
    }
    // alert("New Title is ("+info.title+")");
    if (info.headline === '') {
		info.headline = info.title;
    }
   if (info.caption === '') {
		info.caption = (descBits.camera+
						descBits.lens+
						descBits.shutter+
						descBits.aperture+
						descBits.iso+
						descBits.flash+'\n'+
						Person.blog+'\n'+
						noExtension(app.activeDocument.name));
		info.captionWriter = Person.fullname;
    }
    if (info.city === '') {info.city = Person.city; }
    if (info.provinceState === '') {info.provinceState = Person.region; }
    if (info.country === '') { info.country = Person.country; }
    if (initKeys == 0) {
		info.keywords = Set.add(info.keywords, Person.reminder);
    }
    if (msgs !== '') {
		alert (msgs);
    }
    if (strtRulerUnits !== Units.PIXELS) {
		app.preferences.rulerUnits = strtRulerUnits;
    }
}

main();

// eof
