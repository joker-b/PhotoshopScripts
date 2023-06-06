//
// Intended usage:
// Label Pix

/* global app, alert, Units, DocumentMode, CopyrightedType */

/* jshint ignore: start */
#target photoshop
app.bringToFront();
/* jshint ignore: end */

// TODO -- look for jobname_xxx_###.ext pattern in name, insert jobname into Info if found
// TODO - identify scanner type via ICC Profile
// TODO - handle 'lens:##' keywords - esp for adapted lenses
// TODO - handle 'format:##' keywords
// TODO - handle 'camera:##' keywords
// TODO - handle camera brand keywords & lens brand keywords
// TODO - handle other film-related (scanning) keywords

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
    altNames: ["K.Bjorke botzilla.com","K. Bjorke", 'K BJORKE', 'KEVIN BJORKE'],
    url: 'http://www.kevin-bjorke.com/',
    blog: 'http://photorant.com',
    relation: 'Owner',
    city: 'San Francisco',
    region: 'California',
    country: 'USA',
    commonTags: ['Bjorke', 'Botzilla.com'],
    reminder: 'needs_tags' // added only if the image has NO tags before being processed...
};

var Vendor = { // an enum
    lumix: 'Lumix',
    fuji: 'Fuji',
    canon: 'Canon',
    leica: 'Leica',
    nikon: 'Nikon',
    minolta: 'Minolta',
    bronica: 'Bronica',
    yashica: 'Yashica',
    google: 'Google',
    olympus: 'Olympus',
    samsung: 'Samsung',
    ricoh: 'Ricoh',
    zeiss: 'Zeiss',
};

var LensFamilyNames = { // various typical keywords for adapted lenses - hints
    'Voigtlander': { keywords: [ 'Cosina'] },
    'Nikkor': { keywords: [Vendor.nikon], },
    'Fujinon': { keywords: [Vendor.fuji], },
    'Summicron': { keywords: [Vendor.leica], },
    'Summilux': { keywords: [Vendor.leica], },
    'Summitar': { keywords: [Vendor.leica], },
    'Elmar': { keywords: [Vendor.leica], },
    'Elmarit': { keywords: [Vendor.leica], },
    'Tele-Elmarit': { keywords: [Vendor.leica], },
    'Rokkor': { keywords: [Vendor.minolta], },
    'M-Rokkor': { keywords: [Vendor.leica, Vendor.minolta], },
    'Ultron': { keywords: ['Voigtlander'], },
    'Nokton': { keywords: ['Voigtlander'], },
    'TTArtisans': { keywords: ['TT'] },
    'Planar': { keywords: [Vendor.zeiss] },
    'Biogon': { keywords: [Vendor.zeiss] },
    'Sonnar': { keywords: [Vendor.zeiss] },
    'FD': { keywords: [Vendor.canon] },
};

