'''
based on js edition
//
// Intended usage:
// Label Pix

/* global app, alert, Units, DocumentMode, CopyrightedType */

/* jshint ignore: start */
#target photoshop
app.bringToFront();
/* jshint ignore: end */
'''

import sys
import os
import subprocess
import json
import re
import math

'''
// User Personalization //////////////////////////
//
// This is not 'designed' code I'm afraid -- it's grown from my own practical use and has a few warts.
// This data structure can help personalize it a little -- tailor  the fields 'to fit'
//
// The script recognizes a few different Canon, Leica, Fuji, Google and Panasonic cameras and gives them extra tags. Other
//    camera metadata won't break anything, and should get picked up fine.
//
'''

class Person:
    fullname = 'Kevin Bjorke'
    altNames = ["K.Bjorke botzilla.com", "K. Bjorke"]
    url = 'http://www.kevin-bjorke.com/'
    blog = 'http://www.botzilla.com/'
    relation = 'Owner'
    city = 'San Francisco'
    region = 'California'
    country = 'USA'
    commonTags = ['Bjorke', 'Botzilla.com', 'SF', 'Bay Area',
                  'Petaluma', 'Sonoma County']
    reminder = 'needs_tags'

class Vendor:
    'use as an enum'
    lumix = 'Lumix'
    fuji = 'Fuji'
    canon = 'Canon'
    leica = 'Leica'
    google = 'Google'
    olympus = 'Olympus'
    samsung = 'Samsung'
    ricoh = 'Ricoh'


class CameraInfo:
    'bundler'
    def __init__(self, Info=None, Brand='', Multiplier=1.0, Camera='info'):
        self.info = Info if Info is not None else ['unknown camera']
        self.brand = Brand
        self.multiplier = Multiplier
        self.camera = Camera

class LensInfo:
    'bundler'
    def __init__(self, Info=None, MinAperture=None):
        self.info = Info if Info is not None else ['unknown lens']
        self.min_aperture = MinAperture


KNOWN_CAMERAS = {
    'DMC-LX1': CameraInfo(['LX1', 'DMC_LX1'], Vendor.lumix, 4.4, 'LX1'),
    'DMC-LX2': CameraInfo(['LX2', 'DMC_LX2'], Vendor.lumix, 4.4, 'LX2'),
    'DMC-LX3': CameraInfo(['LX3', 'DMC_LX3'], Vendor.lumix, 4.67, 'LX3'),
    'DMC-LX5': CameraInfo(['LX5', 'DMC_LX5'], Vendor.lumix, 4.67, 'LX5'),
    'DMC-LX7': CameraInfo(['LX7', 'DMC_LX7'], Vendor.lumix, 4.67, 'LX7'),
    'X100S': CameraInfo(['Fuji X100s', 'X100s'], Vendor.fuji, (35.0/23.0), 'X100s'),
    'X100T': CameraInfo(['Fuji X100T', 'X100T'], Vendor.fuji, (35.0/23.0), 'X100T'),
    'X100F': CameraInfo(['Fuji X100F', 'X100F'], Vendor.fuji, (35.0/23.0), 'X100F'),
    'X100V': CameraInfo(['Fuji X100F', 'X100F'], Vendor.fuji, (35.0/23.0), 'X100F'),
    'X-T1': CameraInfo(['Fuji X-T1', 'X-T1'], Vendor.fuji, (35.0/23.0), 'X-T1'),
    'X-Pro2': CameraInfo(['Fuji X-Pro2', 'X-Pro2'], Vendor.fuji, (35.0/23.0), 'X-Pro2'),
    'M Monochrom': CameraInfo(['Leica', 'Leica M', 'M Monochrom', 'Monochrom', 'M', 'Monochrome'],
                              Vendor.leica, 1.0, 'M Monochrom'),
    'Canon EOS 5D': CameraInfo(['5D', 'EOS', 'Canon 5D'], Vendor.canon, 1.0, '5D'),
    'Canon EOS 40D': CameraInfo(['40D', 'EOS', 'Canon 40D'], Vendor.canon, 1.6, '40D'),
    'Canon EOS DIGITAL REBEL': CameraInfo(['300D', 'EOS'], Vendor.canon, 1.6, '300D'),
    'RICOH THETA S': CameraInfo(['Ricoh', 'Theta S', 'Theta', 'Panorama', 'Spherical'],
                                Vendor.ricoh, 1.0, 'Ricoh Theta S'),
    'SM-G920T': CameraInfo(['Samsung', 'Phone', 'Galaxy 6'],
                           Vendor.samsung, 1.0, 'Samsung Galaxy 6'),
    'SM-N950U': CameraInfo(['Samsung', 'Phone', 'Galaxy Note 8', 'Note 8'],
                           Vendor.samsung, 1.0, 'Samsung Galaxy Note 8'),
    'Glass1': CameraInfo(['Google', 'Glass', 'Google Glass', 'Android'],
                         Vendor.google, 8.0, 'Google Glass')
}

