// $Id$
// rev 21 feb 2020
//
// Intended usage:
// Label Pix

/* global app, alert, Units, DocumentMode, CopyrightedType */

/* jshint ignore: start */
#target photoshop
app.bringToFront();
/* jshint ignore: end */

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
	altNames: ["K.Bjorke botzilla.com","K. Bjorke"],
	url: 'http://www.kevin-bjorke.com/',
	blog: 'http://www.botzilla.com/',
	relation: 'Owner',
	city: 'San Francisco',
	region: 'California',
	country: 'USA',
	commonTags: ['Bjorke', 'Botzilla.com', 'SF', 'Bay Area',
			'Petaluma', 'Sonoma County'], // added to every pic
	reminder: 'needs_tags' // added only if the image has NO tags before being processed...
};

var Vendor = { // an enum
	lumix: 'Lumix',
	fuji: 'Fuji',
	canon: 'Canon',
	leica: 'Leica',
	google: 'Google',
    olympus: 'Olympus',
	samsung: 'Samsung',
	ricoh: 'Ricoh',
};

var Cameras = {
    'DMC-LX1': {
    	info: ['LX1','DMC_LX1'],
		brand: Vendor.lumix,
		multiplier: 4.4,
		camera: 'LX1',
    },
    'DMC-LX2': {
    	info: ['LX2','DMC_LX2'],
		brand: Vendor.lumix,
		multiplier: 4.4,
		camera: 'LX2',
    },
    'DMC-LX3': {
    	info: ['LX3','DMC_LX3'],
		brand: Vendor.lumix,
		multiplier: 4.67,
		camera: 'LX3',
    },
    'DMC-LX5': {
    	info: ['LX5','DMC_LX5'],
		brand: Vendor.lumix,
		multiplier: 4.67,
		camera: 'LX5',
    },
    'DMC-LX7': {
    	info: ['LX7','DMC_LX7'],
		brand: Vendor.lumix,
		multiplier: 4.67,
		camera: 'LX7',
    },
    'X100S': {
    	info: ['Fuji X100s','X100s'],
		brand: Vendor.fuji,
		multiplier: (35.0/23.0),
		camera: 'X100s',
    },
    'X100T': {
    	info: ['Fuji X100T','X100T'],
		brand: Vendor.fuji,
		multiplier: (35.0/23.0),
		camera: 'X100T',
    },
    'X100F': {
    	info: ['Fuji X100F','X100F'],
		brand: Vendor.fuji,
		multiplier: (35.0/23.0),
		camera: 'X100F',
    },
    'X100V': {
        info: ['Fuji X100F','X100F'],
        brand: Vendor.fuji,
        multiplier: (35.0/23.0),
        camera: 'X100F',
    },
    'X-T1': {
    	info: ['Fuji X-T1','X-T1'],
		brand: Vendor.fuji,
		multiplier: (35.0/23.0),
		camera: 'X-T1',
    },
    'X-Pro2': {
    	info: ['Fuji X-Pro2','X-Pro2'],
		brand: Vendor.fuji,
		multiplier: (35.0/23.0),
		camera: 'X-Pro2',
    },
    'M Monochrom': {
    	info: ['Leica','Leica M','M Monochrom','Monochrom','M','Monochrome'],
    	brand: Vendor.leica,
		multiplier: 1.0,
		camera: 'M Monochrom',
    },
    'Canon EOS 5D': {
    	info: ['5D','EOS','Canon 5D'],
	    brand: Vendor.canon,
	    multiplier: 1.0,
		camera: '5D',
    },
    'Canon EOS 40D': {
    	info: ['40D','EOS','Canon 40D'],
	    brand: Vendor.canon,
	    multiplier: 1.6,
		camera: '40D',
    },
    'Canon EOS DIGITAL REBEL': {
    	info: ['300D','EOS'],
	    brand: Vendor.canon,
	    multiplier: 1.6,
		camera: '300D',
    },
    'RICOH THETA S': {
    	info: ['Ricoh','Theta S','Theta','Panorama', 'Spherical'],
    	brand: Vendor.ricoh,
		camera: 'Ricoh Theta S',
    },
    'SM-G920T': {
    	info: ['Samsung','Phone','Galaxy 6'],
    	brand: Vendor.samsung,
		camera: 'Samsung Galaxy 6',
    },
    'Glass1': {
    	info: ['Google','Glass','Google Glass','Android'],
    	brand: Vendor.google,
	    multiplier: 8.0,
		camera: 'Google Glass',
	},
};

