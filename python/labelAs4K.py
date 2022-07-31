from PIL import Image, ImageDraw, ImageFont
import argparse
import sys
import os
import re


parser = argparse.ArgumentParser()
parser.add_argument('filename', default=None, help='Origin Name')
parser.add_argument('-p', '--prefix', default='V4K', help='Result Prefix')
parser.add_argument('--debug', action='store_true', help='Test Some Parts of the Code')
parser.add_argument('--verbose', action='store_true', help='Verbose Output')
args = parser.parse_args()

def write_label(picName):
    pic = Image.open(picName)
    vidW, vidH = (3840, 2160)
    wScale = vidW / pic.width
    hScale = vidH / pic.height
    wider = (pic.width > pic.height)
    bgImage = Image.new( 'RGB', (vidW, vidH) )
    if wScale > hScale:
        w = int(pic.width * hScale)
        pic = pic.resize( (w, vidH) )
        if wider:
            # paste to the left
            bgImage.paste(pic, (0,0) )
        else:
            # paste center
            l = int(vidW/2 - w/2)
            bgImage.paste(pic, (l,0) )
    else:
        h = int(pic.height * wScale)
        pic = pic.resize( (vidW, h) )
        # paste center
        t = int(vidH/2 - h/2)
        bgImage.paste(pic, (0,t) )
    title = re.sub('.*([A-Z_]{4}\d{4})\..*','\\1',picName)
    fnt = ImageFont.truetype('/Library/Fonts/Arial Unicode.ttf', 64)
    draw = ImageDraw.Draw(bgImage)
    draw.text( (vidW-80,300), title, font=fnt, anchor='rs', fill=(255,255,255,255))
    bgImage.save("4K"+picName)

write_label(args.filename)