//
// "Cameras" here can also include scanners, renderers, or programs like Midjourney
//
var Cameras = {
    'DMC-LX1': {
        keywords: ['LX1','DMC_LX1','Leica','Lumix'],
        brand: Vendor.lumix,
        multiplier: 4.4,
        camera: 'LX1',
    },
    'DMC-LX2': {
        keywords: ['LX2','DMC_LX2','Leica','Lumix'],
        brand: Vendor.lumix,
        multiplier: 4.4,
        camera: 'LX2',
    },
    'DMC-LX3': {
        keywords: ['LX3','DMC_LX3','Leica','Lumix'],
        brand: Vendor.lumix,
        multiplier: 4.67,
        camera: 'LX3',
    },
    'DMC-LX5': {
        keywords: ['LX5','DMC_LX5','Leica','Lumix'],
        brand: Vendor.lumix,
        multiplier: 4.67,
        camera: 'LX5',
    },
    'DMC-LX7': {
        keywords: ['LX7','DMC_LX7','Leica','Lumix'],
        brand: Vendor.lumix,
        multiplier: 4.67,
        camera: 'LX7',
    },
    'DC-S5M2': {
        keywords: ['S5ii','L-Mount','Lumix','S5M2'],
        brand: Vendor.lumix,
        multiplier: 1.0,
        camera: 'S5ii',
    },
    'X100S': {
        keywords: ['Fuji X100s','X100s'],
        brand: Vendor.fuji,
        multiplier: (35.0/23.0),
        camera: 'X100s',
    },
    'X100T': {
        keywords: ['Fuji X100T','X100T'],
        brand: Vendor.fuji,
        multiplier: (35.0/23.0),
        camera: 'X100T',
    },
    'X100F': {
        keywords: ['Fuji X100F','X100F'],
        brand: Vendor.fuji,
        multiplier: (35.0/23.0),
        camera: 'X100F',
    },
    'X100V': {
        keywords: ['Fuji X100F','X100F'],
        brand: Vendor.fuji,
        multiplier: (35.0/23.0),
        camera: 'X100F',
    },
    'X-T1': {
        keywords: ['Fuji X-T1','X-T1'],
        brand: Vendor.fuji,
        multiplier: (35.0/23.0),
        camera: 'X-T1',
    },
    'X-Pro2': {
        keywords: ['Fuji X-Pro2','X-Pro2'],
        brand: Vendor.fuji,
        multiplier: (35.0/23.0),
        camera: 'X-Pro2',
    },
    'X-E3': {
        keywords: ['Fuji X-E3','X-E3'],
        brand: Vendor.fuji,
        multiplier: (35.0/23.0),
        camera: 'X-E3',
    },
    'M Monochrom': {
        keywords: [Vendor.leica, 'M Monochrom', 'Monochrom',
           'Leica Mono', 'Mono', 'Black and White', 'MM'],
        brand: Vendor.leica,
        multiplier: 1.0,
        camera: 'M Monochrom',
    },
    'LEICA M MONOCHROM (Typ 246)': {
        keywords: [Vendor.leica, 'Monochrom 246', 'Monochrom', 'M246'],
        brand: Vendor.leica,
        multiplier: 1.0,
        camera: 'Leica M246',
    },
    'Canon EOS 5D': {
        keywords: ['5D','EOS','Canon 5D'],
        brand: Vendor.canon,
        multiplier: 1.0,
        camera: '5D',
    },
    'Canon EOS 40D': {
        keywords: ['40D','EOS','Canon 40D'],
        brand: Vendor.canon,
        multiplier: 1.6,
        camera: '40D',
    },
    'Canon EOS DIGITAL REBEL': {
        keywords: ['300D','EOS'],
        brand: Vendor.canon,
        multiplier: 1.6,
        camera: '300D',
    },
    // /// CAMCORDER //////////////////////////
    'Canon VIXIA HF S11': {
        keywords: ['Camcorder','VIXIA'],
        brand: Vendor.canon,
        multiplier: (435.0/64.0),
        camera: 'HFS11',
    },
    // SPHERICAL //////////////////////////////
    'RICOH THETA S': {
        keywords: ['Ricoh','Theta S','Theta','Panorama', 'Spherical'],
        brand: Vendor.ricoh,
        camera: 'Ricoh Theta S',
    },
    // ///////////// PHONES/ANDROID //////////////
    'SM-SM-S918U1': {
        keywords: ['Samsung','Phone','S23 Ultra'],
        brand: Vendor.samsung,
        camera: 'Samsung S23 Ultra',
    },
    'Galaxy S23 Ultra': {
        keywords: ['Samsung','Galaxy', 'Phone', 'S23 Ultra'],
        brand: Vendor.samsung,
        camera: 'Samsung S23 Ultra',
    },
    'SM-G920T': {
        keywords: ['Samsung','Phone','Galaxy 6'],
        brand: Vendor.samsung,
        camera: 'Samsung Galaxy 6',
    },
    'Pixel 3': {
        keywords: ['Google','Phone','Pixel'],
        brand: Vendor.google,
        camera: 'Google Pixel 3',
    },
    'Glass1': {
        keywords: ['Google','Glass','Google Glass','Android'],
        brand: Vendor.google,
        multiplier: 8.0,
        camera: 'Google Glass',
    },
    // ////// FILM CAMERAS //////
    'Contax G2': {
        keywords: ['Contax','G2', Vendor.zeiss, 'Film'],
        brand: Vendor.contax,
        multiplier: 1.0,
        camera: 'G2',
        film: true,
    },
    'Nikon F2': {
        keywords: ['Nikon','F2', 'Film'],
        brand: Vendor.nikon,
        multiplier: 1.0,
        camera: 'F2',
        film: true,
    },
    'Leica CL': {
        keywords: ['Leica', 'Leica CL', 'Leitz Minolta', 'Leitz', 'Minolta', 'M', 'Film'],
        brand: Vendor.leica,
        multiplier: 1.0,
        camera: 'Leica CL',
        film: true,
    },
    'Leica M5': {
        keywords: ['Leica', 'Leica M5', 'Leitz', 'Leica M', 'Film'],
        brand: Vendor.leica,
        multiplier: 1.0,
        camera: 'Leica M5',
        film: true,
    },
    'Canon AE-1': {
        keywords: ['Canon','AE-1', 'Film'],
        brand: Vendor.canon,
        multiplier: 1.0,
        camera: 'AE-1',
        film: true,
    },
    'Bronica RF645': {
        keywords: ['Bronica','RF645', 'RF', 'Film'],
        brand: Vendor.bronica,
        multiplier: 50.0/65.0,
        camera: 'RF645',
        film: true,
    },
    'Yashicamat 124G': {
        keywords: ['Yashica','Yashicamt', '124', '124G', 'Film'],
        brand: Vendor.yashica,
        multiplier: 50.0/80.0,
        camera: '124G',
        film: true,
    },
    // Scanners etc
    'EZ Controller': {
        keywords: ['Scanner', 'Film'],
        brand: 'Noritsu',
        camera: 'Noritsu',
        film: true,
    },
    'MJ': {
        keywords: ['Generative', 'Midjourney'],
        brand: 'Midjourney',
        camera: 'Midjourney',
        film: true, // sort of
    }
};

