// outline:
// search for selection in current doc
//      if none: display help and halt
// Extract proposed skin color
// determine possible motions in CMYK space
// Ask user for their preference
// write color adjustment layer. done.

const { entrypoints } = require("uxp");
// Set up entry points -- this defines the handler for menu items
// If this plugin had a panel, we would define flyout menu items here
entrypoints.setup({
  commands: {
    skintoner: () => skinToner()
    // if we had other menu items, they would go here and in the manifest.json file.
  }
});

// globals are almost bad

async function showAlert(message) {
  const app = require('photoshop').app;
  await app.showAlert(message);
}



async function skinToner() {
  // showAlert("here we go");
  try {
    const app = require("photoshop").app;
    if (app.documents.length == 0) {
      showAlert("Please open at least one document.");
      return;
    }
    if ( ! await isRGB() ) {
      showAlert('Document should be in RGBColor mode');
      return;
    }
    // next check selection
    try { var selB = await getSelectionBounds(); }
    catch(e) {
      showAlert('Select a skin area, then run the plugin again');
      return;
    }
    
    // next, check that the active layer is an "artlayer"
    const activeDoc = app.activeDocument;
    const origLayer = activeDoc.activeLayers[0];
    if (!((origLayer.kind == 1)||(origLayer.kind == 12))) {
      showAlert("Please select a pixel-based layer, & try again");
      return;
    }
    var workLayer, origTone, skinTone;
    try {
      workLayer = await origLayer.duplicate();
    // activelayer will now be the workLayer
      await applyAverageToSelected();
      origTone = await fetchAveragedColorViaHistogram();
      skinTone = adjust_skintone(origTone);
      showAlert('Color '+origTone+' maps to '+skinTone);
    }
    catch(e) {
      showAlert("oops "+e);
      return;
    }

    var nChans = getChannelCount();
    /* // ORIGINAL MAIN FUNCTION 
    var origChannels = [];
    for (var i=0; i<3; i+=1) { // some hand-waving on image mode here....
        origChannels[i] = app.activeDocument.channels[i];
    }
    var savedSelection = app.activeDocument.channels.add();
    sel.store(savedSelection);
    app.activeDocument.activeChannels = origChannels;
    */

    //var origTone = getColorFromAveragedSelection(app.activeDocument);
    //var skinTone = adjust_skin(origTone);
    
    /*
    app.activeDocument.activeLayer = origLayer;
    workLayer.remove();
    sel.deselect();
    map_color_via_curves_layer(origTone, skinTone, "SkinToner");
    sel.load(savedSelection);
    savedSelection.remove();

    // END OF ORIGINAL MAIN FUNCTION
    */

    //

    //showAlert("outta here");
    return;

    const layerNames = getLayerNames(activeDoc);
    if (layerNames) {
      await writeLayersToDisk(activeDoc.title, layerNames);
    }
    else {
      showAlert("Could not get any layer names.");
    }
  }
  catch(err) {
    showAlert(`Error occurred getting layer names: ${err.message}`);
  }
}

function getLayerNames(activeDoc) {
  // returns the name of every layer in the active document.
    const allLayers = activeDoc.layers;
    const allLayerNames = allLayers.map(layer => layer.name);
    const sortedNames = allLayerNames.sort((a, b) => a.toUpperCase() < b.toUpperCase() ? -1 : a.toUpperCase() > b.toUpperCase() ? 1 : 0);
    return sortedNames;
}

async function writeLayersToDisk(activeDocName, layerNames) {
  const fs = require("uxp").storage.localFileSystem;
  const file = await fs.getFileForSaving("layer names.txt", { types: [ "txt" ]});
  if (!file) {
    // file picker was cancelled
    return;
  }
  const result = await file.write(`Layers for document ${activeDocName}\n\n${layerNames.join('\n')}`);
}



//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////

async function applyAverageToSelected() {
  const batchPlay = require("photoshop").action.batchPlay;
  const result = await batchPlay(
  [
     {
        "_obj": "$Avrg",
        "_isCommand": true,
        "_options": {
           "dialogOptions": "dontDisplay"
        }
     }
  ],{
     "synchronousExecution": false,
     "modalBehavior": "fail"
  });
}

function getChannelCount() {
  const batchPlay = require("photoshop").action.batchPlay;
  try {
    const result = batchPlay(
    [
      {
          "_obj": "get",
          "_target": [
            {
                "_property": "numberOfChannels"
            },
            {
                "_ref": "document",
                "_enum": "ordinal",
                "_value": "targetEnum"
            }
          ],
          "_options": {
            "dialogOptions": "dontDisplay"
          }
      }
    ],{
      "synchronousExecution": true,
      "modalBehavior": "fail"
    });
    return result[0].numberOfChannels;
  }
  catch(e) {
    return 0;
  }
  return 0;
}

async function isRGB() {
  try {
    const result = await require("photoshop").action.batchPlay(
    [
      {
        "_obj": "get",
        "_target": [
          {
              "_property": "mode"
          },
          {
              "_ref": "document",
              "_enum": "ordinal",
              "_value": "targetEnum"
              //"_id": idDoc
          }
        ],
        "_options": {
          "dialogOptions": "dontDisplay"
        }
      }
    ],{
      "synchronousExecution": false,
      "modalBehavior": "fail"
    });
  } catch(e) {
    return false;
  }
  return true;
}

