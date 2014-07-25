// Set up timezone-js
timezoneJS.timezone.zoneFileBasePath = 'tz';
timezoneJS.timezone.init();

var streamList = [];
var dateFormat = "%a %b %d, %Y %T";
var dateConverter = new AnyTime.Converter({format: dateFormat});
var makeColorMenu = makeMenuMaker();
var streamSettings = {}; // Stores the stream settings chosen in the legend (maps uuid to a setting object)
var selectedStreams = []; // Streams that have been selected and are displayed in the legend
var addedStreams;
var changedTimes;
var otherChange;
var automaticAxisUpdate = false; // True if axes will be updated without the need for an "Update Axes" button
var streamTree;

function updateStreamList() {
    $("span#streamLoading").html("Loading Streams...");
    getURL('http://archiver.upmu.cal-sdb.org/backend/api/tags', function (data) {
            streamList = eval(data);
            
            $("span#streamLoading").html("");
              
            if (streamTree != undefined) {
                // Remove everything from legend before destroying tree
                var roots = streamTree.get_node("#").children;
                for (var i = 0; i < roots.length; i++) {
                    selectNode(streamTree, false, streamTree.get_node(roots[i]));
                }
                streamTree.destroy(true);
                applySettings();
            }
            
            var streamTreeDiv = $("div#streamTree");
            streamTreeDiv.jstree({
                    core: {
                        data: listToTree(streamList)
                    },
                    contextmenu: {
                        select_node: false,
                        items: getContextMenu
                    },
                    plugins: ["checkbox", "contextmenu"]
                });
            streamTree = $.jstree.reference(streamTreeDiv);
            streamTreeDiv.on("select_node.jstree", function (event, data) {
                    selectNode(streamTree, true, data.node);
                    applySettings();
                });
            streamTreeDiv.on("deselect_node.jstree", function (event, data) {
                    selectNode(streamTree, false, data.node);
                    applySettings();
                });
        }, "text");
}

function showInfo (datum, button, parent) {
    var description = document.createElement("tr");
    description.appendChild(document.createElement("td"));
    description.appendChild(document.createElement("td"));
    description.lastChild.innerHTML = getInfo(datum);
    parent.parentNode.insertBefore(description, parent.nextSibling);
    button.innerHTML = 'Hide Details';
    button.onclick = function () { hideInfo(this, this.parentNode.parentNode); };
}

function hideInfo (button, parent) {
    parent.parentNode.removeChild(parent.nextSibling);
    button.innerHTML = 'Show Details';
    button.onclick = function () { showInfo(this.__data__, this, this.parentNode.parentNode); };
}

