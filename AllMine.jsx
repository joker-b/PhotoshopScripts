//
// Intended usage:
// Label Pix

/* global app, alert, Units, DocumentMode, CopyrightedType */

/* jshint ignore: start */
#target photoshop
app.bringToFront();
/* jshint ignore: end */

// TODO -- add "common names" for lenses
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

// basic globals

var verbose = false;
var originalRulerUnits = null;
var Info; // linked to document.info

//
// STATIC DATA
//

var Person = {
    fullname: 'Kevin Bjorke',
    altNames: ["K.Bjorke botzilla.com","K. Bjorke", 'K BJORKE', 'KEVIN BJORKE'],
    url: 'http://www.kevin-bjorke.com/',
    blog: 'http://kevinbjorke.com',
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
    contax: 'Contax',
    canon: 'Canon',
    dji: 'DJI',
    leica: 'Leica',
    nikon: 'Nikon',
    minolta: 'Minolta',
    konica: 'Konica',
    bronica: 'Bronica',
    yashica: 'Yashica',
    google: 'Google',
    olympus: 'Olympus',
    samsung: 'Samsung',
    sigma: 'Sigma',
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
    'Milvus': { keywords: [Vendor.zeiss] },
    'Otus': { keywords: [Vendor.zeiss] },
    'ZE': { keywords: [Vendor.canon, Vendor.zeiss] },
    'ZF': { keywords: [Vendor.nikon, Vendor.zeiss] },
    'ZM': { keywords: [Vendor.leica, Vendor.zeiss] },
    'EF': { keywords: [Vendor.canon] },
    'FD': { keywords: [Vendor.canon] },
};