var LensCatalog = {
    //
    // Fuji Lenses
    //
    'XF18-55mmF2.8-4 R LM OIS': {
        keywords: ['kit lens', 'zoom'],
        minAperture: 'f/2.8-4',
    },
    'XF90mmF2 R LM WR': {
        keywords: [],
        minAperture: 'f/2.0',
        primeLength: 90,
    },
    'XF56mmF1.2 R': {
        keywords: [],
        minAperture: 'f/1.2',
        primeLength: 56,
    },
    'XF35mmF1.4 R': {
        keywords: [],
        minAperture: 'f/1.4',
        primeLength: 35,
    },
    'XF35mmF2 R WR': {
        keywords: [],
        minAperture: 'f/2.0',
        primeLength: 35,
    },
    'XF23mmF1.4 R': {
        keywords: [],
        minAperture: 'f/1.4',
        primeLength: 23,
    },
    'XF23mmF2 R WR': {
        keywords: [],
        minAperture: 'f/2.0',
        primeLength: 23,
    },
    'Fujinon 23/2': { // for X100 series
        keywords: ['X100'],
        minAperture: 'f/2.0',
        primeLength: 23,
    },
    'XF18mmF2 R': {
        keywords: [],
        minAperture: 'f/2.0',
        primeLength: 18,
    },
    'XF16mmF1.4 R WR': {
        keywords: [],
        minAperture: 'f/1.4',
        primeLength: 16,
    },
    'XF14mmF2.8 R': {
        keywords: [],
        minAperture: 'f/1.4',
        primeLength: 14,
    },
    'TTArtisans 2.8/40 Macro': {
        keywords: ['TTArtisans', 'Macro', Vendor.fuji],
        minAperture: 'f/2.8',
        primeLength: 40,
        family: 'TTArtisans',
    },
    'Nokton-X 23/1.2': {
        keywords: ['Nokton', 'Voigtlander', Vendor.fuji],
        minAperture: 'f/1.2',
        primeLength: 23,
        family: 'Nokton',
    },
    //
    // Lenses Possibly without Digital Coupling
    //
    // Leica M-Mount
    //
    'Tele-Elmarit 1:2.8/90': { 
        keywords: ['Tele-Elmarit', 'Elmarit', Vendor.leica],
        minAperture: 'f/2.8',
        primeLength: 90,
        family: 'Elmarit',
    },
    'Leica Summicron-M 50mm f/2 (IV, V)': {
        keywords: ['Summicron'],
        minAperture: 'f/2',
        primeLength: 50,
        family: 'Summicron',
    },
    'TTArtisans-M 1:1.4/50 ASPH.': {
        keywords: ['TTArtisans', 'Asph'], // fake coded!
        minAperture: 'f/1.4 ASPH',
        primeLength: 50,
        family: 'TTArtisans',
    },
    'Zeiss Planar T* 2/50 ZM': {
        keywords: [Vendor.zeiss, 'Planar'],
        minAperture: 'f/2',
        primeLength: 50,
        family: 'Zeiss',
    },
    'Zeiss C Sonnar T* 1,5/50 ZM': {
        keywords: [Vendor.zeiss, 'Sonnar'],
        minAperture: 'f/1.5',
        primeLength: 50,
        family: 'Zeiss',
    },
    'M-Rokkor 1:2/40': {
        keywords: ['Summicron-C', 'Rokkor', 'M-Rokkor'],
        minAperture: 'f/2',
        primeLength: 40,
        family: 'M-Rokkor',
    },
    'Voigtlander VM 35mm f/2 Ultron Aspherical': { 
        keywords: ['Ultron', 'Voigtlander', 'Asph'], // fake-coded!
        minAperture: 'f/2 Asph',
        primeLength: 35,
        family: 'Ultron',
    },
    'Zeiss Distagon T* 1,4/35 ZM': {
        keywords: [Vendor.zeiss, 'Biogon'],
        minAperture: 'f/1.4',
        primeLength: 35,
        family: 'Zeiss',
    },
    'Zeiss Biogon T* 2,8/28 ZM': {
        keywords: [Vendor.zeiss, 'Biogon'],
        minAperture: 'f/2.8',
        primeLength: 28,
        family: 'Zeiss',
    },
    'M-Rokkor 1:2.8/28': {
        keywords: ['Rokkor', 'Minolta', 'M-Rokkor'],
        minAperture: 'f/2.8',
        primeLength: 28,
        family: 'M-Rokkor',
    },
    //
    // L-Mount
    //
    'LUMIX S 50/F1.8': {
        keywords: [Vendor.lumix, 'Normal'],
        minAperture: 'f/1.8',
        primeLength: 50,
        family: 'Lumix',
    },
    // shortcuts
    'TTArtisans': {
        remap: 'TTArtisans-M 1:1.4/50 ASPH.',
    },
    'Ultron': {
        remap: 'Voigtlander VM 35mm f/2 Ultron Aspherical',
    },
    'Ultron-M 1:2/35 Asph': {
        remap: 'Voigtlander VM 35mm f/2 Ultron Aspherical',
    },
    //
    // Leica Remaps
    //
    'Elmarit-M 1:2.8/90': { remap: 'Tele-Elmarit 1:2.8/90' },
    'Summilux-M 1:1.4/50 ASPH.': { remap: 'TTArtisans-M 1:1.4/50 ASPH.', },
    'Summilux-M 1:1.4/50': { remap: 'Zeiss C Sonnar T* 1,5/50 ZM', },
    'Summilux-M 1:1.4/35 ASPH.': { remap: 'Zeiss Distagon T* 1,4/35 ZM', },
    'Summicron-M 1:2/50': { remap: 'Zeiss Planar T* 2/50 ZM', },
    'Summicron-M 1:2/35': { remap: 'Voigtlander VM 35mm f/2 Ultron Aspherical', },
    'Summicron-M 1:2/35 ASPH.': { remap: 'Voigtlander VM 35mm f/2 Ultron Aspherical', },
    // TODO: how to best map 28mm?
    'Elmarit-M 1:2.8/28': { remap: 'Zeiss Biogon T* 2,8/28 ZM' },
    'Elmarit-M 1:2.8/28 ASPH.': { remap: 'Zeiss Biogon T* 2,8/28 ZM' },
    'Elmarit-M 1:2.8/28 Leitz': { remap: 'Zeiss Biogon T* 2,8/28 ZM' }, // both editions
    // Shorthand names
    'Biogon 28': { remap: 'Zeiss Biogon T* 2,8/28 ZM' },
    'Distagon 35': { remap: 'Zeiss Biogon T* 2,8/28 ZM' },
    'Sonnar 50': { remap: 'Zeiss C Sonnar T* 1,5/50 ZM' },
    'Planar 50': { remap: 'Zeiss Planar T* 2/50 ZM' },
    'Elmarit 90': { remap: 'Tele-Elmarit 1:2.8/90' },
    'Rokkor-M': { remap: 'M-Rokkor 1:2/40' },
    'TT 50': { remap: 'TTArtisans-M 1:1.4/50 ASPH.' },

    //
    // Contax
    //
    'Contax Biogon 2.8/21': {
        keywords: [Vendor.zeiss, 'Contax', 'Biogon'],
        minAperture: 'f/2.8',
        primeLength: 21,
        family: 'Biogon',
    },
    'Contax Biogon 2.8/28': {
        keywords: [Vendor.zeiss, 'Contax', 'Biogon'],
        minAperture: 'f/2.8',
        primeLength: 28,
        family: 'Biogon',
    },
    'Contax Planar 2/35': {
        keywords: [Vendor.zeiss, 'Contax', 'Planar'],
        minAperture: 'f/2',
        primeLength: 35,
        family: 'Planar',
    },
    'Contax Planar 2/45': {
        keywords: [Vendor.zeiss, 'Contax', 'Planar'],
        minAperture: 'f/2',
        primeLength: 45,
        family: 'Planar',
    },
    'Contax Sonnar 2.8/90': {
        keywords: [Vendor.zeiss, 'Contax', 'Sonnar'],
        minAperture: 'f/2.8',
        primeLength: 90,
        family: 'Sonnar',
    },
    // Nikon
    'Micro-Nikkor 55mm f/3.5': {
        keywords: [Vendor.nikon, 'Micro-Nikkor', 'Nikkor'],
        minAperture: 'f/3.5',
        primeLength: 55,
        family: 'Micro-Nikkor',
    },
    'Nikkor 50mm f/1.4': {
        keywords: [Vendor.nikon, 'Nikkor'],
        minAperture: 'f/1.4',
        primeLength: 50,
        family: 'Nikkor',
    },
    'Nikkor-O 35mm f/2': {
        keywords: [Vendor.nikon, 'Nikkor'],
        minAperture: 'f/2',
        primeLength: 35,
        family: 'Nikkor-O',
    },
    'Nikkor-P 10.5cm f/2.5': {
        keywords: [Vendor.nikon, 'Nikkor'],
        minAperture: 'f/2.5',
        primeLength: 105,
        family: 'Nikkor-P',
    },
    'Nikkor-ED 300mm f/4.5': {
        keywords: [Vendor.nikon, 'Nikkor'],
        minAperture: 'f/4.5',
        primeLength: 300,
        family: 'ED',
    },
    // "cold" Fuji X
    'Meike-X 2/50': {
        keywords: ['Meike'],
        minAperture: 'f/2',
        primeLength: 50,
    },
    'Rokinon-X 2.8/16': {
        keywords: ['Rokinon'],
        minAperture: 'f/2.8',
        primeLength: 16,
    },
    // Canon FD
    'Canon-FD 50mm f1.8': {
        keywords: [Vendor.canon, 'FD'],
        minAperture: 'f/1.8',
        primeLength: 50,
    },
    'not selected' : {
        keywords: ['lens unknown'],
        minAperture: 'f/?',
    },
};

