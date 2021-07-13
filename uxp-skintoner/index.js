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
    const activeDoc = app.activeDocument;
    if ( ! await isRGB() ) {
      showAlert('Document should be in RGBColor mode');
      return;
    }
    // next check selection

    showAlert("outta here");
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



////

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

  const idDoc=await app.activeDocument._id;
  
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