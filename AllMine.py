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

EQUIV_FOCAL_LEN = 0
ORIG_FOCAL_LENGTH = 0

def get_properties(filename):
    'call exiftool for JSON info'
    if not os.path.exists(filename):
        print('get_properties({}): no such file'.format(filename))
        return None
    j = subprocess.run(["exiftool", "-json", filename], capture_output=True)
    return json.loads(j.stdout)

def setk(tag_value):
    'single keyword'
    KEYWORDS[tag_value] = 1

def setk_if(tag_value, special_value):
    'single keyword'
    if tag_value == special_value:
        setk(tag_value)

def setk_unless(tag_value, special_value):
    'single keyword'
    if tag_value != special_value:
        setk(tag_value)

def add_keys(item_list):
    'add list items to KEYWORDS'
    for i in item_list:
        setk(i)

#

def setd(item_name, tag_value):
    'single item in description'
    DESC[item_name] = tag_value

def seti(item_name, tag_value):
    'single item in INFO'
    INFO[item_name] = tag_value

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
    'ExposureProgram',
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

    'Version', # (0130)
    'InternalSerialNumber', # (FFDT22907438     593530393432 2016:02:15 59302031046F)
    'Quality', # (NORMAL ) # Fuji
    'WhiteBalanceFineTune', # (Red +0, Blue +0)
    'NoiseReduction', # (0 (normal))
    'HighISONoiseReduction', # (Normal)
    'FujiFlashMode', # (Manual)
    'FocusMode', # (Manual)
    'AFMode', # (No)
    'FocusPixel', # (3001 2001)
    'AF-CSetting', # (Set 1 (multi-purpose))
    'AF-CTrackingSensitivity', # (2)
    'AF-CSpeedTrackingSensitivity', # (0)
    'AF-CZoneAreaSwitching', # (Auto)
    'SlowSync', # (Off)
    'PictureMode', # (Aperture-priority AE)
    'ExposureCount', # (1)
    'ShadowTone', # (0 (normal))
    'HighlightTone', # (0 (normal))
    'LensModulationOptimizer', # (On)
    'GrainEffect', # (Off)
    'ShutterType', # (Mechanical)
    'AutoBracketing', # (On)
    'SequenceNumber', # (1)
    'BlurWarning', # (None)
    'FocusWarning', # (Good)
    'ExposureWarning', # (Good)
    'DynamicRange', # (Standard)
    'DynamicRangeSetting', # (Auto (100-400%))
    'MinFocalLength', # (90)
    'MaxFocalLength', # (90)
    'MaxApertureAtMinFocal', # (2)
    'MaxApertureAtMaxFocal', # (2)
    'AutoDynamicRange', # (100%)
    'ImageStabilization', # (None; Off; 0)
    'ImageCount', # (18996)
    'FlickerReduction', # (Off (0x00f1))
    'FacesDetected', # (0)
    'NumFaceElements', # (0)
    'LensSerialNumber', # (57A05041)
    'LensInfo', # (90mm f/2)
    'LensMake', # (FUJIFILM)
    'PrintIMVersion', # (0250)
    'PreviewImageWidth', # (320)
    'PreviewImageHeight', # (240)
    'PreviewImage', # ((Binary data 13058 bytes, use -b option to extract))
    'PreviewImageSize', # (320x240)

    'RawImageFullSize', # (6160x4032)
    'FujiLayout', # (12 12 12 12)
    'XTransLayout', # (BGGRGG RGGBGG GBRGRB RGGBGG BGGRGG GRBGBR)
    'RawExposureBias', # (+0.3)
    'RawImageWidth', # (6032)
    'RawImageHeight', # (4032)
    'RawImageFullWidth', # (6160)
    'RawImageFullHeight', # (4032)
    'StripOffsets', # (360448)
    'StripByteCounts', # (49674240)
    'BlackLevel', # (1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019 1019)
    'GeometricDistortionParams', # (327.7272727 0 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1 0 0 0 0 0 0 0 0 0 0 0)
    'WB_GRBLevelsStandard', # (302 386 833 17 302 680 490 21)
    'WB_GRBLevelsAuto', # (302 552 594)
    'WB_GRBLevels', # (302 552 594)
    'ChromaticAberrationParams', # (360.5 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1 5.6e-05 0.000106 0.000141 0.000156 0.000152 0.00015 0.000181 0.000181 0.000198 0.000213 2.3e-05 4.3e-05 5.7e-05 6.2e-05 6.1e-05 6e-05 6.1e-05 6.1e-05 4.8e-05 0)
    'VignettingParams', # (327.7272727 0 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1 100 99.82 99.67 99.6 99.63 99.6 99.27 98.52 96.68 94.38 91.37)
    'BlueBalance', # (1.966887)
    'RedBalance', # (1.827815)
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

