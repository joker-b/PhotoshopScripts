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
      // now, delete average layer
      // and remove selection
      // showAlert('Color '+origTone+' maps to '+skinTone);
      await create_new_curves_layer("SkinTonerX");
      await set_skin_adjustments(origTone, skinTone);
      showAlert("curves ready");
      // restore selection?
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

async function create_new_curves_layer(layerName)
{
  const batchPlay = require("photoshop").action.batchPlay;

  const result = await batchPlay(
  [
     {
        "_obj": "make",
        "_target": [
           {
              "_ref": "adjustmentLayer"
           }
        ],
        "using": {
           "_obj": "adjustmentLayer",
           "type": {
              "_obj": "curves",
              "presetKind": {
                 "_enum": "presetKindType",
                 "_value": "presetKindDefault"
              }
           }
        },
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

async function set_skin_adjustments(OldColor, NewColor) {
  const batchPlay = require("photoshop").action.batchPlay;

  const result = await batchPlay(
  [
    {
        "_obj": "set",
        "_target": [
          {
              "_ref": "adjustmentLayer",
              "_enum": "ordinal",
              "_value": "targetEnum"
          }
        ],
        "to": {
          "_obj": "curves",
          "presetKind": {
              "_enum": "presetKindType",
              "_value": "presetKindCustom"
          },
          "adjustment": [
              {
                "_obj": "curvesAdjustment",
                "channel": {
                    "_ref": "channel",
                    "_enum": "channel",
                    "_value": "red"
                },
                "curve": [
                    {
                      "_obj": "paint",
                      "horizontal": 0,
                      "vertical": 0
                    },
                    {
                      "_obj": "paint",
                      "horizontal": OldColor[0],
                      "vertical": NewColor[0]
                    },
                    {
                      "_obj": "paint",
                      "horizontal": 255,
                      "vertical": 255
                    }
                ]
              },
              {
                "_obj": "curvesAdjustment",
                "channel": {
                    "_ref": "channel",
                    "_enum": "channel",
                    "_value": "green"
                },
                "curve": [
                    {
                      "_obj": "paint",
                      "horizontal": 0,
                      "vertical": 0
                    },
                    {
                      "_obj": "paint",
                      "horizontal": OldColor[1],
                      "vertical": NewColor[1]
                    },
                    {
                      "_obj": "paint",
                      "horizontal": 255,
                      "vertical": 255
                    }
                ]
              },
              {
                "_obj": "curvesAdjustment",
                "channel": {
                    "_ref": "channel",
                    "_enum": "channel",
                    "_value": "blue"
                },
                "curve": [
                    {
                      "_obj": "paint",
                      "horizontal": 0,
                      "vertical": 0
                    },
                    {
                      "_obj": "paint",
                      "horizontal": OldColor[2],
                      "vertical": NewColor[2]
                    },
                    {
                      "_obj": "paint",
                      "horizontal": 255,
                      "vertical": 255
                    }
                ]
              }
          ]
        },
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

/// eof
