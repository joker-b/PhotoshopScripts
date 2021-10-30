# Photo(shop) Scripts

These are scripts I've found useful for photo applications.

===========

## SkinToner

SkinToner lets you quickly adjust skin tones in a photograph. Just select an area of middle-toned skin in your photo (avoiding reflective highlights if you can!) and then run SkinToner.

SkinToner will add a Curves layer to your document, tuned so that the clors in the area(s) you've selected have a more natural skin tone hue.

Since the adjustments are layer-based, they're non-destructive ad you can subsequently adjust for spacal cases such as multicolored lighting or washed-out original photography.

## ChartThrob

ChartThrob now has its own repo!

See the ChartThrob home page http://www.botzilla.com/gearhead/2006/10/24/ChartThrob-A-Tool-for-Printing-Digital-Negatives.html for more info.

The ChartThrob repo is https://github.com/joker-b/ChartThrob

The version found here tracks that one, but branches and ongoing development are over there.

## AllMine.jsx

A script to quickly write data into a document's "File-Info," marking Photoshop images with common (for me) tags and copyright notifications.

To personalize, just alter the fields in the "Person" object, right at the top of the code block.

This script can be used alongside the 'kbImport' file-organization tool: https://github.com/joker-b/kbImport

### A note on Javascript for Photoshop

You might wonder why the code here uses "old" JS -- `.prototype` classes and such. It's to maintain compatability wt versions of Photoshop going as far back as CS2!