var AdaptedFocalLengths = {
    28: 'M-Rokkor 1:2.8/28', // Contax Skipped
    40: 'M-Rokkor 1:2/40',
    45: 'Contax Planar 2/45',
    35: 'Contax Planar 2/35', // Nikkor-O skipped
    50: 'Nikkor 50mm f/1.4',
    55: 'Micro-Nikkor 55mm f/3.5',
    90: 'Contax Sonnar 2.8/90',
    300: 'Nikkor-ED 300mm f/4.5',
    49: 'Meike-X 2/50', // hack
    51: 'Canon-FD 50mm f1.8', // hack
    16: 'Rokinon-X 2.8/16',
};

// much of this script is about manipulating elements of this global object
var DescBits = {
    camera: 'Scanned',
    alertText: '',
    multiplier: 1.0,
    equivFL: 0,
    brand: 'Bjorke',
    alert : function(text) {
        this.alertText += text;
    }
};

// shortcut to current document .info field, set by main()
var Info;

// METHODS BEGIN /////

function guess_lens(lens_name) {
    guess = /([0-9.])*\s?mm/.exec(lens_name);
    if (guess) {
        return {
            keywords: ['Adapted '+guess[0], lens_name],
            primeLength: Number(guess[1]),
            minAperture: 'f/?'
        }
    } else {
        // lt = typeof(lens_name);
        // alert('no good guess for "'+lens_name+'" ('+lt+')');
        return null
    }
}