async function getSelectionBounds(){
  const app = require("photoshop").app;

  const idDoc = await app.activeDocument._id;
  
  const result = await require("photoshop").action.batchPlay(
  [
     {
    "_obj": "get",
    "_target": [
       {
          "_property": "selection"
       },
       {
          "_ref": "document",
          "_id": idDoc
       }
    ],
    "_options": {
       "dialogOptions": "dontDisplay"
    }
     }
  ],{
     "synchronousExecution": false,
     "modalBehavior": "fail"
  });
  const left = result[0].selection.left._value;
  const top = result[0].selection.top._value; 
  const right = result[0].selection.right._value; 
  const bottom = result[0].selection.bottom._value;  
  
  return [left,top,right,bottom];    
}

async function fetchAveragedColorViaHistogram() {
  const app = require("photoshop").app;
  const batchPlay = require("photoshop").action.batchPlay;
  const idDoc = await app.activeDocument._id;

  const result = await batchPlay(
  [
    {
      "_obj": "get",
      "_target": [
         {
            "_property": "histogram"
         },
         {
            "_enum": "channel",
            "_ref": "channel",
            "_value": "red",
         },
         {
            "_ref": "document",
            "_id": idDoc
         }
      ],
      "_options": {
         "dialogOptions": "dontDisplay"
      }
    },
    {
        "_obj": "get",
        "_target": [
          {
              "_property": "histogram"
          },
          {
              "_enum": "channel",
              "_ref": "channel",
              "_value": "green",
          },
          {
              "_ref": "document",
              "_id": idDoc
          }
        ],
        "_options": {
          "dialogOptions": "dontDisplay"
        }
    },
    {
      "_obj": "get",
      "_target": [
        {
            "_property": "histogram"
        },
        {
            "_enum": "channel",
            "_ref": "channel",
            "_value": "blue",
        },
        {
            "_ref": "document",
            "_id": idDoc
        }
      ],
      "_options": {
        "dialogOptions": "dontDisplay"
      }
    }
  ],{
     "synchronousExecution": false,
     "modalBehavior": "fail"
  });
  function findPV(h) {
    for (var i = 0; i <= 255; i++ ) {
        if (h[i]) { return i; }
    }
    return 0;
  }
  var pColour = [0,0,0];
  pColour[0] = findPV(result[0].histogram);
  pColour[1] = findPV(result[1].histogram);
  pColour[2] = findPV(result[2].histogram);
  // doc.selection.deselect(); // or, even better, undo
  return pColour;
}

// variant of https://www.standardabweichung.de/code/javascript/cmyk-rgb-conversion-javascript

var rgb2cmyk = function(rgb, normalized){
  var c = 1 - (rgb[0] / 255);
  var m = 1 - (rgb[1] / 255);
  var y = 1 - (rgb[2] / 255);
  var k = Math.min(c, Math.min(m, y));
  
  c = (c - k) / (1 - k);
  m = (m - k) / (1 - k);
  y = (y - k) / (1 - k);
  
  if(!normalized){
      c = Math.round(c * 10000) / 100;
      m = Math.round(m * 10000) / 100;
      y = Math.round(y * 10000) / 100;
      k = Math.round(k * 10000) / 100;
  }
  
  c = isNaN(c) ? 0 : c;
  m = isNaN(m) ? 0 : m;
  y = isNaN(y) ? 0 : y;
  k = isNaN(k) ? 0 : k;
  
  return [c, m, y, k];
};

var cmyk2rgb = function(c, m, y, k, normalized){
  c = (c / 100);
  m = (m / 100);
  y = (y / 100);
  k = (k / 100);
  
  c = c * (1 - k) + k;
  m = m * (1 - k) + k;
  y = y * (1 - k) + k;
  
  var r = 1 - c;
  var g = 1 - m;
  var b = 1 - y;
  
  if(!normalized){
      r = Math.round(255 * r);
      g = Math.round(255 * g);
      b = Math.round(255 * b);
  }
  
  return [r, g, b];
};

function adjust_skintone(C) // C is an array for 24-bit rgb
{
  if (C[0]+C[1]+C[3] < 5) {
    return C; // basically: it's black
  }
  // desired: m=2*c; y=1.25*m;
  var skc, skm, sky;
  var cmyk = rgb2cmyk(C, false); //  [C.cmyk.cyan,C.cmyk.magenta,C.cmyk.yellow,C.cmyk.black];
  var cyan, magenta, yellow, black;
  if (cmyk[0]*2.5 < 100) { // otherwise too bright to scale up
      skm = cmyk[0]*2;
      sky = skm*1.25;
      cyan = cmyk[0];
      magenta = skm;
      yellow = sky;
      black = cmyk[3];
  } else {
      skm = cmyk[2]/1.25;
      skc = skm/2;
      cyan = skc;
      magenta = skm;
      yellow = cmyk[2];
      black = cmyk[3];
  }
  var skinrgb = cmyk2rgb(cyan, magenta, yellow, black, false);
  return skinrgb;
}

/////////////////////////////////////////////////////////////////////////
//// OLD METHODS ///////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////


function adjust_skin(C) // C is a SolidColor
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