KNOWN_LENS = False
KNOWN_PERSON = Person.fullname

STANDARD_LENSES = {
    'XF18-55mmF2.8-4 R LM OIS': LensInfo(['18-55mm', 'f/2.8']),
    'XF90mmF2 R LM WR': LensInfo(['f/2.0']),
    'XF56mmF1.2 R': LensInfo(['f/1.2']),
    'XF35mmF1.4 R': LensInfo(['f/1.4']),
    'XF35mmF2 R WR': LensInfo(['f/2.0']),
    'XF23mmF1.4 R': LensInfo(['f/1.4']),
    'XF23mmF2 R WR': LensInfo(['f/2.0']),
    'XF18mmF2 R': LensInfo(['f/2.0']),
    'XF16mmF1.4 R WR': LensInfo(['f/1.4']),
    'XF14mmF2.8 R': LensInfo(['f/1.4']),
    'Leica Summicron-M 50mm f/2 (IV, V)': LensInfo(['Summicron', 'Summicron-M', 'f/2'])
}

ADAPTED_LENSES = {
    45: LensInfo(['Zeiss', 'Contax', 'Planar', 'f/2', 'Fotodiox', 'planar245', 'carlzeiss'], 2),
    90: LensInfo(['Zeiss', 'Contax', 'Sonnar', 'f/2.8', 'Fotodiox', 'sonnar2890', 'carlzeiss'],
                 2.8),
    50: LensInfo(['Meike', 'f/2.0'], 2.0),
    51: LensInfo(['Canon', 'Canon FD', 'f/1.8', 'Fotodiox'], 1.8),
    16: LensInfo(['Rokinon', 'f/2.8'], 2.8),
}

KEYWORDS = {}
INFO = {}
DESC = {
      'camera': 'Digital',
      'lens': '',
      'shutter': '',
      'aperture': '',
      'iso': '',
      'flash': '',
      'alertText': '',
      'multiplier': 1.6,
      'brand': 'Ubuntu',
      'min_aperture': 1.4,
    }
FL = 0
oFL = 0


def get_properties(filename):
    'call exiftool for JSON info'
    if not os.path.exists(filename):
        print('get_properties({}): no such file')
        return None
    j = subprocess.run(["exiftool", "-json", filename], capture_output=True)
    return json.loads(j.stdout)

def setk(q):
    'single keyword'
    KEYWORDS[q] = 1

def setd(v, q):
    'single item in description'
    DESC[v] = q

def seti(v, q):
    'single item in INFO'
    INFO[v] = q

def add_keys(item_list):
    'add list items to KEYWORDS'
    for i in item_list:
        KEYWORDS[i] = 1

#

#####