var Lenses = {
	'XF18-55mmF2.8-4 R LM OIS': {
		info: ['18-55mm','f/2.8'],
	},
	'XF90mmF2 R LM WR': {
		info: ['f/2.0'],
	},
	'XF56mmF1.2 R': {
		info: ['f/1.2'],
	},
	'XF35mmF1.4 R': {
		info: ['f/1.4'],
	},
	'XF35mmF2 R WR': {
		info: ['f/2.0'],
	},
    'XF23mmF1.4 R': {
        info: ['f/1.4'],
    },
	'XF23mmF2 R WR': {
		info: ['f/2.0'],
	},
	'XF18mmF2 R': {
		info: ['f/2.0'],
	},
	'XF16mmF1.4 R WR': {
		info: ['f/1.4'],
	},
    'XF14mmF2.8 R': {
        info: ['f/1.4'],
    },
	'Leica Summicron-M 50mm f/2 (IV, V)': {
		info: ['Summicron','Summicron-M','f/2'],
	},

};

var AdaptedLenses = {
	45: {
		info: ['Zeiss','Contax','Planar','f/2','Fotodiox','planar245','carlzeiss'],
		minAperture: 2
	},
	90: {
		info: ['Zeiss','Contax','Sonnar','f/2.8','Fotodiox','sonnar2890','carlzeiss'],
		minAperture: 2.8
	},
	50: {
		info: ['Meike','f/2.0'],
		minAperture: 2.0
	},
	51: { //hack
		info: ['Canon','Canon FD','f/1.8','Fotodiox'],
		minAperture: 1.8
	},
	16: {
		info: ['Rokinon','f/2.8'],
		minAperture: 2.8
	},
};


/// from xlib ///////////////////////////////////////

//
// Set
//     these are a collection of functions for operating
//     on arrays as proper Set: each entry in the array
//     is unique in the array. This is useful for things
//     like doc.info.keywords
//
Set = function Set() {}; // funny idiom unique to PS?
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
  var obj = {}; // new Object();
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

function jobName(name) { // document name input
  'use strict';
  if (!name) { return 'empty_jobname'; }
  base = name.replace(/(_[A-Z0-9]{4}\d{4}.*)/,''); // strip back
  if (base === '') { return 'no_jobname'; }
  return base.replace(/[a-zA-Z0-9]*_/,''); // strip front, if there is one
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
	var camera = Cameras[ModelName];
	if (camera) {
		addKeys(info,camera.info);
		for (var v in camera) {
			if (v !== 'info') {
				descBits[v] = camera[v];
			}
		}
	} else {
		if (descBits.alertText !== '') {
			descBits.alertText += '\n';
		}
		descBits.alertText += ('Model: ="' + ModelName + '"');
		descBits.camera = ('Camera: '+ModelName);
    }
	return info;
}