def set_fl(tag_string):
    'focal length'
    global ORIG_FOCAL_LENGTH
    n = re.sub(r'([0-9.]+).*', r'\1', str(tag_string))
    ORIG_FOCAL_LENGTH = float(n)
    mm = '{}mm'.format(math.floor(ORIG_FOCAL_LENGTH+0.49))
    setd('lens', mm)
    setk(mm)

def assign_copyright(tag_string):
    'image already has a copyright'
    print('Image {}'.format(tag_string))
    '''
    if (re.match(r'[0-9]') and not KNOWN_PERSON):
        if (tag_string[1].indexOf(Person.fullName) < 0):
            DESC['alert'] += ('\nEXIF Copyright Notice:\n"'+tag_string[1]+'"')
            '''

def flash_type(tag_string):
    'if any'
    if tag_string == 'No Flash':
        return
    flashVal = int(tag_string)
    if ((flashVal < 16) and (flashVal > 0)):
        print('Flash value was {}'.format(tag_string))
    setk('Strobe')
    DESC['flash'] = '+ Flash';

def custom(tag_string):
    'e.g., black and white'
    if tag_string == 'Custom Process':
        setk('BW')

def artist(tag_string):
    'no need to reset for a known person'
    KNOWN_PERSON = True # for not TODO
    return
    KNOWN_PERSON = (tag_string.indexOf(Person.fullname) != -1)
    for ip in range(len(Person.altNames)):
      KNOWN_PERSON |= (tag_string[1] == Person.altNames[ip]);
    if (not KNOWN_PERSON):
      print('Artist tag: "{}"'.format(tag_string));

def lens_id(tag_string):
    'seek info for known lenses'
    lens = STANDARD_LENSES.get(tag_string)
    if lens is None:
        print('Unknown lens {}'.format(tag_string))
        return
    add_keys(lens.info)
    KNOWN_LENS = True

def set_focal_length(tag_string):
    'numeric effective focal length'
    global EQUIV_FOCAL_LENGTH
    v = float(tag_string)
    if v > 0:
        EQUIV_FOCAL_LENGTH = v

def set_flash_comp(tag_string):
    'special exceptions'
    if tag_string == "0" or tag_string == 0:
        return
    setk("Flash Comp {}".format(tag_string))

def rate(tag_string):
    'watch for special ranking'
    if tag_string == "0" or tag_string == 0:
        return
    setk("Rank {}".format(tag_string))

def film_mode(tag_string):
    film = re.sub(r'.*\((\w+)\).*',r'\1',tag_string)
    setk(film)

def add_comment(tag_string):
    setd('COMMENT', tag_string)
    setk(tag_string)