IGNORE_TAGS = [
    'MeteringMode', # debugMsg=true; # e.g. "Spot"
    'Orientation', # debugMsg=true;
    'ColorSpace',
    'GPSVersion', # theta s
    'GPSImageDirectionRef', # theta s
    'GPSImageDirection', # theta s
    'ImageDescription', # theta s single \n char
    'ComponentsConfiguration', # theta s
    'PixelXDimension',
    'PixelYDimension',
    'FocalPlaneXResolution',
    'FocalPlaneYResolution',
    'FocalPlaneResolutionUnit',
    'ImageWidth',
    'ImageHeight',
    'XResolution',
    'YResolution',
    'ResolutionUnit',
    'yCbCrPositioning',
    'ExposureTime',
    'ApertureValue',
    'MaxApertureValue',
    'ExposureBiasValue',
    'ExposureMode', #debugMsg=true;
    'WhiteBalance',
    'SensingMethod',
    'FileSource',
    'ExifVersion',
    'FlashPixVersion',
    'DateTimeDigitized',
    'Software',
    'DigitalZoomRatio',
    'CompressedBitsPerPixel',
    'GainControl',
    'Contrast',
    'Saturation',
    'Sharpness',
    'BrightnessValue', # first seen on x100s
    'SubjectDistanceRange', # first seen on x100s
    'SubjectDistance', # first seen on Glass
    'ImageUniqueID', # first seen on Glass
    'EXIFtag258', # '88 8' Bits Per Sample
    'EXIFtag262', # 'RGB' Photometric Interpretation
    'EXIFtag277', # "3' Samples Per Pixel (channels)
    'EXIFtag34864', # "1" on XP2 JPG or RAW... FileSource? Colorspace? SensitivityType?
    'EXIFtag42037', # lens ser #
    'EXIFtag42034', # lens info "rdf:Seq"
    'EXIFtag42035', # X-T1: "FUJIFILM' - Lens Maker I think
    'EXIFtag42033', # X100F serial# (LX7 too?)
    'EXIFtag41483', # Glass, unknown
    'SourceFile', # (/home/kevinbjorke/pix/tester.jpg)
    'ExifToolVersion', # (11.16)
    'FileName', # (tester.jpg)
    'Directory', # (/home/kevinbjorke/pix)
    'FileSize', # (746 kB)
    'FileModifyDate', # (2020:05:30 15:32:11-07:00)
    'FileAccessDate', # (2020:06:02 19:27:24-07:00)
    'FileInodeChangeDate', # (2020:05:30 15:32:11-07:00)
    'FilePermissions', # (rw-r--r--)
    'FileType', # (JPEG)
    'FileTypeExtension', # (jpg)
    'MIMEType', # (image/jpeg)
    'JFIFVersion', # (1.01)
    'ExifByteOrder', # (Little-endian (Intel, II))
    'ModifyDate', # (2020:04:07 15:57:47)
    'YCbCrPositioning', # (Centered)
    'ExifImageWidth', # (4032)
    'ExifImageHeight', # (2268)
    'InteropIndex', # (R98 - DCF basic file (sRGB))
    'InteropVersion', # (0100)
    'GPSVersionID', # (2.2.0.0)
    'GPSLatitudeRef', # (North)
    'GPSLongitudeRef', # (West)
    'GPSAltitudeRef', # (Above Sea Level)
    'GPSTimeStamp', # (22:57:43)
    'GPSDateStamp', # (2020:04:07)
    'Compression', # (JPEG (old-style))
    'ThumbnailOffset', # (1128)
    'ThumbnailLength', # (5895)
    'EncodingProcess', # (Baseline DCT, Huffman coding)
    'BitsPerSample', # (8)
    'ColorComponents', # (3)
    'YCbCrSubSampling', # (YCbCr4:2:0 (2 2))
    'GPSAltitude', # (26.3 m Above Sea Level)
    'GPSDateTime', # (2020:04:07 22:57:43Z)
    'GPSLatitude', # (38 deg 14' 38.16" N)
    'GPSLongitude', # (122 deg 39' 29.00" W)
    'GPSPosition', # (38 deg 14' 38.16" N, 122 deg 39' 29.00" W)
    'ImageSize', # (4032x2268)
    'Megapixels', # (9.1)
    'ThumbnailImage', # ((Binary data 5895 bytes, use -b option to extract))
    'CircleOfConfusion', # (0.005 mm)
    'LightValue', # (5.8)
    ]

# EXIF Tag handlers

def add_camera_info_keywords(model_name):
    'look for data about this camera type, add to KEYWORDS'
    camera = KNOWN_CAMERAS.get(model_name)
    if camera is not None:
        add_keys(camera.info)
        setd('camera', camera)
    else:
        print('Unknown camera {}'.format(model_name))
        setd('camera', None)

def set_fl(q):
    'focal length'
    n = re.sub(r'([0-9.]+).*', r'\1', q)
    oFL = float(n)
    DESC['lens'] = '{}mm'.format(math.floor(oFL+0.49))

def assign_copyright(q):
    'image already has a copyright'
    print('EXIF Copyright: {}'.format(q))
    '''
    if (re.match(r'[0-9]') and not KNOWN_PERSON):
        if (q[1].indexOf(Person.fullName) < 0):
            DESC['alert'] += ('\nEXIF Copyright Notice:\n"'+q[1]+'"')
            '''

def capture_type(q):
    'may be abnormal'
    if q != 'Normal':
        KEYWORDS[q] = 1

