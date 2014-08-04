function getFilepath(datum) {
    var sourceName = datum.Metadata.SourceName;
    return (sourceName == undefined ? '<no source name>' : sourceName) + datum.Path;
}

function getInfo(datum, linebreak) {
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

// The following functions are useful for the tree for selecting streams

/* Converts a list of stream objects into a tree (i.e. a nested object
structure that will work with jsTree.) */
function listToTree(streamList) {
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
                    childNode.id = streamObj.uuid;
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
function getContextMenu(node, callback) {
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
function selectNode(self, tree, select, node) { // unfortunately there's no simple way to differentiate between undetermined and unselected nodes
    if (node.data.streamdata == undefined) {
        for (var i = 0; i < node.children.length; i++) {
            selectNode(self, tree, select, tree.get_node(node.children[i]));
        }
    } else if (node.data.selected != select) {
        node.data.selected = select;
        s3ui.toggleLegend(self, select, node.data.streamdata, false);
    }
}

s3ui.getFilepath = getFilepath;
s3ui.getInfo = getInfo;
s3ui.getURL = getURL;
s3ui.makeMenuMaker = makeMenuMaker;
s3ui.binSearch = binSearch;
s3ui.nanosToUnit = nanosToUnit;
s3ui.listToTree = listToTree;
s3ui.getContextMenu = getContextMenu;
s3ui.selectNode = selectNode;