def raw(tag_string):
    setk('RAW')

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
    'SceneCaptureType': lambda q: setk_unless(q, 'Normal'),
    'LightSource': lambda q: setk_unless(q, 'Unknown'),
    'Flash': lambda q: flash_type(q),
    'SceneType': lambda q: seti('source', q),
    'CustomRendered': lambda q: custom(q),
    'Artist': lambda q: artist(q),
    'EXIFtag42036': lambda q: lens_id(q), # X-T1: "XF18-55mmF2.8-4 R LM OIS'

    'FNumber': lambda q: setd('aperture', q), # (1.7)
    'ISO': lambda q: setd('iso', q), # (160)
    'CreateDate': lambda q: setk(q[0:4]), # (2020:04:07 15:57:47)
    'ShutterSpeedValue': lambda q: setd('shutter_speed', q), # (1/30)
    'ExposureCompensation': lambda q: setd('EV Comp', q), # (0)
    'UserComment': add_comment, # (+thing)
    'Aperture': lambda q: setd('aperture', q), # (1.7)
    'FocalLengthIn35mmFormat': lambda q: setd('FOCAL_LENGTH35', q), # (26 mm)
    'ScaleFactor35efl': lambda q: setd('multiplier', float(q)), # (6.0)
    'FOV': lambda q: setd('fov', q), # (69.4 deg)
    'FocalLength35efl': lambda q: setd('FOCAL_LENGTH35', q), # (4.3 mm (35 mm equivalent: 26.0 mm))
    'HyperfocalDistance': lambda q: setd('hyper', q), # (2.19 m)
    'FlashpixVersion': lambda q: setd('FlashPixV', q), # (0100)

    'SensitivityType': lambda q: setk_unless(q, 'Standard Output Sensitivity'),
    'FlashExposureComp': set_flash_comp, # (0)
    'ImageGeneration': lambda q: setk_unless(q, 'Original Image'),
    'Rating': rate, # (0)
    'LensModel': lens_id, # (XF90mmF2 R LM WR) # TODO
    'FilmMode': film_mode, # (F0/Standard (Provia)) # TODO

    'RAFVersion': raw, # (0500)
}


# TODO(kevin): in operation, ignore unmatched tags. Too many! But remeber these for later, some will be useful for writing

'''
    'Caption-Abstract': setk, # (X100F, 23mm - 1/250 sec f/8, ISO 200
http://www.botzilla.com/
bjorke_Green_KBXF7882)
    'Writer-Editor': setk, # (Kevin Bjorke)
    'By-line': setk, # (Kevin Bjorke)
    'By-lineTitle': setk, # (Owner)
    'ObjectName': setk, # (Green_KBXF7882)
    'Province-State': setk, # (California)
    'Country-PrimaryLocationName': setk, # (USA)
    'URL': setk, # (http://www.kevin-bjorke.com/)
    'Keywords': setk, # ([2020, '35mm', '35mm_equiv', '3:2', 'Aperture priority', 'Bay Area', 'Bjorke', 'Botzilla.com', 'California', 'Daylight', 'FUJIFILM', 'Fuji', 'Fuji X', 'Fuji X100F', 'Fujifilm', 'Fujifilm X100F', 'Green', 'Kevin Bjorke', 'Petaluma', 'SF', 'San Francisco', 'Sonoma County', 'Standard', 'Wide Angle', 'X100F', 'scooter', 'motobike', 'green'])
    'CopyrightNotice': setk, # ( Â¬Â© 2020 Kevin Bjorke)
    'CopyrightFlag': setk, # (True)
    'ICCProfileName': setk, # (Adobe RGB (1998))
    'Source': setk, # (Direct Photographed Image)
    'Credit': setk, # (Kevin Bjorke)
    'AuthorsPosition': setk, # (Owner)
    'Headline': setk, # (Green_KBXF7882)
    'CaptionWriter': setk, # (Kevin Bjorke)
    'City': setk, # (San Francisco)
    'State': setk, # (California)
    'Country': setk, # (USA)
    'WebStatement': setk, # (http://www.kevin-bjorke.com/)
    'Creator': setk, # (Kevin Bjorke)
    'Rights': setk, # ( ¬© 2020 Kevin Bjorke)
    'Subject': setk, # ([2020, '35mm', '35mm_equiv', '3:2', 'Aperture priority', 'Bay Area', 'Bjorke', 'Botzilla.com', 'California', 'Daylight', 'FUJIFILM', 'Fuji', 'Fuji X', 'Fuji X100F', 'Fujifilm', 'Fujifilm X100F', 'Green', 'Kevin Bjorke', 'Petaluma', 'SF', 'San Francisco', 'Sonoma County', 'Standard', 'Wide Angle', 'X100F', 'scooter', 'motobike', 'green'])
    'Title': setk, # (Green_KBXF7882)
    'Description': setk, # (X100F, 23mm - 1/250 sec f/8, ISO 200
http://www.botzilla.com/
bjorke_Green_KBXF7882)
'''