def lightsource_type(q):
    'e.g. flash'
    if q != 'Unknown':
        KEYWORDS[q] = 1

def flash_type(q):
    'if any'
    if q == 'No Flash':
        return
    flashVal = int(q)
    if ((flashVal < 16) and (flashVal > 0)):
            print('Flash value was {}'.format(q))
    KEYWORDS['Strobe'] = 1
    DESC['flash'] = '+ Flash';

def custom(q):
    'e.g., black and white'
    if q == 'Custom Process':
        KEYWORDS['BW'] = 1

def artist(q):
    'no need to reset for a known person'
    KNOWN_PERSON = (q[1].indexOf(Person.fullname) != -1)
    for ip in range(len(Person.altNames)):
      KNOWN_PERSON |= (q[1] == Person.altNames[ip]);
    if (not KNOWN_PERSON):
      print('Artist tag: "{}"'.format(q));

def lens_id(q):
    'seek info for known lenses'
    lens = STANDARD_LENSES.get(q)
    if lens is None:
        print('Unknown lens {}'.format(q))
        return
    add_keys(lens.info)
    KNOWN_LENS = True

def set_focal_length(q):
    FL=float(q)

EXIFHandler = {
    'Make': setk,
    #'Make': lambda q: setk(q),
    'Model': lambda q: add_camera_info_keywords(q),
    'DateTime': lambda q: setk(q[0:4]),
    'DateTimeOriginal': lambda q: setk(q[0:4]),
    'FocalLengthin35mmFilm': lambda q: set_focal_length(q),
    'ShutterSpeed': lambda q: setd('shutter', q),
    'FocalLength': lambda q: set_fl(q),
    'F-Stop': lambda q: setd('aperture', q),
    'ISOSpeedRatings': lambda q: setd('iso', q),
    'Copyright': lambda q: assign_copyright(q),
    'SceneCaptureType': lambda q: capture_type(q),
    'LightSource': lambda q: lightsource_type(q),
    'Flash': lambda q: flash_type(q),
    'SceneType': lambda q: seti('source', q),
    'CustomRendered': lambda q: custom(q),
    'Artist': lambda q: artist(q),
    'ExposureProgram': lambda q: setk(q),
    'EXIFtag42036': lambda q: lens_id(q), # X-T1: "XF18-55mmF2.8-4 R LM OIS'

    'FNumber': lambda q: setd('aperture', q), # (1.7)
    'ISO': lambda q: setd('iso', q), # (160)
    'CreateDate': lambda q: setk(q[0:4]), # (2020:04:07 15:57:47)
    'ShutterSpeedValue': lambda q: setd('shutter_speed', q), # (1/30)
    'ExposureCompensation': lambda q: setd('EV Comp', q), # (0)
    'UserComment': lambda q: setd('COMMENT', q), # (+thing)
    'Aperture': lambda q: setd('aperture', q), # (1.7)
    'FocalLengthIn35mmFormat': lambda q: setd('FL35', q), # (26 mm)
    'ScaleFactor35efl': lambda q: setd('multiplier', float(q)), # (6.0)
    'FOV': lambda q: setd('fov', q), # (69.4 deg)
    'FocalLength35efl': lambda q: setd('FL35', q), # (4.3 mm (35 mm equivalent: 26.0 mm))
    'HyperfocalDistance': lambda q: setd('hyper', q), # (2.19 m)
    'FlashpixVersion': lambda q: setd('FlashPixV', q), # (0100)

}

MISSED_TAG = {}

def read_tags(props):
    for t in props:
        if IGNORE_TAGS.__contains__(t):
            continue
        handler = EXIFHandler.get(t, None)
        if not handler:
            print("Didn't parse tag {} ({})".format(t, props[t]))
            MISSED_TAG[t] = props[t]
            continue
        # print('{}:'.format(t))
        handler(props[t])

