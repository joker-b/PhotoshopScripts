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

def get_properties(filename):
    'call exiftool for JSON info'
    if not os.path.exists(filename):
        print('get_properties({}): no such file')
        return None
    j = subprocess.run(["exiftool", "-json", filename], capture_output=True)
    return json.loads(j.stdout)

KEYWORDS = {}

def add_keys(item_list):
    'add list items to KEYWORDS'
    for i in item_list:
        KEYWORDS[i] = 1

def add_camera_info_keywords(model_name):
    'look for data about this camera type, add to KEYWORDS'
    camera = KNOWN_CAMERAS.get(model_name)
    if camera is not None:
        add_keys(camera.info)
        # also add to description?
    else:
        print('Unknown camera {}'.format(model_name))

DESC = {}
INFO = {}

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
   ]

def set_fl(q):
    'focal length'
    n = re.sub(r'([0-9.]+).*', r'\1', q)
    oFL = float(n)
    DESC['lens'] = '{}mm'.format(math.floor(oFL+0.49))

def assign_copyright(q):
    'image already has a copyright'
    print('EXIF Copyright: {}'.format(q))
    '''
    if (re.match(r'[0-9]') and not knownPerson):
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
    knownPerson = (q[1].indexOf(Person.fullname) != -1)
    for ip in range(len(Person.altNames)):
      knownPerson |= (q[1] == Person.altNames[ip]);
    if (not knownPerson):
      print('Artist tag: "{}"'.format(q));

def lens_id(q):
    'seek info for known lenses'
    lens = STANDARD_LENSES.get(q)
    if lens is None:
        print('Unknown lens {}'.format(q))
        return
    add_keys(info, lens.info)
    knownLens = True

def setk(q):
    'single keyword'
    KEYWORDS[q] = 1

def setd(v, q):
    'single item in description'
    DESC[v] = q

def seti(v, q):
    'single item in INFO'
    INFO[v] = q

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
    'ShutterSpeedValue': setk, # (1/30)
    'ExposureCompensation': setk, # (0)
    'UserComment': setk, # (+thing)
    'FlashpixVersion': setk, # (0100)
    'ExifImageWidth': setk, # (4032)
    'ExifImageHeight': setk, # (2268)
    'InteropIndex': setk, # (R98 - DCF basic file (sRGB))
    'InteropVersion': setk, # (0100)
    'FocalLengthIn35mmFormat': setk, # (26 mm)
    'GPSVersionID': setk, # (2.2.0.0)
    'GPSLatitudeRef': setk, # (North)
    'GPSLongitudeRef': setk, # (West)
    'GPSAltitudeRef': setk, # (Above Sea Level)
    'GPSTimeStamp': setk, # (22:57:43)
    'GPSDateStamp': setk, # (2020:04:07)
    'Compression': setk, # (JPEG (old-style))
    'ThumbnailOffset': setk, # (1128)
    'ThumbnailLength': setk, # (5895)
    'EncodingProcess': setk, # (Baseline DCT, Huffman coding)
    'BitsPerSample': setk, # (8)
    'ColorComponents': setk, # (3)
    'YCbCrSubSampling': setk, # (YCbCr4:2:0 (2 2))
    'Aperture': setk, # (1.7)
    'GPSAltitude': setk, # (26.3 m Above Sea Level)
    'GPSDateTime': setk, # (2020:04:07 22:57:43Z)
    'GPSLatitude': setk, # (38 deg 14' 38.16" N)
    'GPSLongitude': setk, # (122 deg 39' 29.00" W)
    'GPSPosition': setk, # (38 deg 14' 38.16" N, 122 deg 39' 29.00" W)
    'ImageSize': setk, # (4032x2268)
    'Megapixels': setk, # (9.1)
    'ScaleFactor35efl': setk, # (6.0)
    'ThumbnailImage': setk, # ((Binary data 5895 bytes, use -b option to extract))
    'CircleOfConfusion': setk, # (0.005 mm)
    'FOV': setk, # (69.4 deg)
    'FocalLength35efl': setk, # (4.3 mm (35 mm equivalent: 26.0 mm))
    'HyperfocalDistance': setk, # (2.19 m)
    'LightValue': setk, # (5.8)

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
        print('{}:'.format(t))
        handler(props[t])

'''
def read_desc_bits():

    if (descBits.brand === Vendor.lumix) {
      // used to accomodate the Leica/Panasonic relationship
      add_keys(info,['Leica','Lumix','Leicasonic','Panaleica']);
    } else if (descBits.brand === Vendor.fuji) {
    // Various "Fuji X' cameras
      add_keys(info,['Fuji','Fujifilm','Fuji X',('Fujifilm '+descBits.camera)]);
      var aLens = ADAPTED_LENSES[oFL];
      if (aLens && !knownLens) {
        add_keys(info,aLens.info);
        descBits.min_aperture = aLens.min_aperture;
      }
    }
    if (descBits.camera === 'Scanned') { // never saw any camera data - this must have been a film scan
    add_keys(info,['film','scanned']);
    }
    if (FL <= 0) {
    FL = oFL * descBits.multiplier;
    FL = Math.floor(FL+0.49);
  } else { // equivalent supplied by camera
    fls = (Math.floor(oFL+0.49)).toString();
        if (fls.substr(0,1) === '0') {
           fls = fls.substr (1);
      }
    KEYWORDS = Set.add(KEYWORDS, (fls+'mm_orig'));
    }
    if (FL > 0) {
    if (FL <= 35) {
        KEYWORDS = Set.add(KEYWORDS, 'Wide Angle');
        if (FL < 27) {
          KEYWORDS = Set.add(KEYWORDS, 'Ultra Wide Angle');
        }
    } else if (FL >= 85) {
        KEYWORDS = Set.add(KEYWORDS, 'Telephoto');
    }
      if (descBits.multiplier !== 1.0) {
          fls = FL.toString();
          if (fls.substr(0,1) === '0') {
             fls = fls.substr (1);
        }
          KEYWORDS = Set.add(KEYWORDS, (fls+'mm'));
          KEYWORDS = Set.add(KEYWORDS, (fls+'mm_equiv'));
          //KEYWORDS = Set.add(KEYWORDS, ('Mult:'+descBits.multiplier));
    }
    }
    if ((descBits.aperture === undefined) || (descBits.aperture < descBits.min_aperture)) {
      descBits.aperture = descBits.min_aperture;
    }
    return descBits;
}
'''
def all_mine(filename):
    props = get_properties(filename)
    if props is None:
        return
    # get name without path or extension
    basename = os.path.splitext(os.path.split(filename)[-1])[0]
    jobname = re.sub(r'(_[A-Z0-9]{4}\d{4}.*)', '', basename)
    print('{} and {}'.format(basename, jobname))
    read_tags(props[0])




'''

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
      'camera': 'Digital',
      lens: '',
      shutter: '',
      aperture: '',
      iso: '',
      flash: '',
      alertText: '',
      'multiplier': 1.6,
      'brand': 'Ubuntu',
      min_aperture: 1.4,
    };
    for (var i = 0; i < info.exif.length; i++) {
    var q = info.exif[i];
    var qName = trim11(q[1]);
    switch (q[0]) {
      case 'Make':
          KEYWORDS = Set.add(KEYWORDS, qName);
          break;
      case 'Model':
        add_camera_keys(qName,info,descBits);  // identify specific model of camera
          break;
      case 'Date Time':
      case 'Date Time Original':
          KEYWORDS = Set.add(KEYWORDS,q[1].substr(0,4));
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
            KEYWORDS = Set.add(KEYWORDS, q[1]);
        }
          break;
      case 'Light Source':
        if (q[1] !== 'Unknown') {
            KEYWORDS = Set.add(KEYWORDS, q[1]);
        }
          break;
      case 'Flash':
          var flashVal = parseInt(q[1]);
          if ((flashVal < 16) && (flashVal > 0)) {
                    descBits.alertText += ('\nflashVal: '+flashVal+'');
          KEYWORDS = Set.add(KEYWORDS, 'Strobe');
          descBits.flash = '+ Flash';
          }
          break;
      case 'Scene Type':
          info.source = q[1];
          break;
      case 'Custom Rendered':
          if (q[1] === 'Custom Process') {
          KEYWORDS = Set.add(KEYWORDS, 'BW');
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
        KEYWORDS = Set.add(KEYWORDS, q[1]);
        break;
      case 'EXIF tag 42036': // X-T1: "XF18-55mmF2.8-4 R LM OIS'
        var lens = STANDARD_LENSES[q[1]];
        if (lens) {
          add_keys(info,lens.info);
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
      add_keys(info,['Leica','Lumix','Leicasonic','Panaleica']);
    } else if (descBits.brand === Vendor.fuji) {
    // Various "Fuji X' cameras
      add_keys(info,['Fuji','Fujifilm','Fuji X',('Fujifilm '+descBits.camera)]);
      var aLens = ADAPTED_LENSES[oFL];
      if (aLens && !knownLens) {
        add_keys(info,aLens.info);
        descBits.min_aperture = aLens.min_aperture;
      }
    }
    if (descBits.camera === 'Scanned') { // never saw any camera data - this must have been a film scan
    add_keys(info,['film','scanned']);
    }
    if (FL <= 0) {
    FL = oFL * descBits.multiplier;
    FL = Math.floor(FL+0.49);
  } else { // equivalent supplied by camera
    fls = (Math.floor(oFL+0.49)).toString();
        if (fls.substr(0,1) === '0') {
           fls = fls.substr (1);
      }
    KEYWORDS = Set.add(KEYWORDS, (fls+'mm_orig'));
    }
    if (FL > 0) {
    if (FL <= 35) {
        KEYWORDS = Set.add(KEYWORDS, 'Wide Angle');
        if (FL < 27) {
          KEYWORDS = Set.add(KEYWORDS, 'Ultra Wide Angle');
        }
    } else if (FL >= 85) {
        KEYWORDS = Set.add(KEYWORDS, 'Telephoto');
    }
      if (descBits.multiplier !== 1.0) {
          fls = FL.toString();
          if (fls.substr(0,1) === '0') {
             fls = fls.substr (1);
        }
          KEYWORDS = Set.add(KEYWORDS, (fls+'mm'));
          KEYWORDS = Set.add(KEYWORDS, (fls+'mm_equiv'));
          //KEYWORDS = Set.add(KEYWORDS, ('Mult:'+descBits.multiplier));
    }
    }
    if ((descBits.aperture === undefined) || (descBits.aperture < descBits.min_aperture)) {
      descBits.aperture = descBits.min_aperture;
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

print('\nmissed:')
for t in MISSED_TAG:
    print("    '{}': setk, # ({})".format(t, MISSED_TAG[t]))