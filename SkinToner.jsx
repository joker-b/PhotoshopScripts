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
		st(dlg.gtop,"using a classic CMYK color rule that works");
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
		st(dlg.grp,"1. Load your photo.");
		st(dlg.grp,"2. Select some area(s) of skin tone.");
		st(dlg.grp,"3. Run SkinToner.");
		st(dlg.grp,"4. Answer any questions from SkinToner.");
		st(dlg.grp,"5. Enjoy your corrected photo.");
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

getColorAt = function(doc, x, y) {
    function selectBounds(doc, b) {
			doc.selection.select([[ b[0], b[1] ],
	                           [ b[2], b[1] ],
	                           [ b[2], b[3] ],
	                           [ b[0], b[3] ]]);
    }
    function findPV(h) {
		for (var i = 0; i <= 255; i++ ) {
		    if (h[i]) { return i; }
		}
		return 0;
    }
    var onePix = new UnitValue(1,"px");
    selectBounds(doc, [x, y, x+onePix, y+onePix]);
    var pColour = new SolidColor();
    pColour.rgb.red   = findPV(doc.channels[0].histogram);
    pColour.rgb.green = findPV(doc.channels[1].histogram);
    pColour.rgb.blue  = findPV(doc.channels[2].histogram);
    doc.selection.deselect(); // or, even better, undo
    return pColour;
};

function main() {
	if (app.documents.length < 1) {
		help_dialog("Please open a photo document");
		return;
	}
	var sel = app.activeDocument.selection;
	try {
		if (sel.bounds === undefined) {
			help_dialog("Empty selection");
			return;
		}
	} catch (err) {
		help_dialog("Please select part of your photo");
		return;
	}
	if (app.activeDocument.activeLayer.typename != 'ArtLayer') {
		help_dialog("Select a drawing layer. not a group");
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
	var origTone; 
	if (sel.solid) {
		var mx = (sel.bounds[0] + sel.bounds[2])/2;
		var my = (sel.bounds[1] + sel.bounds[3])/2;
		origTone = getColorAt(app.activeDocument, mx, my);
	} else {
		alert('TODO: deal with complex selection shapes. Sorry');
		return;
	}
	var mfactor = origTone.cmyk.magenta / origTone.cmyk.cyan;
	var yfactor = origTone.cmyk.yellow / origTone.cmyk.cyan;
	var br = origTone.hsb.brightness;
	//alert('tone: '+origTone.cmyk.cyan+'C '+origTone.cmyk.magenta+'M '+origTone.cmyk.yellow+'Y');
	//alert('tone: '+mfactor+' / '+yfactor+'\nversus 2 / 2.5\n'+br+' brightness');
	// desired: m=2*c; y=1.25*m;
	app.activeDocument.activeLayer = origLayer;
	workLayer.remove();
	sel.deselect();
	var adjLayer = app.activeDocument.activeLayer.duplicate();
	adjLayer.name = origLayer.name+'_Adj';
	// TODO: apply curve adjustments CORRECTLY
	app.activeDocument.activeLayer = adjLayer;
	app.activeDocument.activeChannels = [origChannels[1]]; // green aka anti-magenta
	adjLayer.adjustCurves([[0,0],[128,130],[255,255]]);
	app.activeDocument.activeChannels = [origChannels[1]]; // blue aka anti-yellow
	adjLayer.adjustCurves([[0,0],[128,100],[255,255]]);
	app.activeDocument.activeChannels = origChannels;
	sel.load(savedSelection);
	savedSelection.remove();

	// now look for selection
	// then combined colors in selection in CMYK space
	// now determine potential moves to bring color to skintone
	// offer choices to user
	// if not cancelled, create an appropriate adjustment layer
}

main();