def read_desc():
    if not DESC.get('camera'):
        print("Unknown camera")
        if DESC.camera.brand == Vendor.lumix:
            add_keys(['Leica','Lumix','Leicasonic','Panaleica'])
        elif DESC.camera.brand == Vendor.fuji:
            add_keys(['Fuji','Fujifilm','Fuji X',('Fujifilm '+DESC.camera)]);
            if not KNOWN_LENS:
              aLens = ADAPTED_LENSES.get(oFL)
              if (aLens):
                add_keys(INFO,aLens.info)
                DESC.min_aperture = aLens.min_aperture
        if DESC.camera.brand == 'Scanned': # no actual camera
            add_keys(['film','scanned'])
        if FL <= 0:
            FL = oFL * DESC.multiplier # might still be zero....
            FL = math.floor(FL + 0.49)
        else:
            fl_temp = math.floor(oFL+0.49)
            setk('{}mm_orig'.format(fls))
        if FL > 0:
            if FL <= 35:
                setk('Wide Angle')
                if FL < 27:
                    setk('Ultra Wide Angle')
            elif FL >= 85:
                setk('Telephoto')
                if FL < 110:
                    setk('Portrait Lens')
            if DESC.multiplier != 1.0:
                setk('{}mm'.format(FL))
                setk('{}mm_equiv'.format(FL))

def all_mine(filename):
    props = get_properties(filename)
    if props is None:
        return
    # get name without path or extension
    basename = os.path.splitext(os.path.split(filename)[-1])[0]
    jobname = re.sub(r'(_[A-Z0-9]{4}\d{4}.*)', '', basename)
    print('{} and {}'.format(basename, jobname))
    read_tags(props[0])
    read_desc()




'''

////////////// march through EXIF tags //////////////

function aspectDesc(doc)
{
  'use strict';
    var INFO = doc.info;
    var l = Math.max(doc.width,doc.height);
    var s = Math.min(doc.width,doc.height);
    var aspect = (l/s);
    var wide = (doc.width > doc.height);
    if (aspect>2.36) {
      KEYWORDS = Set.add(KEYWORDS, 'Panorama');
      if (!wide) {
        KEYWORDS = Set.add(KEYWORDS, 'Tall');
      }
    } else if (aspect>2.3) {
      KEYWORDS = Set.add(KEYWORDS, (wide?'2.35:1':'1:2.35')); 
    } else if (aspect>1.97) {
      KEYWORDS = Set.add(KEYWORDS, (wide?'2:1':'1:2')); 
    } else if (aspect>1.68) {
      KEYWORDS = Set.add(KEYWORDS, (wide?'16:9':'9:16'));
     } else if (aspect>1.45) {
      KEYWORDS = Set.add(KEYWORDS, (wide?'3:2':'2:3')); 
    } else if (aspect>1.25) {
      KEYWORDS = Set.add(KEYWORDS, (wide?'4:3':'3:4')); 
    } else {
      KEYWORDS = Set.add(KEYWORDS, 'Square');       
      KEYWORDS = Set.add(KEYWORDS, '1:1');        
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
    var initKeys = KEYWORDS.length;
    // this dialog message temporarily disabled....
    //if (initKeys > 0) {
  //  msgs = (msgs + initKeys.toString() + ' key'+((initKeys>1)?'s':'')+' already defined');
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
    // KEYWORDS added to doc...
    //
  newKeys = newKeys.concat( [ jobName(app.activeDocument.name) ] );
    add_keys(info,newKeys);
    var DESC = scanEXIFstuff(app.activeDocument);
    aspectDesc(app.activeDocument);
    if (DESC.alertText !== '') {
    if (msgs !== '') { msgs += '\n'; }
    msgs += DESC.alertText;
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
    info.caption = (DESC.camera+
            DESC.lens+
            DESC.shutter+
            DESC.aperture+
            DESC.iso+
            DESC.flash+'\n'+
            Person.blog+'\n'+
            noExtension(app.activeDocument.name));
    info.captionWriter = Person.fullname;
    }
    if (info.city === '') {info.city = Person.city; }
    if (info.provinceState === '') {info.provinceState = Person.region; }
    if (info.country === '') { info.country = Person.country; }
    if (initKeys === 0) {
    KEYWORDS = Set.add(KEYWORDS, Person.reminder);
    }
    if (msgs !== '') {
    alert (msgs);
    }
    if (strtRulerUnits !== Units.PIXELS) {
    app.preferences.rulerUnits = strtRulerUnits;
    }
}

main();
'''

image_filename = '/home/kevinbjorke/pix/tester.jpg'

# TODO(kevin): get name from sys.argv

all_mine(image_filename)

print('\n{}'.format(list(KEYWORDS.keys())))
print('\n{}'.format(list(DESC.keys())))
print('\n{}'.format(list(INFO.keys())))

#print('\nmissed:')
#for t in MISSED_TAG:
#    print("    '{}': setk, # ({})".format(t, MISSED_TAG[t]))