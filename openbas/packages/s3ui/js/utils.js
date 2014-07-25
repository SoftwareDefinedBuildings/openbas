
if (typeof smap3 == 'undefined') { smap3 = {}; }

smap3._utils.getFilepath = function (datum) {
    var sourceName = datum.Metadata.SourceName;
    return (sourceName == undefined ? '<no source name>' : sourceName) + datum.Path;
}

smap3._utils.getInfo = function (datum, linebreak) {
    if (linebreak == undefined) {
        linebreak = "<br>";
    }
    var base = 'UUID: ' + datum.uuid;
    for (prop in datum.Properties) {
        base += linebreak + prop + ': ' + datum.Properties[prop];
    }
    return base;
}

/** Normally I'd just send a GET request with AJAX, but instead
I'm using python to overcome cross domain restrictions */
smap3._utils.getURL = function (url, success_callback, type) {
    return $.post('http://localhost:7856', url, success_callback, type);
}


smap3._utils.makeMenuMaker = function () {
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
smap3._utils.binSearch = function (sortedLst, item, key, lowIndex, highIndex) {
    var currVal;
    var low = (lowIndex == undefined ? 0 : lowIndex);
    var high = (highIndex == undefined ? sortedLst.length - 1 : highIndex);
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

/* Same as binSearch, but used when the keys are floats. */
smap3._utils.binSearchFloat = function (sortedLst, item, key) {
    var currVal;
    var low = 0;
    var high = sortedLst.length - 1;
    var i;
    while (low < high) {
        i = Math.floor((low + high) / 2);
        currVal = key(sortedLst[i]);
        if (floatEq(currVal, item)) {
            return i;
        }
        else if (currVal < item) {
            low = i + 1;
        } else {
            high = i - 1;
        }
    }
    return low;
}

/* Returns true if FLOAT1 and FLOAT2 are equal to an acceptable precision. */
smap3._utils.floatEq = function (float1, float2) {
    return Math.abs(float1 - float2) <= 1e-15 * Math.max(Math.abs(float1), Math.abs(float2));
}

// The following functions are useful for the tree for selecting streams

/* Converts a list of stream objects into a tree (i.e. a nested object
structure that will work with jsTree.) */
smap3._utils.listToTree = function (streamList) {
    var rootNodes = []; // An array of root nodes
    var rootCache = {}; // A map of names of sources to the corresponding object
    
    var streamObj;
    var hierarchy;
    var currNodes;
    var currCache;
    var levelName;
    var childNode;
    for (var i = 0; i < streamList.length; i++) {
        streamObj = streamList[i];
        hierarchy = streamObj.Path.split("/");
        hierarchy[0] = streamObj.Metadata.SourceName;
        currNodes = rootNodes;
        currCache = rootCache;
        for (var j = 0; j < hierarchy.length; j++) {
            levelName = hierarchy[j];
            if (currCache.hasOwnProperty(levelName)) {
                currNodes = currCache[levelName].children;
                currCache = currCache[levelName].childCache;
            } else {
                childNode = {
                    text: levelName,
                    children: [],
                    childCache: {},
                    data: {} // the documentation says I can add additional properties directly, but that doesn't seem to work
                };
                currNodes.push(childNode);
                currCache[levelName] = childNode;
                currNodes = childNode.children;
                currCache = childNode.childCache;
                if (j == hierarchy.length - 1) {
                    childNode.icon = false;
                    childNode.data.selected = false;
                    childNode.data.streamdata = streamObj;
                }
            }
        }
    }
    
    return rootNodes;
}

/* Given a node, determines the options available to it. */
smap3._utils.getContextMenu = function (node, callback) {
    if (node.data.streamdata == undefined) {
        return {};
    } else {
        return {
            show: {
                label: "Show Info",
                action: function () {
                        alert(getInfo(node.data.streamdata, "\n"));
                    }
            }
        };
    }
}

/* Selects or deselects a node and all of its children, maintaing internal
   state ONLY (not outward appearance of being checked!) */
smap3._utils.selectNode = function (tree, select, node) { // unfortunately there's no simple way to differentiate between undetermined and unselected nodes
    if (node.data.streamdata == undefined) {
        for (var i = 0; i < node.children.length; i++) {
            selectNode(tree, select, tree.get_node(node.children[i]));
        }
    } else if (node.data.selected != select) {
        node.data.selected = select;
        toggleLegend(select, node.data.streamdata, false);
    }
}