'''
    'SerialNumber': setk, # (72A51883)
    'CurrentIPTCDigest': setk, # (1a9c6c3a06f14d5a1f8323e43f8ec687)
    'ApplicationRecordVersion': setk, # (0)
    'TimeCreated': setk, # (13:31:07)
    'IPTCDigest': setk, # (1a9c6c3a06f14d5a1f8323e43f8ec687)
    'DisplayedUnitsX': setk, # (inches)
    'DisplayedUnitsY': setk, # (inches)
    'PrintStyle': setk, # (Centered)
    'PrintPosition': setk, # (0 0)
    'PrintScale': setk, # (1)
    'GlobalAngle': setk, # (30)
    'GlobalAltitude': setk, # (30)
    'URL_List': setk, # ([])
    'SlicesGroupName': setk, # (bjorke_Green_KBXF7882)
    'NumSlices': setk, # (1)
    'PixelAspectRatio': setk, # (1)
    'PhotoshopThumbnail': setk, # ((Binary data 8310 bytes, use -b option to extract))
    'HasRealMergedData': setk, # (Yes)
    'WriterName': setk, # (Adobe Photoshop)
    'ReaderName': setk, # (Adobe Photoshop 2020)
    'PhotoshopQuality': setk, # (8)
    'PhotoshopFormat': setk, # (Standard)
    'ProgressiveScans': setk, # (3 Scans)
    'XMPToolkit': setk, # (Adobe XMP Core 5.6-c148 79.164036, 2019/08/13-01:06:57        )
    'Format': setk, # (image/jpeg)
    'CreatorTool': setk, # (Digital Camera X100F Ver2.11)
    'MetadataDate': setk, # (2020:04:15 09:41:32-07:00)
    'LateralChromaticAberrationCorrectionAlreadyApplied': setk, # (True)
    'VignetteCorrectionAlreadyApplied': setk, # (True)
    'DateCreated': setk, # (2020:03:16 13:31:07)
    'ColorMode': setk, # (RGB)
    'DocumentID': setk, # (adobe:docid:photoshop:4701150c-d68c-8741-82c4-ee2c29349973)
    'OriginalDocumentID': setk, # (D8EA27630F7341CE46A9C5BF917E90D9)
    'InstanceID': setk, # (xmp.iid:cab8ddc1-60ff-410a-8174-cbe0ed306fe8)
    'ProcessVersion': setk, # (11.0)
    'ColorTemperature': setk, # (5100)
    'Tint': setk, # (+10)
    'LuminanceSmoothing': setk, # (0)
    'ColorNoiseReduction': setk, # (25)
    'VignetteAmount': setk, # (0)
    'ShadowTint': setk, # (0)
    'RedHue': setk, # (0)
    'RedSaturation': setk, # (0)
    'GreenHue': setk, # (0)
    'GreenSaturation': setk, # (0)
    'BlueHue': setk, # (0)
    'BlueSaturation': setk, # (0)
    'Vibrance': setk, # (0)
    'HueAdjustmentRed': setk, # (0)
    'HueAdjustmentOrange': setk, # (0)
    'HueAdjustmentYellow': setk, # (0)
    'HueAdjustmentGreen': setk, # (0)
    'HueAdjustmentAqua': setk, # (0)
    'HueAdjustmentBlue': setk, # (0)
    'HueAdjustmentPurple': setk, # (0)
    'HueAdjustmentMagenta': setk, # (0)
    'SaturationAdjustmentRed': setk, # (0)
    'SaturationAdjustmentOrange': setk, # (0)
    'SaturationAdjustmentYellow': setk, # (0)
    'SaturationAdjustmentGreen': setk, # (0)
    'SaturationAdjustmentAqua': setk, # (0)
    'SaturationAdjustmentBlue': setk, # (0)
    'SaturationAdjustmentPurple': setk, # (0)
    'SaturationAdjustmentMagenta': setk, # (0)
    'LuminanceAdjustmentRed': setk, # (0)
    'LuminanceAdjustmentOrange': setk, # (0)
    'LuminanceAdjustmentYellow': setk, # (0)
    'LuminanceAdjustmentGreen': setk, # (0)
    'LuminanceAdjustmentAqua': setk, # (0)
    'LuminanceAdjustmentBlue': setk, # (0)
    'LuminanceAdjustmentPurple': setk, # (0)
    'LuminanceAdjustmentMagenta': setk, # (0)
    'SplitToningShadowHue': setk, # (0)
    'SplitToningShadowSaturation': setk, # (0)
    'SplitToningHighlightHue': setk, # (0)
    'SplitToningHighlightSaturation': setk, # (0)
    'SplitToningBalance': setk, # (0)
    'ParametricShadows': setk, # (0)
    'ParametricDarks': setk, # (0)
    'ParametricLights': setk, # (0)
    'ParametricHighlights': setk, # (0)
    'ParametricShadowSplit': setk, # (25)
    'ParametricMidtoneSplit': setk, # (50)
    'ParametricHighlightSplit': setk, # (75)
    'SharpenRadius': setk, # (+1.0)
    'SharpenDetail': setk, # (25)
    'SharpenEdgeMasking': setk, # (0)
    'PostCropVignetteAmount': setk, # (0)
    'GrainAmount': setk, # (0)
    'ColorNoiseReductionDetail': setk, # (50)
    'ColorNoiseReductionSmoothness': setk, # (50)
    'LensProfileEnable': setk, # (0)
    'LensManualDistortionAmount': setk, # (0)
    'PerspectiveVertical': setk, # (0)
    'PerspectiveHorizontal': setk, # (0)
    'PerspectiveRotate': setk, # (0.0)
    'PerspectiveScale': setk, # (100)
    'PerspectiveAspect': setk, # (0)
    'PerspectiveUpright': setk, # (0)
    'PerspectiveX': setk, # (0.0)
    'PerspectiveY': setk, # (0.0)
    'AutoLateralCA': setk, # (1)
    'Exposure2012': setk, # (0.0)
    'Contrast2012': setk, # (0)
    'Highlights2012': setk, # (-57)
    'Shadows2012': setk, # (0)
    'Whites2012': setk, # (0)
    'Blacks2012': setk, # (0)
    'Clarity2012': setk, # (0)
    'DefringePurpleAmount': setk, # (0)
    'DefringePurpleHueLo': setk, # (30)
    'DefringePurpleHueHi': setk, # (70)
    'DefringeGreenAmount': setk, # (0)
    'DefringeGreenHueLo': setk, # (40)
    'DefringeGreenHueHi': setk, # (60)
    'Dehaze': setk, # (0)
    'Texture': setk, # (0)
    'ToneMapStrength': setk, # (0)
    'ConvertToGrayscale': setk, # (False)
    'OverrideLookVignette': setk, # (False)
    'ToneCurveName': setk, # (Medium Contrast)
    'ToneCurveName2012': setk, # (Linear)
    'CameraProfile': setk, # (Adobe Standard)
    'CameraProfileDigest': setk, # (272224000D5765B749BB38DB525CB88C)
    'LensProfileSetup': setk, # (LensDefaults)
    'UprightVersion': setk, # (151388160)
    'UprightCenterMode': setk, # (0)
    'UprightCenterNormX': setk, # (0.5)
    'UprightCenterNormY': setk, # (0.5)
    'UprightFocalMode': setk, # (0)
    'UprightFocalLength35mm': setk, # (35)
    'UprightPreview': setk, # (False)
    'UprightTransformCount': setk, # (6)
    'UprightFourSegmentsCount': setk, # (0)
    'HasSettings': setk, # (True)
    'HasCrop': setk, # (False)
    'AlreadyApplied': setk, # (True)
    'Marked': setk, # (True)
    'HistoryAction': setk, # (['saved', 'saved', 'derived', 'saved', 'saved', 'converted', 'saved', 'saved', 'converted', 'derived', 'saved'])
    'HistoryInstanceID': setk, # (['xmp.iid:6e61dc6f-a709-436b-85ab-1752afe445d9', 'xmp.iid:ececec31-e64d-47a6-99c6-7372e8babe66', 'xmp.iid:cb2496da-8da0-474b-94fe-85279b32fc5e', 'xmp.iid:14fc80e5-66f7-4064-ac58-eaf28b41e841', 'xmp.iid:b330b44c-f6f2-4c75-af9f-114349e51ece', 'xmp.iid:91f608c0-5a95-4f6b-a0f8-d28437ce3693', 'xmp.iid:cab8ddc1-60ff-410a-8174-cbe0ed306fe8'])
    'HistoryWhen': setk, # (['2020:04:15 09:37:02-07:00', '2020:04:15 09:37:03-07:00', '2020:04:15 09:37:52-07:00', '2020:04:15 09:40:15-07:00', '2020:04:15 09:40:15-07:00', '2020:04:15 09:41:32-07:00', '2020:04:15 09:41:32-07:00'])
    'HistorySoftwareAgent': setk, # (['Adobe Photoshop Camera Raw 12.2', 'Adobe Photoshop Camera Raw 12.2 (Macintosh)', 'Adobe Photoshop Camera Raw 12.2 (Macintosh)', 'Adobe Photoshop 21.1 (Macintosh)', 'Adobe Photoshop 21.1 (Macintosh)', 'Adobe Photoshop 21.1 (Macintosh)', 'Adobe Photoshop 21.1 (Macintosh)'])
    'HistoryChanged': setk, # (['/metadata', '/metadata', '/', '/', '/', '/', '/'])
    'HistoryParameters': setk, # (['converted from image/x-fuji-raw to image/tiff', 'from image/tiff to application/vnd.adobe.photoshop', 'from application/vnd.adobe.photoshop to image/jpeg', 'converted from application/vnd.adobe.photoshop to image/jpeg'])
    'DerivedFromInstanceID': setk, # (xmp.iid:91f608c0-5a95-4f6b-a0f8-d28437ce3693)
    'DerivedFromDocumentID': setk, # (xmp.did:cb2496da-8da0-474b-94fe-85279b32fc5e)
    'DerivedFromOriginalDocumentID': setk, # (D8EA27630F7341CE46A9C5BF917E90D9)
    'ToneCurve': setk, # (['0, 0', '32, 22', '64, 56', '128, 128', '192, 196', '255, 255'])
    'ToneCurveRed': setk, # (['0, 0', '255, 255'])
    'ToneCurveGreen': setk, # (['0, 0', '255, 255'])
    'ToneCurveBlue': setk, # (['0, 0', '255, 255'])
    'ToneCurvePV2012': setk, # (['0, 0', '255, 255'])
    'ToneCurvePV2012Red': setk, # (['0, 0', '255, 255'])
    'ToneCurvePV2012Green': setk, # (['0, 0', '255, 255'])
    'ToneCurvePV2012Blue': setk, # (['0, 0', '255, 255'])
    'LookName': setk, # (Adobe Color)
    'LookAmount': setk, # (1.0)
    'LookUuid': setk, # (B952C231111CD8E0ECCF14B86BAA7077)
    'LookSupportsAmount': setk, # (False)
    'LookSupportsMonochrome': setk, # (False)
    'LookSupportsOutputReferred': setk, # (False)
    'LookCopyright': setk, # (© 2018 Adobe Systems, Inc.)
    'LookGroup': setk, # (Profiles)
    'LookParametersVersion': setk, # (12.2)
    'LookParametersProcessVersion': setk, # (11.0)
    'LookParametersConvertToGrayscale': setk, # (False)
    'LookParametersCameraProfile': setk, # (Adobe Standard)
    'LookParametersLookTable': setk, # (E1095149FDB39D7A057BAB208837E2E1)
    'LookParametersToneCurvePV2012': setk, # (['0, 0', '22, 16', '40, 35', '127, 127', '224, 230', '240, 246', '255, 255'])
    'LookParametersToneCurvePV2012Red': setk, # (['0, 0', '255, 255'])
    'LookParametersToneCurvePV2012Green': setk, # (['0, 0', '255, 255'])
    'LookParametersToneCurvePV2012Blue': setk, # (['0, 0', '255, 255'])
    'ProfileCMMType': setk, # (ADBE)
    'ProfileVersion': setk, # (2.1.0)
    'ProfileClass': setk, # (Display Device Profile)
    'ColorSpaceData': setk, # (RGB )
    'ProfileConnectionSpace': setk, # (XYZ )
    'ProfileDateTime': setk, # (1999:06:03 00:00:00)
    'ProfileFileSignature': setk, # (acsp)
    'PrimaryPlatform': setk, # (Apple Computer Inc.)
    'CMMFlags': setk, # (Not Embedded, Independent)
    'DeviceManufacturer': setk, # (none)
    'DeviceModel': setk, # ()
    'DeviceAttributes': setk, # (Reflective, Glossy, Positive, Color)
    'RenderingIntent': setk, # (Perceptual)
    'ConnectionSpaceIlluminant': setk, # (0.9642 1 0.82491)
    'ProfileCreator': setk, # (ADBE)
    'ProfileID': setk, # (0)
    'ProfileCopyright': setk, # (Copyright 1999 Adobe Systems Incorporated)
    'ProfileDescription': setk, # (Adobe RGB (1998))
    'MediaWhitePoint': setk, # (0.95045 1 1.08905)
    'MediaBlackPoint': setk, # (0 0 0)
    'RedTRC': setk, # ((Binary data 14 bytes, use -b option to extract))
    'GreenTRC': setk, # ((Binary data 14 bytes, use -b option to extract))
    'BlueTRC': setk, # ((Binary data 14 bytes, use -b option to extract))
    'RedMatrixColumn': setk, # (0.60974 0.31111 0.01947)
    'GreenMatrixColumn': setk, # (0.20528 0.62567 0.06087)
    'BlueMatrixColumn': setk, # (0.14919 0.06322 0.74457)
    'DCTEncodeVersion': setk, # (100)
    'APP14Flags0': setk, # ((none))
    'APP14Flags1': setk, # ((none))
    'ColorTransform': setk, # (YCbCr)
    'DateTimeCreated': setk, # (2020:03:16 13:31:07)
'''