function findLens(lens_name) {
    var lens_obj, LN;
    // alert('looking for "'+lens_name+'"');
    if (typeof(lens_name) == 'string') {
        LN = lens_name.replace(/\s*$/, '');
    } else {
        LN = toString(lens_name);
        LN = LN.replace(/\s*$/, '');
    }
    lens_obj = LensCatalog[LN];
    if (lens_obj) {
        if (lens_obj.remap !== undefined) {
            // alert('remapping "'+lens_name+'" to "'+lens_obj.remap+'"');
            return findLens(lens_obj.remap);
        }
    } else {
        lens_obj = guess_lens(lens_name);
    }
    //if (!lens_obj) {
        // alert('no lens found for "'+lens_name+'"/"'+LN+'"');
    //}
    return lens_obj;
}

function findAdaptedLens(focal_length) {
    a = AdaptedFocalLengths[focal_length];
    if (!a) return(undefined);
    //alert('adapted name for '+focal_length+'mm is "'+a+'"');
    return findLens(a);
}

/// from AdobeSupport "SuperMerlin" //////////////////////////////////

function _getXmpArrayItems(ns, prop, Xmp){
    var arrItem=[];
    var items = Xmp.countArrayItems(ns, prop);
    for(var i = 1; i <= items; i++){
            arrItem.push(Xmp.getArrayItem(ns, prop, i));
    }
    return arrItem;
};

// guessing -- was this scanned, or generated? Only used if no actual camera data.
function scanned_or_made() {
    if (ExternalObject.AdobeXMPScript == undefined) {
        ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
    }
    var xmp = new XMPMeta(activeDocument.xmpMetadata. rawData);
    var keys = _getXmpArrayItems(XMPConst.NS_DC, 'seed', xmp); // watching for generated pix
    /////////////////// Do with as you wish
    if (keys.length < 1) return 'Scanned';
    addKey(("Generator Seed "+keys[0]));
    var keys = _getXmpArrayItems(XMPConst.NS_DC, 'i', xmp);
    if (keys.length > 0) addKey(("Generator Iteration "+keys[0]));
    addKey("Generative Art");
    return 'Generative';
}

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

function addKey(keyword, source) {
    'use strict';
    if ((keyword === '') || (keyword === null) ||
        (keyword === undefined) || (keyword === 'undefined') ||
        (keyword == 'Undefined value')) {
            if (source) {
                DescBits.alert('empty keyword from '+source);
            }
    }
    Info.keywords = Set.add(Info.keywords, keyword);
}

function addKeywordList(ItemList, source) {
    'use strict';
    source = source || null;
    var i;
    for (i in ItemList) {
        addKey(ItemList[i], source);
    }
}

///////// Camera-model bits ////////////////////

