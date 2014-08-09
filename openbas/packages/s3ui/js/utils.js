function getFilepath(datum) {
    var sourceName = datum.Metadata.SourceName;
    return (sourceName == undefined ? '<no source name>' : sourceName) + datum.Path;
}

function getInfo (datum, linebreak) {
    if (linebreak == undefined) {
        linebreak = "<br>";
    }
    return getInfoHelper(datum, "", linebreak);
}

function getInfoHelper(datum, prefix, linebreak) {
    var toReturn = "";
    for (var prop in datum) {
        if (datum.hasOwnProperty(prop)) {
            if (typeof datum[prop] == "object") {
                toReturn += getInfoHelper(datum[prop], prefix + prop + "/", linebreak);
            } else {
                toReturn += prefix + prop + ": " + datum[prop] + linebreak;
            }
        }
    }
    return toReturn;
}

/** Normally I'd just send a GET request with AJAX, but instead
I'm using python to overcome cross domain restrictions */
function getURL(url, success_callback, type) {
    return $.post('http://localhost:7856', url, success_callback, type);
}


function makeMenuMaker() {
    var colors = ["black", "blue", "red", "green", "purple", "navy", "maroon", "fuchsia", "aqua", "gray", "olive", "lime", "teal", "silver", "yellow"];
    var colorIndex = 0;
    return function makeColorMenu () {
        var menu = document.createElement("select");
        var option;
        for (var i = 0; i < colors.length; i++) {
            option = document.createElement("option");
            option.value = colors[i];
            option.innerHTML = colors[i];
            menu.appendChild(option);
        }
        menu.selectedIndex = colorIndex;
        colorIndex = (colorIndex + 1) % colors.length;
        return menu;
    }
}

/* Performs binary search on SORTEDLST to find the index of item whose key is
   ITEM. KEY is a function that takes an element of the list as an argument and
   returns its key. If ITEM is not the key of any of the items in SORTEDLST,
   one of the indices closest to the index where it would be is returned. */
function binSearch(sortedLst, item, key) {
    var currVal;
    var low = 0;
    var high = sortedLst.length - 1;
    var i;
    while (low < high) {
        i = Math.floor((low + high) / 2);
        currVal = key(sortedLst[i]);
        if (currVal < item) {
            low = i + 1;
        } else if (currVal > item) {
            high = i - 1;
        } else {
            return i;
        }
    }
    return low;
}

function nanosToUnit(numValue) {
    var unit;
    if (numValue >= 86400000000000) {
        numValue /= 86400000000000;
        unit = ' d';
    } else if (numValue >= 3600000000000) {
        numValue /= 3600000000000;
        unit = ' h';
    } else if (numValue >= 60000000000) {
        numValue /= 60000000000;
        unit = ' m';
    } else if (numValue >= 1000000000) {
        numValue /= 1000000000;
        unit = ' s';
    } else if (numValue >= 1000000) {
        numValue /= 1000000;
        unit = ' ms';
    } else if (numValue >= 1000) {
        numValue /= 1000;
        unit = ' us';
    } else {
        unit = ' ns';
    }
    return numValue + unit;
}

s3ui.getFilepath = getFilepath;
s3ui.getInfo = getInfo;
s3ui.getURL = getURL;
s3ui.makeMenuMaker = makeMenuMaker;
s3ui.binSearch = binSearch;
s3ui.nanosToUnit = nanosToUnit;