MISSED_TAG = {}

def read_tags(props):
    for t in props:
        if IGNORE_TAGS.__contains__(t):
            continue
        if t == '':
            continue
        tag_string = props[t]
        handler = EXIFHandler.get(t, None)
        if not handler:
            # print("Didn't parse tag {} ({})".format(t, tag_string))
            MISSED_TAG[t] = tag_string
            continue
        # print('{}:'.format(t))
        handler(tag_string)

def read_desc():
    global EQUIV_FOCAL_LEN, ORIG_FOCAL_LENGTH
    if not DESC.get('camera'):
        print("Unknown camera")
    else:
        if DESC['camera'].brand == Vendor.lumix:
            add_keys(['Leica','Lumix','Leicasonic','Panaleica'])
        elif DESC['camera'].brand == Vendor.fuji:
            add_keys(['Fuji','Fujifilm','Fuji X',('Fujifilm '+DESC['camera'])]);
            if not KNOWN_LENS:
              aLens = ADAPTED_LENSES.get(ORIG_FOCAL_LENGTH)
              if (aLens):
                add_keys(INFO,aLens.info)
                DESC.min_aperture = aLens.min_aperture
        elif DESC['camera'].brand == 'Scanned': # no actual camera
            add_keys(['film','scanned'])
    if EQUIV_FOCAL_LEN <= 0:
        EQUIV_FOCAL_LEN = ORIG_FOCAL_LENGTH * DESC['multiplier'] # might still be zero....
        EQUIV_FOCAL_LEN = math.floor(EQUIV_FOCAL_LEN + 0.49)
    else:
        fl_temp = math.floor(ORIG_FOCAL_LENGTH+0.49)
        setk('{}mm_orig'.format(fls))
    if EQUIV_FOCAL_LEN > 0:
        if EQUIV_FOCAL_LEN < 27:
            setk('Ultra Wide')
        elif EQUIV_FOCAL_LEN <= 35:
            setk('Wide Angle')
        elif EQUIV_FOCAL_LEN >= 110:
            setk('Telephoto')
        elif EQUIV_FOCAL_LEN >= 85:
            setk('Portrait Lens')
        if DESC['multiplier'] != 1.0:
            # setk('{}mm'.format(EQUIV_FOCAL_LEN))
            setk('{}mm_equiv'.format(EQUIV_FOCAL_LEN))