function addAnyCameraInfo(ModelName) {
    'use strict';
    var camera = Cameras[ModelName];
    if (camera) {
        addKeywordList(camera.keywords, ('Camera:'+ModelName));
        for (var v in camera) {
            if (v !== 'keywords') {
                DescBits[v] = camera[v];
            }
        }
        return;
    }
    DescBits.alert('Unknown Camera: ="' + ModelName + '"');
    DescBits.camera = ('Camera: '+ModelName);
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

function scan_EXIF_tags(doc)
{
    'use strict';
    // see https://exiv2.org/tags.html
    var originalFocalLength = 0;
    var fls;
    var debugMsg = false;
    var knownLens = false;
    var knownPerson = false;
    var lensName = '';
    const bjorkeType = /Bjorke/;
    var Overrides = parse_initial_keys();
    for (var i = 0; i < Info.exif.length; i++) {
        var q = Info.exif[i];
        var qName = trim11(q[1]);
        switch (q[0]) {
            case 'Make':
                addKey(qName, 'Make');
                break;
            case 'Model':
                addAnyCameraInfo(qName);  // identify specific model of camera
                const x100Types = /^X100/;
                if (x100Types.test(qName)) {
                    lensName = 'Fujinon 23/2'; // not in EXIF for these cameras
                    knownLens = true;
                }
                break;
            case 'Date Time':
            case 'Date Time Original':
                addKey(q[1].substr(0,4), 'Date');
                break;
            case 'Focal Length in 35mm Film':
                DescBits.equivFL = parseFloat(q[1]);
                break;
            case 'Shutter Speed':
                DescBits.shutter = q[1];
                break;
            case 'Focal Length':
                originalFocalLength = parseFloat(q[1]);
                fls = (Math.floor(originalFocalLength+0.49)).toString();
                DescBits.lens = (fls+'mm');
                // DescBits.alert('EXIF focal length is '+fls+'\n');
                break;
            case 'F-Stop':
                DescBits.aperture = (' '+q[1]);
                break;
            case 'ISO Speed Ratings':
                DescBits.iso = (', ISO '+q[1]);
                break;
            case 'Lens Type': 
                if (findLens(q[1]) === undefined) {
                    DescBits.alert('Lens Type? {' + q[1] + '}');
                } else {
                    lensName = q[1];
                    //DescBits.alert('Lens Type: '+lensName+'\n');
                }
                knownLens = true;
                break;
             case 'Copyright':
            case 'Copyright Notice':
                if (q[1].match(/[0-9]/) && !knownPerson) {
                    if (q[1].indexOf(Person.fullName) < 0) {
                        if (!bjorkeType.test(q[1])) {
                            DescBits.alert('\nEXIF Copyright Notice:\n"'+q[1]+'"');
                        }
                    }
                }
                break;
            case 'Scene Capture Type':
                if (q[1] !== 'Standard') {
                    addKey(('Capture: '+q[1]), 'Scene Capture Type');
                }
                break;
            case 'Light Source':
                if (q[1] !== 'Unknown' && q[1] !== 'Undefined value') {
                    addKey(q[1], 'Light Source');
                }
                break;
            case 'Flash':
                var flashVal = parseInt(q[1]);
                if ((flashVal < 16) && (flashVal > 0)) {
                    DescBits.alert('\nflashVal: '+flashVal+'');
                    addKey('Strobe');
                    DescBits.flash = '+ Flash';
                }
                break;
            case 'Scene Type':
                Info.source = q[1];
                break;
            case 'Custom Rendered':
                if (q[1] === 'Custom Process') {
                    addKey('BW');
                }
                break;
            case 'Artist':
                knownPerson = (q[1].indexOf(Person.fullname) !== -1);
                for (var ip=0; ip<Person.altNames.length; ip+=1) {
                    knownPerson |= (q[1].indexOf(Person.altNames[ip]) !== -1);
                }
                knownPerson |= bjorkeType.test(q[1]);
                if (!knownPerson) {
                    DescBits.alert('Artist tag: "'+q[1]+'"');
                }
                break;
            case 'Exposure Program': // manual, AE... ignore for now
                // addKey(('Exp: '+q[1]), 'Exposure Program');
                break;
            case 'EXIF tag 42036': // X-T1: "XF18-55mmF2.8-4 R LM OIS' - EXIF Photo.LensModel
                if (findLens(q[1]) === undefined) {
                    DescBits.alert('Lens? {' + q[1] + '}');
                } else {
                    lensName = q[1];
                    //DescBits.alert('EXIF tag 42036 lens: '+lensName+'\n');
                }
                knownLens = true;
                break;
            case 'Metering Mode': // debugMsg=true; // e.g. "Spot"
            case 'Orientation': // debugMsg=true;
            case 'Color Space':
            //
            case 'GPS Version': // theta s
            case 'GPS Image Direction Ref': // theta s
            case 'GPS Image Direction': // theta s
            //
            case 'GPS Latitude Ref': // Fuji
            case 'GPS Latitude': // Fuji
            case 'GPS Longitude Ref': // Fuji
            case 'GPS Longitude': // Fuji
            case 'GPS Altitude Ref': // Fuji
            case 'GPS Altitude': // Fuji
            case 'GPS Time Stamp': // Fuji
            case 'GPS Speed Ref': // Fuji
            case 'GPS Speed': // Fuji
            case 'GPS Map Datum': // Fuji
            case 'GPS Date Stamp': // Fuji
            case 'GPS DOP': // Leica
            case 'GPS Track': // Leica
            case 'GPS Status': // Leica
            //
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
            case 'Compression': // eg TIFF type
            case 'Gain Control':
            case 'Contrast':
            case 'Saturation':
            case 'Sharpness':
            case 'White Point': // XPro2 as of July 2022 (updated by FPS?)
            case 'Primary Chromaticities': // XPro2 as of July 2022 (updated by FPS?)
            case 'YCbCr Coefficients': // XPro2 as of July 2022 (updated by FPS?)
            case 'Brightness Value': // first seen on x100s
            case 'Subject Distance Range': // first seen on x100s
            case 'Subject Distance': // first seen on Glass
            case 'Image Unique ID': // first seen on Glass
            case 'EXIF tag 258': // '8 8 8' Bits Per Sample
            case 'EXIF tag 262': // 'RGB' Photometric Interpretation
            case 'EXIF tag 277': // "3' Samples Per Pixel (channels)
            case 'EXIF tag 284': // TIFF compression type, e.g. "Chunky"
            case 'EXIF tag 34864': // "1" on XP2 JPG or RAW... FileSource? Colorspace? SensitivityType?
            case 'EXIF tag 42037': // lens ser #
            case 'EXIF tag 42034': // lens info "rdf:Seq" Photo.LensSpecification
            case 'EXIF tag 42035': // X-T1: "FUJIFILM' - Photo.LensMake
            case 'EXIF tag 42033': // Photo.LensSerialNumber
            case 'EXIF tag 42240': // XPro2 "22/10"?
            case 'EXIF tag 41483': // Glass, unknown
            // pixel 3
            case 'EXIF tag 36880': // Pixel3, unknown
            case 'EXIF tag 36881': // Pixel3, unknown
            case 'EXIF tag 36882': // Pixel3, unknown
            case 'EXIF tag 37520': // Pixel3, unknown
            case 'EXIF tag 37521': // Pixel3, unknown
            case 'EXIF tag 37522': // Pixel3, unknown
            // S5ii
            case 'EXIF tag 34865': // S5ii, unknown, value 2000?
            // Leica Monochrom
            case 'EXIF tag 530': // Leica -- "2 1" (contrast, sharpness?)

                break;
                // DescBits.alert('\nTag '+q[0]+': "'+qName+'"');
                // break;
            default:
                debugMsg = true;
        }
        if (debugMsg) {
            DescBits.alert('EXIF "'+q[0]+'" was "'+q[1]+'"');
            debugMsg = false;
        }
    }
    //
    // Apply any overrides found in the keywords
    //
    var lensOverride = false;
    if (Overrides.knownLens) {
        knownLens = false;
        lensOverride = true;
    }
    if (Overrides.focal_length) {
        knownLens = false;
        originalFocalLength = Overrides.focal_length;
        DescBits.lens = (originalFocalLength + 'mm');
        //alert('Overrides.focal_length is '+Overrides.focal_length);
        lensOverride = true;
    }
    if (Overrides.lensFamily) {
        DescBits.lensFamily = Overrides.lensFamily;
    }
    if (Overrides.minAperture) {
        DescBits.minAperture = Overrides.minAperture;
    }
    if (!knownLens && !lensOverride && (originalFocalLength == 23)) {
        lensName = 'Nokton-X 23/1.2'; //Special Case!
        knownLens = true;
    }
    var lensID = findLens(lensName);
    if (lensID) {
        if (lensID.minAperture && (Overrides.minAperture === undefined)) {
            DescBits.minAperture = lensID.minAperture;
        }
        if (lensID.primeLength && (Overrides.focal_length === undefined)) {
            originalFocalLength = lensID.primeLength;
            DescBits.lens = (originalFocalLength + 'mm');
        }
        if (lensID.family && (Overrides.lensFamily === undefined)) {
            DescBits.lensFamily = lensID.family;
        }
    }
    if (knownLens) {
        if (lensID) {
            addKeywordList(lensID.keywords, 'ID:'+lensName);
        }
    }
    if (DescBits.lens) {
        addKeywordList([DescBits.lens], 'Lens:'+DescBits.lens);
    }
    //
    //
    if (DescBits.brand === Vendor.lumix) {
        addKeywordList(['Panasonic','Lumix']);
    } else if (DescBits.brand === Vendor.fuji) {
        // Various "Fuji X' cameras
        addKeywordList(['Fuji','Fujifilm','Fuji X',('Fujifilm '+DescBits.camera)]);
        if (!Overrides.knownLens) {
            var aLens = findAdaptedLens[originalFocalLength];
            if (aLens && !knownLens) {
                addKeywordList(aLens.keywords, ('Adapted:'+originalFocalLength));
                DescBits.minAperture = aLens.minAperture;
            }
        }
    }
    if ((DescBits.camera === 'Scanned') || DescBits.film) { // no camera data - this must have been a film scan
        addKeywordList(['Film', scanned_or_made()], 'Scan');
        if (!Overrides.knownLens) {
            var aLens = findAdaptedLens[originalFocalLength];
            if (aLens && !knownLens) {
                addKeywordList(aLens.keywords, 'Scanned Lens Override');
                DescBits.minAperture = aLens.minAperture;
            }
        }
    }

    //
    apply_user_overrides(Overrides);
    //
    // focal length assessment
    //
    if (DescBits.equivFL <= 0) {
        DescBits.equivFL = Math.floor( (originalFocalLength * DescBits.multiplier) + 0.49);
    } else { // equivalent supplied by camera
        fls = (Math.floor(originalFocalLength+0.49)).toString();
        if (fls.substr(0,1) === '0') {
           fls = fls.substr (1);
        }
        if (fls != originalFocalLength) {
            addKey((fls+'mm_orig'));
        }
    }
    if (DescBits.equivFL > 0) {
        if (DescBits.equivFL <= 35) {
            addKey('Wide Angle');
            if (DescBits.equivFL < 25) {
                addKey('Ultra Wide Angle');
            }
        } else if (DescBits.equivFL >= 85) {
            addKey('Telephoto');
        }
        if (DescBits.equivFL !== originalFocalLength) {
            fls = DescBits.equivFL.toString();
            if (fls.substr(0,1) === '0') {
               fls = fls.substr (1);
            }
            addKey((fls+'mm'));
            addKey((fls+'mm_equiv'));
            //addKey(('Mult:'+DescBits.multiplier));
        }
    }
    //
    // aperture assesment
    //
    if ((DescBits.aperture === undefined) || (DescBits.aperture < DescBits.minAperture)) {
        DescBits.aperture = DescBits.minAperture;
    }
}

/////////////////////////////////////////////////////////////

function add_aspect_description(doc)
{
    'use strict';
    var l = Math.max(doc.width,doc.height);
    var s = Math.min(doc.width,doc.height);
    var aspect = (l/s);
    var wide = (doc.width > doc.height);
    if (aspect>2.36) {
        addKey('Panorama');
        if (!wide) {
            addKey('Tall');
        }
    } else if (aspect>2.3) {
        addKey((wide?'2.35:1':'1:2.35'));   
    } else if (aspect>1.97) {
        addKey((wide?'2:1':'1:2')); 
    } else if (aspect>1.68) {
        addKey((wide?'16:9':'9:16'));
     } else if (aspect>1.45) { // 35mm
        addKey((wide?'3:2':'2:3'));
    } else if (aspect>1.25) { // 645
        addKey((wide?'4:3':'3:4')); 
    } else {
        addKey('Square');           
        addKey('1:1');          
    }
}

///////////////////////////////////

function spot_known_lens(keyword)
{
    var known_lens = findLens(keyword);
    if (known_lens) {
        addKeywordList(known_lens.keywords, ('Lens:'+keyword));
    }
    return known_lens;
}

function spot_known_lens_family(keyword)
{
    var K = LensFamilyNames[keyword];
    if (K) {
        addKeywordList(K.keywords,  ('LensFam:'+keyword));
        return true;
    }
    return false;
}

function spot_film_camera(keyword)
{
    var B = Cameras[keyword];
    if (B !== undefined) {
        addKeywordList(B.keywords, ('Camera:'+keyword));
        return true;
    }
    return false;
}

// watch for potential overrides, e.g. for a shot with one lens scanning another lens's negatives
function parse_initial_keys()
{
    var keys = Info.keywords;
    var Overrides = {
        knownLens: false,
    };
    for (var k in keys) {
        if (! Overrides.knownLens) {
            lens_obj = spot_known_lens(keys[k]);
            if (lens_obj) {
                Overrides.knownLens = true;
                if (lens_obj.primeLength) {
                    Overrides.focal_length = lens_obj.primeLength;
                }
                if (lens_obj.family) {
                    Overrides.lensFamily = lens_obj.family;
                }
                if (lens_obj.minAperture) {
                    Overrides.minAperture = lens_obj.minAperture;
                }
                continue;
            }
            if (spot_known_lens_family(keys[k])) {
                Overrides.knownLens = true;
                continue;
            }
        }
        if (spot_film_camera(keys[k])) {
            DescBits.camera = keys[k];
            continue;
        }
        var m = keys[k].match(/^([A-Za-z]+):(.+)/);
        if (!m) {
            m = keys[k].match(/^(\d+) *mm/);
            if (m) {
                Overrides.focal_length = Number(m[1]);                
            }
            continue;
        }
        var subkey = m[1];
        var val = m[2];
        switch(subkey) {
            case 'camera': {
                Overrides.camera = val;
                break;
            }
            case 'format': {
                Overrides.format = val;
                break;
            }
            case 'lens': {
                m = val.match(/^\d+/);
                if (m) {
                    Overrides.focal_length = Number(m[1]);
                } else {
                    DescBits.alert('\nOdd lens value: "'+keys[k]+'"');
                }
                break;
            }
            default:
                continue;
        }
    }
    return Overrides;
}

////

function apply_user_overrides(Overrides)
{
    // TODO: if there are values in Overrides, use them to adjust
    //   camera name, focal_length, multiplier, etc before assigning the final
    //   exported keyword list
    //if (Object.keys(Overrides).length < 1)
    //    return;
    for (var k in Overrides) {
        DescBits[k] = Overrides[k];
    }
    if (Overrides.focal_length) {
        DescBits.equivFL = Math.floor( (Overrides.focal_length * DescBits.multiplier) + 0.49);
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
    Info = app.activeDocument.info; // global shortcut
    var msgs = '';
    var initKeys = Info.keywords.length;
    var newKeys = [];
    if (app.activeDocument.mode === DocumentMode.GRAYSCALE) {
        newKeys = newKeys.concat(['BW','Black and White','Black & White','B&W', 'Monochrome']);
    }
    var dt = new Date();
    var thisYear = dt.getFullYear();
    var thisYearS = thisYear.toString();
    if (Info.CreationDate === '') {
        Info.creationDate = dt.toString();
    }
    //newKeys = newKeys.concat(Person.commonTags.concat([Person.fullname, Person.city, Person.region]));
    newKeys = newKeys.concat(Person.commonTags.concat([Person.fullname]));
    //
    // keywords added to doc...
    //
    newKeys = newKeys.concat( [ jobName(app.activeDocument.name) ] );
    addKeywordList(newKeys, 'document keys');
    scan_EXIF_tags(app.activeDocument);
    add_aspect_description(app.activeDocument);
    if (DescBits.alertText !== '') {
        if (msgs !== '') { msgs += '\n'; }
        msgs += DescBits.alertText;
    }
    Info.author = Person.fullname;
    Info.credit = Person.fullname;
    Info.authorPosition = Person.relation;
    Info.copyrighted = CopyrightedType.COPYRIGHTEDWORK;
    if (!(Info.copyrightNotice.length > 2)) {
        Info.copyrightNotice = ('(C) ' + thisYearS + ' ' + Person.fullname);
    } else {
        // catch minimal notices
        m = Info.copyrightNotice.match(/\[[cC]\] *(\d\d\d\d)$/);
        if (m) {
            Info.copyrightNotice = ('(C) ' + m[1] + ' ' + Person.fullname);
        }
    }
    Info.ownerUrl = Person.url;
    if (Info.title === '') {
        var t = noExtension(app.activeDocument.name);
        Info.title = t.replace(/^bjorke_/,'');
    }
    // alert("New Title is ("+Info.title+")");
    if (Info.headline === '') {
        Info.headline = Info.title;
    }
    if (Info.caption === '') {
        // TODO - nope! We need the camera if it's been tagged... "Scanned" is not a camera
        Info.caption = (Person.blog + ' * ' + DescBits.camera);
        if (DescBits.lens) {
            Info.caption = (Info.caption + ' + ');
            if (DescBits.lensFamily) {
                Info.caption = (Info.caption + DescBits.lensFamily + ' ');
            }
            Info.caption = (Info.caption + DescBits.lens);
        }
        if (DescBits.minAperture) Info.caption = (Info.caption + ' ' + DescBits.minAperture);
        Info.caption = (Info.caption + '\n');
        // if (DescBits.shutter) Info.caption = (Info.caption + ' ' + DescBits.shutter);
        // if (DescBits.aperture) Info.caption = (Info.caption + ' ' + DescBits.aperture);
        // if (DescBits.iso) Info.caption = (Info.caption + ' ' + DescBits.iso);
        // if (DescBits.flash) Info.caption = (Info.caption + ' ' + DescBits.flash);
        //Info.caption = (Info.caption + '\n\n' + noExtension(app.activeDocument.name));
        Info.caption = (Info.caption + noExtension(app.activeDocument.name));
        Info.captionWriter = Person.fullname;
    }
    if (Info.city === '') {Info.city = Person.city; }
    if (Info.provinceState === '') {Info.provinceState = Person.region; }
    if (Info.country === '') { Info.country = Person.country; }
    if (initKeys === 0) {
        addKey(Person.reminder);
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
