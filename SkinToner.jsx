//
// Skin color adjustment
//

/* jshint ignore: start */
#target photoshop
app.bringToFront();
/* jshint ignore: end */

// outline:
// search for selection in current doc
//      if none: display help and halt
// Extract proposed skin color
// determine possible motions in CMYK space
// Ask user for their preference
// write color adjustment layer. done.

// global values /////////

var gVersion = 0.1;
var gDate = "20 Dec 2018";
var gTitle = "SkinToner V"+gVersion;

// on localized builds we pull the $$$/Strings from a .dat file, see documentation for more details
$.localize = true;
var strButtonCancel = localize("$$$/JavaScripts/ChartThrob/Cancel=Cancel");
var strButtonHelp = localize("$$$/JavaScripts/ChartThrob/Help=Help");


function help_dialog(errMsg)
{
    function st(par,txt) {
        var p = par.add('statictext');
        p.text = txt;
    }
    var dlg = new Window('dialog', gTitle+" Help");
    dlg.gtop = dlg.add('group');
        dlg.gtop.orientation = "column";
        dlg.gtop.spacing = 2;
        st(dlg.gtop,"SkinToner is a simple tool for adjusting skin tones,");
        st(dlg.gtop,"using a classic color rule that works");
        st(dlg.gtop,"regardless of light or dark complexions.");
    if (errMsg != undefined) {
        dlg.ep = dlg.add('panel');
        dlg.ep.orientation = "column";
        dlg.ep.alignChildren = "center";
        dlg.ep.text = "CAN'T CONTINUE";
        dlg.ep.spacing = 3;
        dlg.ep.margins = 20;
        st(dlg.ep,errMsg);
    }
    dlg.grp = dlg.add('panel');
        dlg.grp.orientation = "column";
        dlg.grp.alignChildren = "left";
        dlg.grp.text = "Steps:";
        dlg.grp.spacing = 3;
        dlg.grp.margins = 20;
        st(dlg.grp,"1. Load your RGB photo.");
        st(dlg.grp,"2. Select some area(s) of skin tone.");
        st(dlg.grp,"3. Run SkinToner.");
        st(dlg.grp,"4. Enjoy your corrected photo.");
    dlg.p2 = dlg.add('group');
        dlg.p2.orientation = "column";
        dlg.p2.alignChildren = "center";
        dlg.p2.spacing = 2;
        dlg.p2.margin = 20;
        st(dlg.p2,"Kevin Bjorke, http://www.botzilla.com/");
        st(dlg.p2,(gTitle+", "+gDate));

//
    var okayBtn = dlg.add('button');
    okayBtn.text = "Done";
    okayBtn.size = [100, 30];
    dlg.defaultElement = okayBtn;
    with (dlg) {
        okayBtn.onClick = function () {this.parent.close(1); }
    }
    dlg.center();
    var result = dlg.show();
}

var getColorFromAveragedSelection = function(doc) {
    function findPV(h) {
        for (var i = 0; i <= 255; i++ ) {
            if (h[i]) { return i; }
        }
        return 0;
    }
    var pColour = new SolidColor();
    pColour.rgb.red   = findPV(doc.channels[0].histogram);
    pColour.rgb.green = findPV(doc.channels[1].histogram);
    pColour.rgb.blue  = findPV(doc.channels[2].histogram);
    doc.selection.deselect(); // or, even better, undo
    return pColour;
};

function adjust_skin(C) // origTone is a SolidColor
{
    // desired: m=2*c; y=1.25*m;
    var skc, skm, sky;
    var cmyk = [C.cmyk.cyan,C.cmyk.magenta,C.cmyk.yellow,C.cmyk.black];
    var L = C.gray.gray;
    if (L==0) {
        return C;
    }
    var skin = new SolidColor();
    if (cmyk[0]*2.5 < 100) { // otherwise too bright to scale up
        skm = cmyk[0]*2;
        sky = skm*1.25;
        skin.cmyk.cyan = C.cmyk.cyan;
        skin.cmyk.magenta = skm;
        skin.cmyk.yellow = sky;
        skin.cmyk.black = C.cmyk.black;
    } else {
        skm = cmyk[2]/1.25;
        skc = skm/2;
        skin.cmyk.cyan = skc;
        skin.cmyk.magenta = skm;
        skin.cmyk.yellow = C.cmyk.yellow;
        skin.cmyk.black = C.cmyk.black;
    }
    return skin;
}