/* Adds or removes (depending on whether it is already present) a
stream to or from the legend. */
function toggleLegend (show, streamdata, update) {
    if (update == undefined) {
        update = true;
    }
    if (show) {
        selectedStreams.push(streamdata);
        var row = d3.select("tbody#legend")
          .append("tr")
            .datum(streamdata)
            .attr("id", function (d) { return "legend-" + d.uuid; });
        var colorMenu = row.append("td")
            .append(makeColorMenu)
            .attr("id", function (d) { return "color-" + d.uuid; })
          .node();
        colorMenu.onchange = function () {
                  var newColor = this[this.selectedIndex].value;
                  var streamGroup= $("g#series-" + streamdata.uuid);
                  streamGroup.attr("stroke", newColor);
                  streamGroup.attr("fill", newColor);
                  streamSettings[streamdata.uuid].color = newColor;
              };
        streamSettings[streamdata.uuid] = { color: colorMenu[colorMenu.selectedIndex].value, axisid: "y1" }; // axisid is changed
        var nameElem = row.append("td")
            .html(function (d) { return getFilepath(d); })
          .node();
        nameElem.onmouseover = function () { $("g#series-" + streamdata.uuid).attr({"stroke-width": 3, "fill-opacity": 0.5}); };
        nameElem.onmouseout = function () { $("g#series-" + streamdata.uuid).attr({"stroke-width": 1, "fill-opacity": 0.3}); };
        var selectElem = row.append("td")
          .append("select")
            .attr("class", "axis-select")
            .attr("id", "axis-select-" + streamdata.uuid);
        selectElem.selectAll("option")
          .data(yAxes)
          .enter()
          .append("option")
            .attr("class", function (d) { return "option-" + d.axisid; })
            .attr("value", function (d) { return d.axisid; })
            .html(function (d) { return d.axisname; });
        var selectNode = selectElem.node();
        var initIndex = guessYAxis(streamdata); // use a heuristic to get the initial selection
        if (initIndex == undefined) {
            initIndex = yAxes.length;
            addYAxis();
        }
        selectNode.selectedIndex = initIndex;
        selectNode.setAttribute("data-prevselect", selectNode[selectNode.selectedIndex].value);
        selectNode.onchange = function (event, suppressUpdate) {
                var newID = this[this.selectedIndex].value;
                changeAxis(streamdata, this.getAttribute("data-prevselect"), newID);
                this.setAttribute("data-prevselect", newID);
                if (suppressUpdate == undefined) {
                    applySettings();
                }
            };
        changeAxis(streamdata, null, selectNode[selectNode.selectedIndex].value);
        $("select#color-" + streamdata.uuid).simplecolorpicker({picker: true});
        if (update && oldData.hasOwnProperty(streamdata.uuid)) { // If data has already been loaded, go ahead and display it
            applySettings();
        } else {
            addedStreams = true;
            updatePlotMessage();
        }
    } else {
        var toRemove = document.getElementById("legend-" + streamdata.uuid);
        var selectElem = toRemove.lastChild.firstChild;
        var oldAxis = selectElem[selectElem.selectedIndex].value;
        changeAxis(streamdata, oldAxis, null);
        toRemove.parentNode.removeChild(toRemove);
        delete streamSettings[streamdata.uuid];
        for (var i = 0; i < selectedStreams.length; i++) {
            if (selectedStreams[i] == streamdata) {
                selectedStreams.splice(i, 1);
                break;
            }
        }
        if (update && oldData.hasOwnProperty(streamdata.uuid)) { // If the data hasn't been loaded, we don't have to do this
            applySettings(); // Make stream removal visible on the graph
        }
    }
}

function updatePlotMessage() {
    var message = "";
    if (automaticAxisUpdate) {
        if (addedStreams || changedTimes) {
            message = 'Click "Apply all Settings and Plot Data" to update the graph.';
        }
    } else {
        if (addedStreams || changedTimes || otherChange) {
            message = 'Click "Apply all Settings and Plot Data" to update the graph.';
        }
    }
    document.getElementById("plotLoading").innerHTML = message;
}

function getSelectedTimezone() {
    var timezoneSelect = document.getElementById("timezoneSelect");
    var selection = timezoneSelect[timezoneSelect.selectedIndex].value;
    if (selection == "OTHER") {
        return document.getElementById("otherTimezone").value.trim();
    } else {
        return selection;
    }
}

function createPlotDownload() {
    var chartElem = document.getElementById("chart");
    var graphStyle = document.getElementById("plotStyles").innerHTML;
    var xmlData = '<svg width="' + chartElem.getAttribute("width") + '" height="' + chartElem.getAttribute("height") + '" background="white">'
        + '<defs><style type="text/css"><![CDATA[' + graphStyle + ']]></style></defs>' + chartElem.innerHTML + '</svg>';
    var downloadAnchor = document.createElement("a");
    downloadAnchor.innerHTML = "Download Image (created " + (new Date()).toLocaleString() + ", local time)";
    downloadAnchor.setAttribute("href", 'data:text/svg;charset="utf-8",' + encodeURIComponent(xmlData));
    downloadAnchor.setAttribute("download", "graph.svg");
    var linkLocation = document.getElementById("download-graph");
    linkLocation.innerHTML = ""; // Clear what was there before...
    linkLocation.insertBefore(downloadAnchor, null); // ... and replace it with this download link
}

$(function () {
        $(".datefield").AnyTime_picker({format: dateFormat});
        updateStreamList();
        automaticAxisUpdate = document.getElementById("automaticAxisSetting").checked; // Some browsers may fill in this value automatically after refresh
        addYAxis();
        $(".removebutton").remove(); // Get rid of the remove button for the first axis
        //axisMap.y1.axisname = document.getElementById("name-y1").value; // Some browsers may fill in this value automatically after refresh
        document.getElementById("timezoneSelect").onchange(); // In case the browser selects "Other:" after refresh
        addedStreams = false;
        changedTimes = false;
        otherChange = false;
        updatePlotMessage();
    });