def all_mine(filename):
    props = get_properties(filename)
    if props is None:
        return
    # get name without path or extension
    basename = os.path.splitext(os.path.split(filename)[-1])[0]
    jobname = re.sub(r'(_[A-Z0-9]{4}\d{4}.*)', '', basename)
    if jobname == '':
        jobname = 'Unknown'
    else:
        jobname = re.sub(r'[A-Za-z0-9]+_', '', jobname)
    # print('Job: {} ({})'.format(jobname, basename))
    add_keys(Person.commonTags)
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

# image_filename = '/home/kevinbjorke/pix/tester.jpg'

image_filename = '/home/kevinbjorke/pix/kbImport/Pix/2020/2020-04-Apr/2020_04_23_Hum/bjorke_Hum_DSCF4589.JPG'
image_filename = '/home/kevinbjorke/pix/kbImport/Pix/2020/2020-04-Apr/2020_04_23_Hum/bjorke_Hum_DSCF4589.RAF'
image_filename = '/Users/kevinbjorke/Pictures/kbImport/Pix/2020/2020-01-Jan/2020_01_04_Putnam/bjorke_Putnam_DSCF2277.JPG'
image_filename = '/Users/kevinbjorke/Google Drive/kbImport/Pix/2020/Work2020/pix2020/bjorke_Green_KBXF7882.jpg'
image_filename = '/home/kevinbjorke/pix/kbImport/Pix/2020/2020-06-Jun/2020_06_13_XE/bjorke_XE_ESCF4060.JPG'
# TODO(kevin): get name from sys.argv

all_mine(image_filename)

print('\n{}'.format(list(KEYWORDS.keys())))
print('\n{}'.format(list(DESC.keys())))
print("Focal Length {}, original {}, mult {}".format(EQUIV_FOCAL_LEN, ORIG_FOCAL_LENGTH, DESC['multiplier']))
# print('\n{}'.format(list(INFO.keys())))

WRITE_MISSED_TAGS = True

if WRITE_MISSED_TAGS:
    if len(list(MISSED_TAG.keys())) > 0:
        print('\nmissed:')
        for t in MISSED_TAG:
            print("    '{}': setk, # ({})".format(t, MISSED_TAG[t]))