////

function set_single_curve_layer_channel(ChannelIndex,HorzValue,VertValue)
{
    // we will set a channel list for the already-active curves layer
    // we only know three index values: 0 1 2 for R G B
    // values are in the range 0-255
    var knownChannels = ['Rd  ','Grn ','Bl  '];
    var channelID = knownChannels[ChannelIndex];
    var idsetd = charIDToTypeID( "setd" );
    var desc398 = new ActionDescriptor();
    var idnull = charIDToTypeID( "null" );
        var ref163 = new ActionReference();
        var idAdjL = charIDToTypeID( "AdjL" );
        var idOrdn = charIDToTypeID( "Ordn" );
        var idTrgt = charIDToTypeID( "Trgt" );
        ref163.putEnumerated( idAdjL, idOrdn, idTrgt );
    desc398.putReference( idnull, ref163 );
    var idT = charIDToTypeID( "T   " );
        var desc399 = new ActionDescriptor();
        var idAdjs = charIDToTypeID( "Adjs" );
            var list121 = new ActionList();
                var desc400 = new ActionDescriptor();
                var idChnl = charIDToTypeID( "Chnl" );
                    var ref164 = new ActionReference();
                    var idChnl = charIDToTypeID( "Chnl" );
                    var idChnl = charIDToTypeID( "Chnl" );
                    var idBl = charIDToTypeID( channelID );
                    ref164.putEnumerated( idChnl, idChnl, idBl );
                desc400.putReference( idChnl, ref164 );
                var idCrv = charIDToTypeID( "Crv " );
                    var list122 = new ActionList();
                        var desc401 = new ActionDescriptor();
                        var idHrzn = charIDToTypeID( "Hrzn" );
                        desc401.putDouble( idHrzn, 0.000000 );
                        var idVrtc = charIDToTypeID( "Vrtc" );
                        desc401.putDouble( idVrtc, 0.000000 );
                    var idPnt = charIDToTypeID( "Pnt " );
                    list122.putObject( idPnt, desc401 );
                        var desc402 = new ActionDescriptor();
                        var idHrzn = charIDToTypeID( "Hrzn" );
                        desc402.putDouble( idHrzn, HorzValue );
                        var idVrtc = charIDToTypeID( "Vrtc" );
                        desc402.putDouble( idVrtc, VertValue );
                    var idPnt = charIDToTypeID( "Pnt " );
                    list122.putObject( idPnt, desc402 );
                        var desc403 = new ActionDescriptor();
                        var idHrzn = charIDToTypeID( "Hrzn" );
                        desc403.putDouble( idHrzn, 255.000000 );
                        var idVrtc = charIDToTypeID( "Vrtc" );
                        desc403.putDouble( idVrtc, 255.000000 );
                    var idPnt = charIDToTypeID( "Pnt " );
                    list122.putObject( idPnt, desc403 );
                desc400.putList( idCrv, list122 );
            var idCrvA = charIDToTypeID( "CrvA" );
            list121.putObject( idCrvA, desc400 );
        desc399.putList( idAdjs, list121 );
    var idCrvs = charIDToTypeID( "Crvs" );
    desc398.putObject( idT, idCrvs, desc399 );
    executeAction( idsetd, desc398, DialogModes.NO );
}

function map_color_curves_to_match_color(OldColor, NewColor)
{
    // both arguments are SolidColors
    // curves layer is already active
    set_single_curve_layer_channel(0, OldColor.rgb.red, NewColor.rgb.red);
    set_single_curve_layer_channel(1, OldColor.rgb.green, NewColor.rgb.green);
    set_single_curve_layer_channel(2, OldColor.rgb.blue, NewColor.rgb.blue);
}