//
// "CameraCatalog" here can also include scanners, renderers, or programs like Midjourney
//
var CameraCatalog = {
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
        keywords: ['S5ii','Lumix','S5M2'],
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
        keywords: [Vendor.leica, 'Monochrom 246', 'Monochrom', 'M246', 
            'Mono', 'Black and White'],
        brand: Vendor.leica,
        multiplier: 1.0,
        camera: 'Leica M246',
    },
    'LEICA M10-R': {
        keywords: [Vendor.leica, 'M', 'M10', 'M10-R'],
        brand: Vendor.leica,
        multiplier: 1.0,
        camera: 'Leica M10-R',
    },
    'LEICA SL2': {
        keywords: [Vendor.leica, 'SL', 'SL2'],
        brand: Vendor.leica,
        multiplier: 1.0,
        camera: 'Leica SL2',
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
    //
    'DJI Air 3S': {
        keywords: ['Air 3S', 'DJI', 'Drone', 'Quadcopter', 'Aerial'],
        brand: Vendor.dji,
        // multiplier: 1.6,
        camera: 'Air 3S',
    },
    'FC9184': {
        keywords: ['Air 3S', 'DJI', 'Drone', 'Quadcopter', 'Aerial'],
        brand: Vendor.dji,
        // multiplier: 1.6,
        camera: 'Air 3S',
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
    'Leica M4-P': {
        keywords: ['Leica', 'Leica M4-P', 'Leitz', 'Leica M', 'Film'],
        brand: Vendor.leica,
        multiplier: 1.0,
        camera: 'Leica M4-P',
        film: true,
    },
    'Konica II': {
        keywords: ['Konica', 'Konica II', 'Film'],
        brand: Vendor.konica,
        multiplier: 1.0,
        camera: 'Konica II',
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
        mount: 'XF',
    },
    'Nokton-X 23/1.2': {
        keywords: ['Nokton', 'Voigtlander', Vendor.fuji],
        minAperture: 'f/1.2',
        primeLength: 23,
        family: 'Nokton',
        mount: 'XF',
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
        mount: 'M',
    },
    'Zeiss Milvus 1.4/85 ZE': {
        keywords: [Vendor.zeiss, 'Milvus'],
        minAperture: 'f/1.4',
        primeLength: 85,
        family: 'Zeiss',
        mount: 'EF',
    },
    'Leica Summicron-M 50mm f/2 (IV, V)': {
        keywords: ['Summicron'],
        minAperture: 'f/2',
        primeLength: 50,
        family: 'Summicron',
        mount: 'M',
    },
    'TTArtisans-M 1:1.4/50 ASPH.': {
        keywords: ['TTArtisans', 'Asph'], // fake coded!
        minAperture: 'f/1.4 ASPH',
        primeLength: 50,
        family: 'TTArtisans',
        mount: 'M',
    },
    'Zeiss Planar T* 2/50 ZM': {
        keywords: [Vendor.zeiss, 'Planar', 'ZM'],
        minAperture: 'f/2',
        primeLength: 50,
        family: 'Zeiss',
        mount: 'M',
    },
    'Zeiss C Sonnar T* 1,5/50 ZM': {
        keywords: [Vendor.zeiss, 'Sonnar', 'ZM'],
        minAperture: 'f/1.5',
        primeLength: 50,
        family: 'Zeiss',
        mount: 'M',
    },
    'M-Rokkor 1:2/40': {
        keywords: ['Summicron-C', 'Rokkor', 'M-Rokkor'],
        minAperture: 'f/2',
        primeLength: 40,
        family: 'M-Rokkor',
        mount: 'M',
    },
    'Voigtlander VM 35mm f/2 Ultron Aspherical': { 
        keywords: ['Ultron', 'Voigtlander', 'Asph'], // fake-coded!
        minAperture: 'f/2 Asph',
        primeLength: 35,
        family: 'Ultron',
        mount: 'M',
    },
    'Zeiss Distagon T* 1,4/35 ZM': {
        keywords: [Vendor.zeiss, 'Biogon', 'ZM'],
        minAperture: 'f/1.4',
        primeLength: 35,
        family: 'Zeiss',
        mount: 'M',
    },
    'Zeiss Biogon T* 2/35 ZM': {
        keywords: [Vendor.zeiss, 'Biogon', 'ZM'],
        minAperture: 'f/2.0',
        primeLength: 35,
        family: 'Zeiss',
        mount: 'M',
    },
    'Zeiss Biogon T* 2,8/28 ZM': {
        keywords: [Vendor.zeiss, 'Biogon', 'ZM'],
        minAperture: 'f/2.8',
        primeLength: 28,
        family: 'Zeiss',
        mount: 'M',
    },
    'Zeiss Biogon T* 2,8/21 ZM': {
        keywords: [Vendor.zeiss, 'Biogon', 'ZM'],
        minAperture: 'f/2.8',
        primeLength: 21,
        family: 'Zeiss',
        mount: 'M',
    },
    'M-Rokkor 1:2.8/28': {
        keywords: ['Rokkor', 'Minolta', 'M-Rokkor'],
        minAperture: 'f/2.8',
        primeLength: 28,
        family: 'M-Rokkor',
        mount: 'M',
    },
    // Fixed Lens
    'Fujinon 23/2': { // for X100 series
        keywords: ['X100'],
        minAperture: 'f/2.0',
        primeLength: 23,
    },
    "Konica Hexanon AR 40mm f/1.8": {
        keywords: [Vendor.konica, 'Hexanon'],
        minAperture: 'f/1.8',
        primeLength: 40,
        family: 'Hexanon'
    },
    //
    // L-Mount
    //
    'LUMIX S 50/F1.8': {
        keywords: [Vendor.lumix, 'Normal'],
        minAperture: 'f/1.8',
        primeLength: 50,
        family: 'Lumix',
        mount: 'L',
    },
    '24-70mm F2.8 DG DN II | Art 024': {
        keywords: [Vendor.sigma, 'zoom'],
        minAperture: 'f/2.8',
        family: 'Art',
        mount: 'L',
    },
    //
    // shortcuts
    //
    'TTArtisans': {
        remap: 'TTArtisans-M 1:1.4/50 ASPH.',
    },
    'Milvus': {
        remap: 'Zeiss Milvus 1.4/85 ZE',
    },
    'Ultron': {
        remap: 'Voigtlander VM 35mm f/2 Ultron Aspherical',
    },
    'Ultron-M 1:2/35 Asph': {
        remap: 'Voigtlander VM 35mm f/2 Ultron Aspherical',
    },
    
    //
    // Contax
    //
    'Contax Biogon 2.8/21': {
        keywords: [Vendor.zeiss, 'Contax', 'Biogon'],
        minAperture: 'f/2.8',
        primeLength: 21,
        family: 'Biogon',
        mount: 'G',
    },
    'Contax Biogon 2.8/28': {
        keywords: [Vendor.zeiss, 'Contax', 'Biogon'],
        minAperture: 'f/2.8',
        primeLength: 28,
        family: 'Biogon',
        mount: 'G',
    },
    'Contax Planar 2/35': {
        keywords: [Vendor.zeiss, 'Contax', 'Planar'],
        minAperture: 'f/2',
        primeLength: 35,
        family: 'Planar',
        mount: 'G',
    },
    'Contax Planar 2/45': {
        keywords: [Vendor.zeiss, 'Contax', 'Planar'],
        minAperture: 'f/2',
        primeLength: 45,
        family: 'Planar',
        mount: 'G',
    },
    'Contax Sonnar 2.8/90': {
        keywords: [Vendor.zeiss, 'Contax', 'Sonnar'],
        minAperture: 'f/2.8',
        primeLength: 90,
        family: 'Sonnar',
        mount: 'G',
    },
    // Nikon
    'Micro-Nikkor 55mm f/3.5': {
        keywords: [Vendor.nikon, 'Micro-Nikkor', 'Nikkor'],
        minAperture: 'f/3.5',
        primeLength: 55,
        family: 'Micro-Nikkor',
        mount: 'F',
    },
    'Nikkor 50mm f/1.4 AI': {
        keywords: [Vendor.nikon, 'Nikkor'],
        minAperture: 'f/1.4',
        primeLength: 50,
        family: 'Nikkor',
        mount: 'F',
    },
    'Nikkor-S 50mm f/1.4': {
        keywords: [Vendor.nikon, 'Nikkor'],
        minAperture: 'f/1.4',
        primeLength: 50,
        family: 'Nikkor',
        mount: 'F',
    },
    'Nikkor-O 35mm f/2': {
        keywords: [Vendor.nikon, 'Nikkor'],
        minAperture: 'f/2',
        primeLength: 35,
        family: 'Nikkor-O',
        mount: 'F',
    },
    'Nikkor-N 24mm f/2.8': {
        keywords: [Vendor.nikon, 'Nikkor'],
        minAperture: 'f/2.8',
        primeLength: 24,
        family: 'Nikkor-N',
        mount: 'F',
    },
    'Nikkor-H 2.8cm f/3.5': {
        keywords: [Vendor.nikon, 'Nikkor'],
        minAperture: 'f/3.5',
        primeLength: 28,
        family: 'Nikkor-H',
        mount: 'F',
    },
    'Nikkor-P 10.5cm f/2.5': {
        keywords: [Vendor.nikon, 'Nikkor'],
        minAperture: 'f/2.5',
        primeLength: 105,
        family: 'Nikkor-P',
        mount: 'F',
    },
    'Nikkor-ED 300mm f/4.5': {
        keywords: [Vendor.nikon, 'Nikkor'],
        minAperture: 'f/4.5',
        primeLength: 300,
        family: 'ED',
        mount: 'F',
    },
    // "cold" Fuji X
    'Meike-X 2/50': {
        keywords: ['Meike'],
        minAperture: 'f/2',
        primeLength: 50,
        mount: 'XF',
    },
    'Rokinon-X 2.8/16': {
        keywords: ['Rokinon'],
        minAperture: 'f/2.8',
        primeLength: 16,
        mount: 'XF',
    },
    // Canon FD
    'Canon-FD 50mm f1.8': {
        keywords: [Vendor.canon, 'FD'],
        minAperture: 'f/1.8',
        primeLength: 50,
        mount: 'FD',
    },
    'not selected' : {
        keywords: ['lens unknown'],
        minAperture: 'f/0',
    },
    'UNKNOWN' : {
        keywords: ['unknown'],
        minAperture: 'f/?',
    },
    //
    // Various Adapted Remaps and shorthand names
    //
    'Elmarit-M 1:2.8/90': { remap: 'Tele-Elmarit 1:2.8/90' },
    'Summilux-M 1:1.4/50 ASPH.': { remap: 'TTArtisans-M 1:1.4/50 ASPH.', },
    'Summilux-M 1:1.4/50': { remap: 'Zeiss C Sonnar T* 1,5/50 ZM', },
    'Summicron-M 1:2/50': { remap: 'Zeiss Planar T* 2/50 ZM', },
    'Summilux-M 1:1.4/35 ASPH.': { remap: 'Zeiss Distagon T* 1,4/35 ZM', },
    // TODO: how to best map 35mm ƒ/2?
    'Summicron-M 1:2/35': { remap: 'Zeiss Biogon T* 2/35 ZM', },
    'Summicron-M 1:2/35 ASPH.': { remap: 'Zeiss Biogon T* 2/35 ZM', },
    // TODO: how to best map 21mm?
    'Elmarit-M 1:2.8/21': { remap: 'Zeiss Biogon T* 2,8/21 ZM' },
    'Elmarit-M 1:2.8/21 ASPH.': { remap: 'Zeiss Biogon T* 2,8/21 ZM' },
    // TODO: how to best map 28mm?
    'Elmarit-M 1:2.8/28': { remap: 'Zeiss Biogon T* 2,8/28 ZM' },
    'Elmarit-M 1:2.8/28 ASPH.': { remap: 'Zeiss Biogon T* 2,8/28 ZM' },
    'Elmarit-M 1:2.8/28 Leitz': { remap: 'Zeiss Biogon T* 2,8/28 ZM' }, // both editions
    // Shorthand names
    'Biogon 21': { remap: 'Zeiss Biogon T* 2,8/21 ZM' },
    'Biogon 28': { remap: 'Zeiss Biogon T* 2,8/28 ZM' },
    'Distagon 35': { remap: 'Zeiss Distagon T* 1,4/35 ZM' },
    'Sonnar 50': { remap: 'Zeiss C Sonnar T* 1,5/50 ZM' },
    'Planar 50': { remap: 'Zeiss Planar T* 2/50 ZM' },
    'Milvus 85': { remap: 'Zeiss Milvus 1.4/85 ZE' },
    'Elmarit 90': { remap: 'Tele-Elmarit 1:2.8/90' },
    'Rokkor-M': { remap: 'M-Rokkor 1:2/40' },
    'TT 50': { remap: 'TTArtisans-M 1:1.4/50 ASPH.' },
    'VM 35': { remap: 'Voigtlander VM 35mm f/2 Ultron Aspherical' },
    'Nikkor 24': { remap: 'Nikkor-N 24mm f/2.8' },
    'Nikkor 28': { remap: 'Nikkor-H 2.8cm f/3.5' },
    'Nikkor 105': { remap: 'Nikkor-P 10.5cm f/2.5' },
    'Nikkor 300': { remap: 'Nikkor-ED 300mm f/4.5' },
    'Nikkor 50mm f/1.4': { remap: 'Nikkor 50mm f/1.4 AI' },
    // Stupid mistake dept: mislabelled in-camera on some shots
    'Zeiss Distagon T* 1,5/35 ZM': { remap: 'Zeiss Distagon T* 1,4/35 ZM', },
};

// if you know the length but not the name, try these guesses
var AdaptedFocalLengths = {
    21: 'Zeiss Biogon T* 2,8/21 ZM', // Contax Skipped
    24: 'Nikkor-N 24mm f/2.8', // Contax Skipped
    28: 'M-Rokkor 1:2.8/28', // Contax Skipped
    40: 'M-Rokkor 1:2/40',
    45: 'Contax Planar 2/45',
    35: 'Contax Planar 2/35', // Nikkor-O skipped
    '35': 'Zeiss Distagon T* 1,4/35 ZM', // Nikkor-O skipped
    50: 'Nikkor 50mm f/1.4 AI',
    55: 'Micro-Nikkor 55mm f/3.5',
    85: 'Zeiss Milvus 1.4/85 ZE',
    90: 'Contax Sonnar 2.8/90',
    300: 'Nikkor-ED 300mm f/4.5',
    // goofy cheats
    49: 'Meike-X 2/50', // hack
    51: 'Canon-FD 50mm f1.8', // hack
    16: 'Rokinon-X 2.8/16',
};

//
// GLOBAL DATA FOR THIS DOCUMENT
//

//
// much of this script is about manipulating elements of this global object
//
var DescBits = {
    camera: 'Scanned',
    isFilm: false,
    alertText: '',
    multiplier: 1.0,
    lensData: {
        'OVERRIDE': { keywords: [], name: 'UNKNOWN', found: false},
        'SCANNED':  { keywords: [], name: 'UNKNOWN', found: false},
        'IMPLIED':  { keywords: [], name: 'UNKNOWN', found: false}, // also use for remaps
        'LENGTH':   { keywords: [], name: 'UNKNOWN', found: false},
        'EXIF':     { keywords: [], name: 'UNKNOWN', found: false},
    },
    lens: {
        keywords: [],
        name: 'UNKNOWN', // e.g. "Summicron 50mm f/2"
        minAperture: 'f/?',
        family: '', // e.g. "Biogon" not "zeiss"
        brand: '',
        nick: '', // e.g. "Biogon 28"
        primeLength: 0,
        equivFL: 0,
        description: '',
        mount: null,
        found: false
    },
    brand: 'Bjorke',
    // these methods stash text for "proper" alerts
    alert : function(text) {
            this.alertText += text;
    },
    log : function(text) {
        if (verbose) {
            this.alertText += text;
        }
    }
};

/////////////////////////////////////////
// METHODS BEGIN ////////////////////////
/////////////////////////////////////////

function vAlert(text) {
    if (verbose) {
        alert(text);
    }
}

function guess_lens_from_name(lens_name) {
    guess = /([0-9.]*)\s?mm/.exec(lens_name);
    // TODO: could guess the minAperture from some names
    if (guess) {
        return {
            keywords: ['Probably '+guess[0], lens_name],
            primeLength: Number(guess[1]),
            minAperture: 'f/??',
            guessed: true,
        }
    }
    //if (verbose) {
    //    alert('no good lens-name guess for "'+lens_name+'"');
    //}
    return null;
}

function add_possible_description(lensObj, description) {
    if ((lensObj.description === undefined) || (lensObj.description == '')) {
        lensObj.description = description;
        DescBits.log('Set Description for "'+lensObj.name+'" to "'+lensObj.description+'"\n');
    } else {
        DescBits.log('\nExisting Description for "'+lensObj.name+'" is "'+lensObj.description+'"\n');
    }
}

function find_lens_by_name(lens_name) {
    var lensObj, LN;
    // alert('looking for "'+lens_name+'"');
    if (typeof(lens_name) == 'string') {
        LN = lens_name.replace(/\s*$/, '');
    } else {
        LN = toString(lens_name);
        LN = LN.replace(/\s*$/, '');
    }
    lensObj = LensCatalog[LN];
    if (lensObj) {
        if (lensObj.remap !== undefined) {
            DescBits.log('\nRemapping "'+lens_name+'" to "'+lensObj.remap+'"\n');
            lens_name = lensObj.remap;
            lensObj = find_lens_by_name(lens_name);
            if (lensObj) {
                lensObj.name = lens_name;
                lensObj.remapped = true;
                add_possible_description(lensObj, lens_name);
            }
            return lensObj;
        } else {
            DescBits.log('\nFound "'+lensObj.family+'" lens "'+lens_name+'"\n');
        }
    } else {
        lensObj = guess_lens_from_name(lens_name);
    }
    if (lensObj) {
        lensObj.name = lens_name;;
        add_possible_description(lensObj, lens_name);
        lensObj.keywords.push(lens_name);
    }
    return lensObj;
}

function find_adapted_lens_by_FL(focal_length) {
    var a = AdaptedFocalLengths[focal_length];
    if (!a) {
        DescBits.log('\nNo adapted lens name found for "'+focal_length+'"\n');
        return(null);
    }
    DescBits.log('\nAdapted name for '+focal_length+'mm is "'+a+'"\n');
    var lensObj = find_lens_by_name(a);
    if (lensObj) {
        lensObj.guessed = true;
    }
    return lensObj;
}

function composite_lens_value(fieldName) {
    var stack = ['OVERRIDE', 'SCANNED', 'IMPLIED', 'LENGTH', 'EXIF'];
    for (var i=0; i<stack.length; i++) {
        var s = stack[i];
        if (DescBits.lensData[s].found) {
            if (fieldName in DescBits.lensData[s]) {
                DescBits.log('composite_lens_value('+fieldName+')['+s+'] = '+DescBits.lensData[s][fieldName]+'\n');
                return DescBits.lensData[s][fieldName];
            } else {
                return undefined;
            }
        }
    }
    return undefined;
}

/// Special Case Unnamed Lenses

function seek_implied_lenses()
{
    if (DescBits.lensData['OVERRIDE'].found) {
        var n = DescBits.lensData['OVERRIDE'].name;
        DescBits.log('seek_implied_lenses: already assigned as '+n+', skipping\n');
        return;
    }
    const x100Types = /^X100/;
    var primeLength = composite_lens_value('primeLength');
    if (x100Types.test(DescBits.camera)) {
        // lens not in EXIF for these cameras
        update_lens_data('IMPLIED', find_lens_by_name('Fujinon 23/2'));
        return true;
    } else if (primeLength == 23) {
        // unique case: no reported EXIF 
        update_lens_data('IMPLIED', find_lens_by_name('Nokton-X 23/1.2'));
        vAlert('Special Case Fuji Lens: '+DescBits.lensData['IMPLIED'].name+'\n');
        return true;
    } else if (primeLength == 85) {
        // unique case: no reported EXIF 
        update_lens_data('IMPLIED', find_lens_by_name('Zeiss Milvus 1.4/85 ZE'));
        vAlert('Special Case Lens: '+DescBits.lensData['IMPLIED'].name+'\n');
        return true;
    } else if (DescBits.camera == "Konica II") {
        update_lens_data('IMPLIED', find_lens_by_name("Konica Hexanon AR 40mm f/1.8"));
        vAlert('Special Case Lens: '+DescBits.lensData['IMPLIED'].name+'\n');
        return true;
    }
    return false;
}

function lens_data_alert(known, State)
{
    if (!known) {
        vAlert(State+": No initally-known lens");
    } else {
        vAlert(State+": equivFL: " +DescBits.lens.equivFL+'\n'+
            "FL:"+DescBits.lens.primeLength+"\n"+
            "f/"+DescBits.aperture+"\n"+
            "Desc: \""+DescBits.lens.description+"\"");
    }
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

//
// document name bits
//

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

////////////////////////////////////////////////
///////// Camera-model bits ////////////////////
////////////////////////////////////////////////

function addAnyCameraInfo(ModelName) {
    'use strict';
    var camera = CameraCatalog[ModelName];
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

function update_lens_data(FIELD, lensObj) {
    'use strict';
    vAlert('Updating "'+FIELD+'" from "'+lensObj.name+'"');
    DescBits.lensData[FIELD].name = lensObj.name;
    if (lensObj.description) {
        DescBits.lensData[FIELD].description = lensObj.description;
    }
    if (lensObj.minAperture && (lensObj.minAperture !== '')) {
        DescBits.lensData[FIELD].minAperture = lensObj.minAperture;
    }
    if (lensObj.primeLength && (lensObj.primeLength > 0)) {
        DescBits.lensData[FIELD].primeLength = lensObj.primeLength;
    }
    if (lensObj.family && (lensObj.family !== '')) {
        DescBits.lensData[FIELD].family = lensObj.family;
    }
    if (lensObj.multiplier && (lensObj.multiplier > 0)) {
        DescBits.lensData[FIELD].multiplier = lensObj.multiplier;
    }
    if (lensObj.mount) {
        DescBits.lensData[FIELD].mount = lensObj.mount;
    }
    if (lensObj.keywords) {
        DescBits.lensData[FIELD].keywords = lensObj.keywords;
    }
    DescBits.lensData[FIELD].found = true;
}

function add_implied_data() {
    'use strict';
    // Add any extra camera-co keyword
    if (DescBits.brand === Vendor.leica) {
        addKeywordList(['Leitz']);
    } else if (DescBits.brand === Vendor.lumix) {
        addKeywordList(['Lumix','Panasonic',('Lumix '+DescBits.camera)]); // multi names
    } else if (DescBits.brand === Vendor.fuji) {
        addKeywordList(['Fuji','Fujifilm','Fuji X',('Fujifilm '+DescBits.camera)]);
    }
    if ((DescBits.camera === 'Scanned') || DescBits.film) { // no camera data - this must have been a film scan
        addKeywordList(['Film', scanned_or_made()], 'Scan');
    }
}
////////////// march through EXIF tags //////////////

// much too long!
// TODO: break this up into smaller functions, and don't mix collection with analysis.
//      let consolidate() methods do the analysis to haandle overrides that may arrive oddly ordered.

function scan_EXIF_tags()
{
    'use strict';
    // see https://exiv2.org/tags.html
    var fls;
    var debugMsg = false;
    var knownPerson = false;
    const bjorkeType = /Bjorke/;
    parse_override_keywords();
    vAlert('Found '+Info.exif.length+' EXIF values');
    // many camera-data fields are ignored if the camera is being used as a scanner -- we want to original data when possible
    //    not the scanner info (e.g. "EZ Controller" or even 'S5')...
    // DescBits.log('\nEXIF: '+Info.exif.length+' EXIF values\n');
    for (var i = 0; i < Info.exif.length; i++) {
        var q = Info.exif[i];
        var qName = trim11(q[1]);
        // vAlert('EXIF: '+q[0]+' = '+qName);
        switch (q[0]) {
            case 'Make': // that is, camera maker
                if (!DescBits.isFilm) {
                    addKey(qName, 'Make');
                }
                break;
            case 'Model': // camera model, not a person
                if (!DescBits.isFilm) {
                    addAnyCameraInfo(qName);  // identify specific model of camera
                } else {
                    DescBits.log('\Scanned using: "'+qName+'"');
                    DescBits.lensData['SCANNED'].found = true;
                }
                break;
            case 'Date Time':
            case 'Date Time Original':
                addKey(q[1].substr(0,4), 'Date');
                break;
            case 'Focal Length in 35mm Film':
                if (!DescBits.isFilm) {
                    DescBits.lensData['EXIF'].equivFL = parseFloat(q[1]);
                    DescBits.lensData['EXIF'].found = true;
                }
                break;
            case 'Shutter Speed':
                if (!DescBits.isFilm) {
                    DescBits.shutter = q[1];
                }
                break;
            case 'Focal Length':
                if (!DescBits.isFilm) {
                    DescBits.lensData['EXIF'].primeLength = parseFloat(q[1]);
                    DescBits.lensData['EXIF'].found = true;
                }
                break;
            case 'F-Stop':
                if (!DescBits.isFilm) {
                    DescBits.aperture = (' '+q[1]);
                }
                break;
            case 'ISO Speed Ratings':
                if (!DescBits.isFilm) {
                    DescBits.iso = (', ISO '+q[1]);
                }
                break;
            case 'Lens Type':
            case 'EXIF tag 42036': // X-T1: "XF18-55mmF2.8-4 R LM OIS' - EXIF Photo.LensModel
                DescBits.log('\nLens Type: "'+qName+'"');
                if (!DescBits.isFilm) {
                    DescBits.log('\nLens Type(42036): "'+qName+'"');
                    var lensObj = find_lens_by_name(qName);
                    if (lensObj) {
                        update_lens_data('EXIF', lensObj);
                        // DescBits.lensData['EXIF'].description = qName;
                    } else {
                        DescBits.log('Lens Type? {' + qName + '}');
                        // DescBits.lens = LensCatalog['UNKNOWN']; // TODO: needed at all? 
                        DescBits.lensData['EXIF'].keywords.push(qName); // TODO: in overrides instead?
                    }
                    DescBits.lensData['EXIF'].found = true;
                } else {
                    DescBits.log('\nLens Type: "'+qName+'" ignored when scanning film');
                }
                break;
                // TODO: why no TTArtisan?
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
                if (!DescBits.isFilm) {
                    if (q[1] !== 'Standard') {
                        addKey(('Capture: '+q[1]), 'Scene Capture Type');
                    }
                }
                break;
            case 'Light Source':
                if (!DescBits.isFilm) {
                    if (q[1] !== 'Unknown' && q[1] !== 'Undefined value') {
                        addKey(q[1], 'Light Source');
                    }
                }
                break;
            case 'Flash':
                if (!DescBits.isFilm) {
                    var flashVal = parseInt(q[1]);
                    if ((flashVal < 16) && (flashVal > 0)) {
                        DescBits.log('\nflashVal: '+flashVal+'');
                        addKey('Strobe');
                        addKey('flashVal: '+flashVal+'');
                        DescBits.flash = '+ Flash';
                    }
                }
                break;
            case 'Scene Type':
                Info.source = q[1];
                break;
            case 'Custom Rendered':
                if (!DescBits.isFilm) {
                    if (q[1] === 'Custom Process') {
                        addKey('BW');
                    }
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
            case 'Pixel X Dimension':
                DescBits.PixX = parseInt(q[1]); break;
            case 'Pixel Y Dimension':
                DescBits.PixY = parseInt(q[1]); break;
            case 'Focal Plane X Resolution':
                DescBits.FocalX = parseInt(q[1]); break;
            case 'Focal Plane Y Resolution':
                DescBits.FocalY = parseInt(q[1]); break;
            case 'Image Width':
                DescBits.ImgW = parseInt(q[1]); break;
            case 'Image Height':
                DescBits.ImgH = parseInt(q[1]); break;
            case 'X Resolution':
                DescBits.ResX = parseInt(q[1]); break;
            case 'Y Resolution':
                DescBits.ResY = parseInt(q[1]); break;
            // MANY THINGS TO IGNORE
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
            case 'Focal Plane Resolution Unit':
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
            case 'EXIF tag 34866': // "100" from DJI Air3S - June 2025
            case 'EXIF tag 42037': // lens ser #
            case 'EXIF tag 42034': // lens info "rdf:Seq" Photo.LensSpecification
            case 'EXIF tag 42035': // X-T1: "FUJIFILM' - Photo.LensMake
            case 'EXIF tag 42033': // Photo.LensSerialNumber - camera ser # if undefined?
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
}

/////////////////////////////////////////////////////////////

// lenses are messed up right now.. Here's how evals should be ordered:
//   OVERRIDE if the file has lens data in the keywords, that should win (check for aliases)
//   SCANNED if the file has lens data but is marked as scanned, the lens info should be UNKNOWN
//   IMPLIED if the file has no lens name but a known camera/lens pair is ID's, use that (e.g. Fuji Nokton, X100)
//   LENGTH if the file has no lens name but has a focal length, use an adapted name
//   EXIF if the file has a lens name, use that but verify for aliases (e.g Leica->Zeiss)
//   UNKNOWN (not a field in lensData) if the file has no lens data, the lens info should be
//
// Here we combine the lensData fields of DescBits into a single lens object
//
function flatten_lens_descriptions()
{
    'use strict';
    // TODO: everything below should be in the consolidate_lens_data() method
    seek_implied_lenses();
    // lens_data_alert(knownLens, 'EXIF'); // TODO: what?

    //
    // get any override focal length before looking for adapted lenses
    //
    // if there's a named/identified override lens, that wins
    // otherwise, guess at the adapted length -- if any, that wins
    // finally, look for any other details in the overrides
    if ((DescBits.lensData['OVERRIDE'].found) &&
            (DescBits.lensData['OVERRIDE'].lensName == 'UNKNOWN')) {
        // this should only happen for known family but no name?
        if (Overrides.primeLength > 0) {
            var lensObj = find_adapted_lens_by_FL(Overrides.primeLength);
            if (lensObj) {
                update_lens_data('OVERRIDE', lensObj);
            }
        }
        // lens_data_alert(knownLens, 'Overrides');
    }
    var hasAnyData = composite_lens_value('found');
    if (!hasAnyData) {
        vAlert('No lens data found at all?');
    }
    // compose accumulated lens data
    for (var s in DescBits.lens) {
        v = composite_lens_value(s);
        if (v !== undefined) {
            DescBits.lens[s] = v;
        }
    }
    addKeywordList(DescBits.lens.keywords, 'Lens');
    //
    if (DescBits.lens.mount) {
        addKey(DescBits.lens.mount);
    }
    //
    // TODO: descriptions more generally
    //
    if (DescBits.lens.description == '') { // TODO: weird case
        if (DescBits.lens.primeLength > 0) {
            var lensObj = find_adapted_lens_by_FL(DescBits.lens.primeLength);
            if (lensObj) {
                update_lens_data('IMPLIED', lensObj); // parrt of the current mess - feb 2025
                addKey(lensObj.name);
                hasAnyData = true;
            } else {
                DescBits.alert('No adapted lens found for '+DescBits.lens.primeLength+'mm');
                // vAlert('Using guessed description: "'+DescBits.lens.primeLength+'mm"');
                DescBits.lens.description = DescBits.lens.primeLength+'mm';
            }
        }
        if (hasAnyData) {
            if (DescBits.lensFamily) {
                DescBits.lens.description = (DescBits.lensFamily + ' ' + DescBits.lens.description);
            }
        }
    }
}

    //
    // focal length assessment
    //
function classify_focal_length()
{
    if (DescBits.lens.equivFL <= 0) {
        DescBits.lens.equivFL = Math.floor( (DescBits.lens.primeLength * DescBits.multiplier) + 0.49);
    }
    if (DescBits.lens.equivFL > 0) {
        if (DescBits.lens.equivFL <= 35) {
            addKey('Wide Angle');
            if (DescBits.lens.equivFL < 25) {
                addKey('Ultra Wide Angle');
            }
        } else if (DescBits.lens.equivFL >= 135) {
            addKey('Tele');
        } else if (DescBits.lens.equivFL >= 85) {
            addKey('Portrait');
        }
        if (DescBits.lens.equivFL !== DescBits.lens.primeLength) {
            fls = DescBits.lens.equivFL.toString();
            if (fls.substr(0,1) === '0') {
               fls = fls.substr (1);
            }
            addKey((fls+'mm_equiv'));
        }
    }
}

/////////////////////////////////////////////////////////////

function original_width(doc)
{ 
    var w = doc.width || DescBits.ImgW; // simplified nov '24
    return w;
}

function original_height(doc)
{
    var h = doc.height || DescBits.ImgH;
    return h;
}

function marked_resized_images(doc)
{
    var x = original_width(doc);
    var y = original_height(doc);
    if ((doc.width != x) || (doc.height != y)) {
        var rText = ('Resized from '+x+', '+y);
        if ((rText == 'Resized from 300, 300') && !verbose) { // a DNG thing?
            return;
        }
        DescBits.alert(rText);
        addKey('resized');
    }
}

function marked_hi_res_images(doc)
{
    var x = original_width(doc);
    var y = original_height(doc);
    if (x*y > (9000*6000)) { // guess
        addKey('hires');
        addKey('hi-res');
    }
}

/////////////////////////////////////////////////////////////

function add_aspect_description(doc)
{
    'use strict';
    var l = Math.max(doc.width, doc.height);
    var s = Math.min(doc.width, doc.height);
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
    var lensObj = find_lens_by_name(keyword);
    if (lensObj) {
        addKeywordList(lensObj.keywords, ('Lens:'+keyword));
    }
    return lensObj;
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
    var B = CameraCatalog[keyword];
    if (B !== undefined) {
        addKeywordList(B.keywords, ('Camera:'+keyword));
        return true;
    }
    return false;
}

// recognize films and relateed keywords
function spot_film_name(keyword)
{
    var films = ['Film', 'film', 'D-76', 'HP5', 'HP 5', 'HP-5', 'Neopan', 'Neopan 1600',
        'PanF', 'Pan F', 'Pan-F', 'Ilford', 'Kodak', 'Agfa', 'ProImage 100', 'Rodinal',
        'T-Max', 'TMax', 'T-Max 400', 'TMax 400', 'TriX', 'Tri X', 'TX 400', 'Tri-X',
        'X-tol', 'Xtol'];
    for (var f in films) {
        if (f == keyword) {
            return true
        }
    }
    return false;
}

// watch for potential overrides, e.g. for a shot with one lens scanning another lens's negatives
function parse_override_keywords()
{
    var keys = Info.keywords;
    for (var k in keys) {
        if (!DescBits.lensData['OVERRIDE'].found) { // if there are two lens specs, first one found wins
            lensObj = spot_known_lens(keys[k]);
            if (lensObj) {
                DescBits.lensData['OVERRIDE'].found = true;
                // DescBits.lensData['OVERRIDE'].lensName = keys[k]; // TODO: better way?
                update_lens_data('OVERRIDE', lensObj);
                continue;
            }
            if (spot_known_lens_family(keys[k])) {
                DescBits.lensData['OVERRIDE'].found = true;
                DescBits.lensData['OVERRIDE'].lensFamily = keys[k];
                continue;
            }
        }
        if (spot_film_camera(keys[k])) {
            DescBits.camera = keys[k];
            DescBits.isFilm = true;
            continue;
        }
        if (spot_film_name(keys[k])) {
            DescBits.isFilm = true;
            continue;
        }
        var m = keys[k].match(/^([A-Za-z]+):(.+)/);
        if (!m) {
            m = keys[k].match(/^(\d+) *mm/); // e.g. "35mm"
            if (m) {
                DescBits.lensData['OVERRIDE'].primeLength = Number(m[1]);                
            }
            continue;
        }
        var subkey = m[1];
        var val = m[2];
        switch(subkey) {
            case 'camera': {
                DescBits.lensData['OVERRIDE'].camera = val;
                break;
            }
            case 'format': {
                DescBits.lensData['OVERRIDE'].format = val;
                break;
            }
            case 'lens': {
                m = val.match(/^\d+/);
                if (m) {
                    DescBits.lensData['OVERRIDE'].primeLength = Number(m[1]);
                } else {
                    DescBits.alert('\nOdd lens override value: "'+keys[k]+'"');
                }
                break;
            }
            default:
                continue;
        }
    }
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
        DescBits.log('\nOverride: '+k+' = '+Overrides[k]);
    }
    if (Overrides.focal_length) {
        DescBits.lens.equivFL = Math.floor( (Overrides.focal_length * DescBits.multiplier) + 0.49);
    }
}

///////////////////////////////////////////

function apply_personal_information() {
    Info.author = Person.fullname;
    Info.credit = Person.fullname;
    Info.authorPosition = Person.relation;
    Info.ownerUrl = Person.url;
    if (Info.city === '') {Info.city = Person.city; }
    if (Info.provinceState === '') {Info.provinceState = Person.region; }
    if (Info.country === '') { Info.country = Person.country; }
}

function assign_copyright(dateObj) {
    var thisYear = dateObj.getFullYear();
    var thisYearS = thisYear.toString();
    Info.copyrighted = CopyrightedType.COPYRIGHTEDWORK;
    if (!(Info.copyrightNotice.length > 2)) {
        Info.copyrightNotice = ('(C) ' + thisYearS + ' ' + Person.fullname);
        DescBits.log('\nAssigned Copyright Notice: "'+Info.copyrightNotice+'"');
    } else {
        // catch minimal notices
        m = Info.copyrightNotice.match(/\[[cC]\] *(\d\d\d\d)$/);
        if (m) {
            DescBits.log('\nExisting Copyright Notice was: "'+Info.copyrightNotice+'"');
            Info.copyrightNotice = ('(C) ' + m[1] + ' ' + Person.fullname);
            DescBits.log('\nAdjusted: "'+Info.copyrightNotice+'"');
        } else {
            DescBits.log('\nUnmatched Existing Copyright Notice: "'+Info.copyrightNotice+'"');
        }
    }
}

function apply_caption() {
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
        if (DescBits.lens.description) {
            Info.caption = (Info.caption + ' + ' + DescBits.lens.description);
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
}

////////////////////////////////////////////

function main()
{
    'use strict';
    if (app.documents.length < 1) {    // stop if no document is opened.
        alert('Sorry, No Current Document');
        return;
    }
    originalRulerUnits = app.preferences.rulerUnits;
    if (originalRulerUnits !== Units.PIXELS) {
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
    scan_EXIF_tags();
    add_implied_data();
    flatten_lens_descriptions();
    classify_focal_length();
    add_aspect_description(app.activeDocument);
    marked_hi_res_images(app.activeDocument);
    marked_resized_images(app.activeDocument);
    apply_personal_information();
    assign_copyright(dt);
    apply_caption();
    if (DescBits.alertText !== '') {
        if (msgs !== '') { msgs += '\n'; }
        msgs += DescBits.alertText;
    }

    if (initKeys === 0) {
        addKey(Person.reminder);
    }
    if (msgs !== '') {
        alert (msgs);
    }
    if (originalRulerUnits !== Units.PIXELS) {
        app.preferences.rulerUnits = originalRulerUnits;
    }
}

main();

// eof
