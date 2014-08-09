function init_streamtree(self) {
    self.idata.tagsURL = 'http://new.openbms.org/backend/api/query?';
    self.idata.streamTree = undefined;
    self.idata.rootNodes = undefined;; // Acts as a set of root nodes: maps name to id
    self.idata.leafNodes = undefined; // Acts as a set of leaf nodes that appear in the tree: maps full path to id
    self.idata.loadingRootNodes = undefined; // Acts as a set of root nodes that are loading (used to prevent duplicate requests)
    self.idata.pendingRequests = 0; // Keeps track of the number of requests for stream objects that are currently open
    self.idata.internallyIgnoreSelects = false;
    self.idata.initiallySelectedStreams = {}; // Maps the source name of a stream to an object that maps path to stream object, if it has not yet been found in the tree
    self.idata.mayHaveSelectedLeaves = undefined; // An array of IDs of root nodes whose children may be initially selected
    self.idata.numLeaves = undefined;
}

function updateStreamList(self) {
    self.idata.rootNodes = {};
    self.idata.leafNodes = {};
    self.idata.loadingRootNodes = {};
    self.idata.numLeaves = 0;
    self.idata.mayHaveSelectedLeaves = [];
    
    if (self.idata.streamTree != undefined) {
        // Remove everything from legend before destroying tree
        var roots = self.idata.streamTree.get_node("#").children;
        for (i = 0; i < roots.length; i++) {
            s3ui.selectNode(self, self.idata.streamTree, false, self.idata.streamTree.get_node(roots[i]));
        }
        self.idata.streamTree.destroy(true);
        s3ui.applySettings(self);
    }
    
    var streamTreeDiv = $(self.find("div.streamTree"));
    
    streamTreeDiv.on("loaded.jstree", function (event, data) {
            for (var i = self.idata.mayHaveSelectedLeaves.length - 1; i >= 0; i--) {
                streamTree.load_node(self.idata.mayHaveSelectedLeaves[i]);
            }
        });
    streamTreeDiv.on("select_node.jstree", function (event, data) {
            if (self.idata.internallyIgnoreSelects) {
                event.stopImmediatePropagation();
                return;
            }
            selectNode(self, streamTree, true, data.node);
            if (self.idata.pendingRequests == 0) {
                s3ui.applySettings(self);
            }
        });
    streamTreeDiv.on("deselect_node.jstree", function (event, data) {
            selectNode(self, streamTree, false, data.node);
            if (self.idata.pendingRequests == 0) {
                s3ui.applySettings(self);
            }
        });
    
    streamTreeDiv.jstree({
            core: {
                data: function (obj, callback) {
                        if (obj.id == "#") {
                            s3ui.getURL('SENDPOST ' + self.idata.tagsURL + ' select distinct Metadata/SourceName', function (data) {
                                    var sourceList = JSON.parse(data);
                                    var i;
                                    var rootID;
                                    for (i = 0; i < sourceList.length; i++) {
                                        rootID = "root_" + i;
                                        self.idata.rootNodes[sourceList[i]] = rootID;
                                        sourceList[i] = function (sourceName) {
                                                if (self.idata.initiallySelectedStreams.hasOwnProperty(sourceName)) {
                                                    self.idata.mayHaveSelectedLeaves.push(rootID);
                                                }
                                                return {
                                                        id: rootID,
                                                        text: sourceName,
                                                        data: {
                                                                toplevel: true,
                                                                children: function (callback) {
                                                                        s3ui.getURL('SENDPOST ' + self.idata.tagsURL + ' select distinct Path where Metadata/SourceName = "' + sourceName + '"', function (data) {
                                                                                callback.call(this, pathsToTree(self, sourceName, JSON.parse(data)));
                                                                            });
                                                                    },
                                                                child: false
                                                            },
                                                        children: true
                                                    };
                                            }(sourceList[i]);
                                    }
                                    callback(sourceList);
                                }, "text");
                        } else {
                            obj.data.children(callback);
                        }
                    }
            },
            contextmenu: {
                select_node: false,
                items: function (node, callback) { return getContextMenu(self, node, callback); },
                show_at_node: false
            },
            plugins: ["checkbox", "contextmenu", "sort"]
        });
    var streamTree = $.jstree.reference(streamTreeDiv);
    self.idata.streamTree = streamTree;
    
    /* I'm using a hack to intercept a "select_node.jstree" event
       before it occurs, in the case where the user cancels it before
       it is complete. */
    streamTree.old_select_node = streamTree.select_node;
    streamTree.select_node = function (nodes, suppress_event, prevent_open) {
            if (nodes.length == undefined) {
                nodes = [nodes];
            }
            var node;
            var streamCount;
            for (var i = 0; i < nodes.length; i++) {
                node = streamTree.get_node(nodes[i]);
                streamCount = countUnselectedStreams(streamTree, node);
                if (node.data.toplevel && node.children.length == 0) {
                    if (!self.idata.loadingRootNodes[node.id]) {
                        self.idata.loadingRootNodes[node.id] = true;
                        streamTree.load_node(node, function (node, status) {
                                self.idata.loadingRootNodes[node.id] = false;
                                if (status) {
                                    if (!streamTree.is_selected(node)) {
                                        streamTree.select_node(node, false);
                                    }
                                } else {
                                    alert("Could not load node contents (could not communicate with archiver)");
                                }
                            });
                    }
                } else if (streamCount <= 5 || confirm("About to select " + streamCount + " streams. Continue?")) {
                    streamTree.old_select_node(node, suppress_event, prevent_open);
                }
            }
        };
}