function create_rgb_curves_layer(LayerName) {
    // create curves layer (simpler?)
    var idMk = charIDToTypeID( "Mk  " );
        var desc380 = new ActionDescriptor();
        var idnull = charIDToTypeID( "null" );
            var ref156 = new ActionReference();
            var idAdjL = charIDToTypeID( "AdjL" );
            ref156.putClass( idAdjL );
        desc380.putReference( idnull, ref156 );
        var idUsng = charIDToTypeID( "Usng" );
            var desc381 = new ActionDescriptor();
            var idType = charIDToTypeID( "Type" );
                var desc382 = new ActionDescriptor();
                var idpresetKind = stringIDToTypeID( "presetKind" );
                var idpresetKindType = stringIDToTypeID( "presetKindType" );
                var idpresetKindDefault = stringIDToTypeID( "presetKindDefault" );
                desc382.putEnumerated( idpresetKind, idpresetKindType, idpresetKindDefault );
            var idCrvs = charIDToTypeID( "Crvs" );
            desc381.putObject( idType, idCrvs, desc382 );
        var idAdjL = charIDToTypeID( "AdjL" );
        desc380.putObject( idUsng, idAdjL, desc381 );
    executeAction( idMk, desc380, DialogModes.NO );
    // =======================================================
    var idslct = charIDToTypeID( "slct" );
        var desc383 = new ActionDescriptor();
        var idnull = charIDToTypeID( "null" );
            var ref157 = new ActionReference();
            var idChnl = charIDToTypeID( "Chnl" );
            var idChnl = charIDToTypeID( "Chnl" );
            var idRGB = charIDToTypeID( "RGB " );
            ref157.putEnumerated( idChnl, idChnl, idRGB );
        desc383.putReference( idnull, ref157 );
        var idMkVs = charIDToTypeID( "MkVs" );
        desc383.putBoolean( idMkVs, false );
    executeAction( idslct, desc383, DialogModes.NO );
    app.activeDocument.activeLayer.name = LayerName;
    return  app.activeDocument.activeLayer;
}

function map_color_via_curves_layer(OldColor,NewColor,LayerName)
{
    var lName = LayerName ? LayerName : "groovy";
    var lyr = create_rgb_curves_layer(lName);
    map_color_curves_to_match_color(OldColor,NewColor);
}

////


function main() {
    if (app.documents.length < 1) {
        help_dialog();
        return;
    }
    if (app.activeDocument.mode != DocumentMode.RGB) {
        help_dialog("Your document must be RGB");
        return;        
    }
    var sel = app.activeDocument.selection;
    try {
        if (sel.bounds === undefined) {
            help_dialog("Empty selection,\nplease adjust");
            return;
        }
    } catch (err) {
        help_dialog();
        return;
    }
    if (app.activeDocument.activeLayer.typename != 'ArtLayer') {
        help_dialog("Select a drawing layer,\nnot a layer group.");
        return;
    }
    var origLayer = app.activeDocument.activeLayer;
    var workLayer = app.activeDocument.activeLayer.duplicate();
    app.activeDocument.activeLayer = workLayer;
    workLayer.applyAverage();
    var origChannels = [];
    for (var i=0; i<3; i+=1) { // some hand-waving on image mode here....
        origChannels[i] = app.activeDocument.channels[i];
    }
    var savedSelection = app.activeDocument.channels.add();
    sel.store(savedSelection);
    app.activeDocument.activeChannels = origChannels;
    var origTone = getColorFromAveragedSelection(app.activeDocument);
    var skinTone = adjust_skin(origTone);
    app.activeDocument.activeLayer = origLayer;
    workLayer.remove();
    sel.deselect();
    map_color_via_curves_layer(origTone, skinTone, "SkinToner");
    sel.load(savedSelection);
    savedSelection.remove();
}

main();