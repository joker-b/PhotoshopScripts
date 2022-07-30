from PIL import Image, ImageDraw, ImageFont
import argparse
import sys
import os
import re

picName = sys.argv[1]

# pic = Image.open('bjorke_Grey__XPK1607.jpg')
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