// The following functions are useful for the tree for selecting streams

/* Converts a list of paths into a tree (i.e. a nested object
   structure that will work with jsTree). Returns the nested tree structure
   and an object mapping uuid to node in a 2-element array.
   OFFSET is the number of base directories to ignore in the path. It defaults
   to 0. */
function pathsToTree(self, sourceName, streamList) {
    var rootNodes = []; // An array of root nodes
    var rootCache = {}; // A map of names of sources to the corresponding object
    
    var path;
    var hierarchy;
    var currNodes;
    var currCache;
    var levelName;
    var childNode;
    for (var i = 0; i < streamList.length; i++) {
        path = streamList[i];
        hierarchy = path.split("/");
        hierarchy.splice(0, 1);
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
                    data: { toplevel: false, child: false } // the documentation says I can add additional properties directly, but that doesn't seem to work
                };
                currNodes.push(childNode);
                currCache[levelName] = childNode;
                currNodes = childNode.children;
                currCache = childNode.childCache;
                if (j == hierarchy.length - 1) {
                    childNode.id = "leaf_" + self.idata.numLeaves++;
                    self.idata.leafNodes[sourceName + path] = childNode.id;
                    childNode.data.path = path;
                    childNode.icon = false;
                    childNode.data.selected = false;
                    childNode.data.sourceName = sourceName;
                    childNode.data.child = true;
                    var initiallySelectedStreams = self.idata.initiallySelectedStreams;
                    if (initiallySelectedStreams.hasOwnProperty(sourceName) && initiallySelectedStreams[sourceName].hasOwnProperty(path)) {
                        childNode.data.streamdata = initiallySelectedStreams[sourceName][path];
                        initiallySelectedStreams[sourceName].count--;
                        if (initiallySelectedStreams[sourceName].count == 0) {
                            delete initiallySelectedStreams[sourceName];
                        } else {
                            delete initiallySelectedStreams[sourceName][path];
                        }
                        childNode.data.selected = true;
                        childNode.state = { selected: true };
                    }
                }
            }
        }
    }
    
    return rootNodes;
}

/* Given a node, determines the options available to it. */
function getContextMenu(self, node, callback) {
    if (node.data.child) {
        return {
                showInfo: {
                        label: "Show Info",
                        action: function () {
                                if (node.data.streamdata == undefined) {
                                    s3ui.getURL('SENDPOST ' + self.idata.tagsURL + ' select * where Metadata/SourceName = "' + node.data.sourceName + '" and Path = "' + node.data.path + '"',
                                         function (data) {
                                             if (node.data.streamdata == undefined) {
                                                 data = JSON.parse(data)[0];
                                                 node.data.streamdata = data;
                                             }
                                             alert(s3ui.getInfo(node.data.streamdata, "\n"));
                                         });
                                } else {
                                    alert(s3ui.getInfo(node.data.streamdata, "\n"));
                                }
                            }
                    }
            };
    } else {
        return {
                select: {
                        label: "Select",
                        action: function () {
                                self.idata.streamTree.select_node(node);
                            }
                    },
                deselect: {
                        label: "Deselect",
                        action: function () {
                                self.idata.internallyIgnoreSelects = true;
                                self.idata.streamTree.old_select_node(node, true, true);
                                self.idata.internallyIgnoreSelects = false;
                                self.idata.streamTree.deselect_node(node);
                            }
                    }
            };
    }
}

/* Selects or deselects a node and all of its children, maintaing internal
   state ONLY (not outward appearance of being checked!). Returns true if a
   POST request was made for at least one stream object; otherwise returns
   false. */
function selectNode(self, tree, select, node) { // unfortunately there's no simple way to differentiate between undetermined and unselected nodes
    if (!node.data.child) {
        for (var i = 0; i < node.children.length; i++) {
            selectNode(self, tree, select, tree.get_node(node.children[i]));
        }
    } else if (node.data.selected != select) {
        node.data.selected = select;
        if (node.data.streamdata == undefined) {
            self.idata.pendingRequests += 1;
            s3ui.getURL('SENDPOST ' + self.idata.tagsURL + ' select * where Metadata/SourceName = "' + node.data.sourceName + '" and Path = "' + node.data.path + '"',
                function (data) {
                    self.idata.pendingRequests -= 1;
                    if (node.data.selected == select) { // the box may have been unchecked in the meantime
                        if (node.data.streamdata == undefined) { // it might have been loaded in the meantime
                            data = JSON.parse(data)[0];
                            node.data.streamdata = data;
                        }
                        s3ui.toggleLegend(self, select, node.data.streamdata, false);
                    }
                    if (self.idata.pendingRequests == 0) {
                        s3ui.applySettings(self);
                    }
                });
        } else {
            s3ui.toggleLegend(self, select, node.data.streamdata, false);
        }
    }
}

/* Counts the total number of unselected streams in a node. */
function countUnselectedStreams (tree, node) {
    if (node.data.child) {
        return node.data.selected ? 0 : 1;
    }
    var count = 0;
    for (var i = 0; i < node.children.length; i++) {
        count += countUnselectedStreams(tree, tree.get_node(node.children[i]));
    }
    return count;
}

s3ui.init_streamtree = init_streamtree;
s3ui.updateStreamList = updateStreamList;
s3ui.selectNode = selectNode;