// stub to provide modern-style string "trim()"
function trim11 (str) {
	'use strict';
    str = str.replace(/^\s+/, '');
    for (var i = str.length - 1; i >= 0; i--) {
        if (/\S/.test(str.charAt(i))) {
            str = str.substring(0, i + 1);
            break;
        }
    }
    return str;
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
    var knownLens = false;
    var knownPerson = false;
    var descBits = {
    	camera: 'Digital',
    	lens: '',
    	shutter: '',
    	aperture: '',
    	iso: '',
    	flash: '',
    	alertText: '',
    	multiplier: 1.6,
    	brand: 'Ubuntu',
    	minAperture: 1.4,
    };
    for (var i = 0; i < info.exif.length; i++) {
		var q = info.exif[i];
		var qName = trim11(q[1]);
		switch (q[0]) {
			case 'Make':
			    info.keywords = Set.add(info.keywords, qName);
			    break;
			case 'Model':
				cameraID(qName,info,descBits);  // identify specific model of camera
			    break;
			case 'Date Time':
			case 'Date Time Original':
			    info.keywords = Set.add(info.keywords,q[1].substr(0,4));
			    break;
			case 'Focal Length in 35mm Film':
			    FL = parseFloat(q[1]);
			    break;
			case 'Shutter Speed':
				descBits.shutter = (' - '+q[1]);
			    break;
			case 'Focal Length':
			    oFL = parseFloat(q[1]);
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
				if (q[1].match(/[0-9]/) && !knownPerson) {
                    if (q[1].indexOf(Person.fullName) < 0) {
    					descBits.alertText += ('\nEXIF Copyright Notice:\n"'+q[1]+'"');
                    }
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
			    var flashVal = parseInt(q[1]);
			    if ((flashVal < 16) && (flashVal > 0)) {
                    descBits.alertText += ('\nflashVal: '+flashVal+'');
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
			    knownPerson = (q[1].indexOf(Person.fullname) !== -1);
			    for (var ip=0; ip<Person.altNames.length; ip+=1) {
					knownPerson |= (q[1] === Person.altNames[ip]);
			    }
			    if (!knownPerson) {
    			    if (descBits.alertText !== '') {
    					descBits.alertText += '\n';
    			    }
    			    descBits.alertText += ('Artist tag: "'+q[1]+'"');
                }
			    break;
			case 'Exposure Program':
				info.keywords = Set.add(info.keywords, q[1]);
				break;
			case 'EXIF tag 42036': // X-T1: "XF18-55mmF2.8-4 R LM OIS'
				var lens = Lenses[q[1]];
				if (lens) {
					addKeys(info,lens.info);
				} else {
					descBits.alertText += (q[1]);
				}
				knownLens = true;
				break;
			case 'Metering Mode': // debugMsg=true; // e.g. "Spot"
			case 'Orientation': // debugMsg=true;
			case 'Color Space':
			case 'GPS Version': // theta s
			case 'GPS Image Direction Ref': // theta s
			case 'GPS Image Direction': // theta s
			case 'Image Description': // theta s single \n char
			case 'Components Configuration': // theta s
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
			case 'Brightness Value': // first seen on x100s
			case 'Subject Distance Range': // first seen on x100s
			case 'Subject Distance': // first seen on Glass
			case 'Image Unique ID': // first seen on Glass
			case 'EXIF tag 258': // '8 8 8' Bits Per Sample
			case 'EXIF tag 262': // 'RGB' Photometric Interpretation
			case 'EXIF tag 277': // "3' Samples Per Pixel (channels)
			case 'EXIF tag 34864': // "1" on XP2 JPG or RAW... FileSource? Colorspace? SensitivityType?
			case 'EXIF tag 42037': // lens ser #
			case 'EXIF tag 42034': // lens info "rdf:Seq"
			case 'EXIF tag 42035': // X-T1: "FUJIFILM' - Lens Maker I think
			case 'EXIF tag 42033': // X100F serial# (LX7 too?)
			case 'EXIF tag 41483': // Glass, unknown
                break;
                // descBits.alertText += ('\nTag '+q[0]+': "'+qName+'"');
				// break;
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
    if (descBits.brand === Vendor.lumix) {
    	// used to accomodate the Leica/Panasonic relationship
    	addKeys(info,['Leica','Lumix','Leicasonic','Panaleica']);
    } else if (descBits.brand === Vendor.fuji) {
		// Various "Fuji X' cameras
    	addKeys(info,['Fuji','Fujifilm','Fuji X',('Fujifilm '+descBits.camera)]);
    	var aLens = AdaptedLenses[oFL];
    	if (aLens && !knownLens) {
    		addKeys(info,aLens.info);
    		descBits.minAperture = aLens.minAperture;
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
	    if (descBits.multiplier !== 1.0) {
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
    if (app.documents.length < 1) {    // stop if no document is opened.
		alert('Sorry, No Current Document');
		return;
    }
    var strtRulerUnits = app.preferences.rulerUnits;
    if (strtRulerUnits !== Units.PIXELS) {
		app.preferences.rulerUnits = Units.PIXELS; // selections always in pixels
    }
    var info = app.activeDocument.info;
    var msgs = '';
    var initKeys = info.keywords.length;
    // this dialog message temporarily disabled....
    //if (initKeys > 0) {
	//	msgs = (msgs + initKeys.toString() + ' key'+((initKeys>1)?'s':'')+' already defined');
    //}
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
	newKeys = newKeys.concat( [ jobName(app.activeDocument.name) ] );
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
    info.copyrightNotice = ' © '+thisYearS+' '+Person.fullname;
    info.ownerUrl = Person.url;
    if (info.title === '') {
		var t = noExtension(app.activeDocument.name);
		info.title = t.replace(/^bjorke_/,'');
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
    if (initKeys === 0) {
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
