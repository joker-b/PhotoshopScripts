//
// Resize a photo to fit 4K video size 3840x2160 aka 2160p
//    and add an identifying label

/* global app, alert, Units, DocumentMode, CopyrightedType */

/* jshint ignore: start */
#target photoshop
app.bringToFront();
/* jshint ignore: end */

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
  
function main()
{
    'use strict';
    if (app.documents.length < 1) {    // stop if no document is opened.
        alert('Sorry, No Current Document');
        return;
    }
    // consts
    var vidW = 3840;
    var vidH = 2160;
    var black = new SolidColor();
    black.rgb.hexValue = '000000';
    var white = new SolidColor();
    white.rgb.hexValue = 'FFFFFF';
    // 
    app.backgroundColor = black;
    app.foregroundColor = white;
    //
    var origDoc = app.activeDocument;
    var title = noExtension(origDoc.name);
    //title = title.replace(/^bjorke_/,'');
    title = title.replace(/ copy$/,'');
    title = title.replace(/.*(....\d\d\d\d)$/,'$1');
    var doc = origDoc;
    // var doc = origDoc.duplicate(title);
    doc.flatten();
    var wScale = vidW / doc.width;
    var hScale = vidH / doc.height;
    var wider = doc.width > doc.height;
    if (wScale > hScale) {
        doc.resizeImage(doc.width * hScale, vidH, 72, ResampleMethod.BICUBIC);
        if (wider) {
            doc.resizeCanvas(vidW, vidH, AnchorPosition.MIDDLELEFT);
        } else {
            doc.resizeCanvas(vidW, vidH, AnchorPosition.MIDDLECENTER);
        }
    } else {
        doc.resizeImage(vidW, doc.height * wScale, 72, ResampleMethod.BICUBIC);
        doc.resizeCanvas(vidW, vidH, AnchorPosition.MIDDLECENTER);
    }
    var fontH  = vidH / 24;
    var labelLayer = doc.artLayers.add();
    labelLayer.kind = LayerKind.TEXT;
    labelLayer.textItem.contents = title;
    labelLayer.textItem.position = [vidW - fontH*0.7, fontH*2];
    labelLayer.textItem.size = fontH;
    labelLayer.textItem.color = white;
    labelLayer.textItem.font = 'ArialMT';
    labelLayer.textItem.justification = Justification.RIGHT;
    labelLayer.textItem.antiAliasMethod = AntiAlias.SMOOTH;
    labelLayer.textItem.BlendMode = BlendMode.NORMAL;
    labelLayer.opacity = 100;
    doc.flatten();
    //doc.saveAs();
}

main();

// eof
