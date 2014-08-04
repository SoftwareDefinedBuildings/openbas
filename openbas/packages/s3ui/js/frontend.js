function init_frontend(self) {
    self.idata.streamList = [];
    self.idata.dateFormat = "%a %b %d, %Y %T";
    self.idata.dateConverter = new AnyTime.Converter({format: self.idata.dateFormat});
    self.idata.labelFormatter = new AnyTime.Converter({format: self.idata.dateFormat, utcFormatOffsetImposed: 0});
    self.idata.makeColorMenu = s3ui.makeMenuMaker();
    self.idata.streamSettings = {}; // Stores the stream settings chosen in the legend (maps uuid to a setting object)
    self.idata.selectedStreamsBuffer = self.idata.selectedStreams; // Streams that have been selected and are displayed in the legend
    self.idata.streamMessages = {}; // Maps a stream's uuid to a 2-element array containing 1) an object mapping importances (ints) to messages and 2) the importance of the current message being displayed

    self.idata.addedStreams = undefined;
    self.idata.changedTimes = undefined;
    self.idata.otherChange = undefined;
    self.idata.automaticAxisUpdate = false; // True if axes will be updated without the need for an "Update Axes" button
    self.idata.streamTree = undefined;
}

function updateStreamList(self) {
    self.$("span.streamLoading").html("Loading Streams...");
    s3ui.getURL('http://bunker.cs.berkeley.edu/backend/api/tags', function (data) {
            self.idata.streamList = JSON.parse(data);
            
            self.$("span.streamLoading").html("");
              
            if (self.idata.streamTree != undefined) {
                // Remove everything from legend before destroying tree
                var roots = self.idata.streamTree.get_node("#").children;
                for (var i = 0; i < roots.length; i++) {
                    s3ui.selectNode(self, self.idata.streamTree, false, self.idata.streamTree.get_node(roots[i]));
                }
                self.idata.streamTree.destroy(true);
                s3ui.applySettings(self);
            }
            
            var streamTreeDiv = self.$("div.streamTree");
            streamTreeDiv.jstree({
                    core: {
                        data: s3ui.listToTree(self.idata.streamList)
                    },
                    contextmenu: {
                        select_node: false,
                        items: s3ui.getContextMenu
                    },
                    plugins: ["checkbox", "contextmenu"]
                });
            self.idata.streamTree = $.jstree.reference(streamTreeDiv);
            streamTreeDiv.on("select_node.jstree", function (event, data) {
                    s3ui.selectNode(self, self.idata.streamTree, true, data.node);
                    s3ui.applySettings(self);
                });
            streamTreeDiv.on("deselect_node.jstree", function (event, data) {
                    s3ui.selectNode(self, self.idata.streamTree, false, data.node);
                    s3ui.applySettings(self);
                });
        }, "text");
}

/* Adds or removes (depending on the value of SHOW) the stream
described by STREAMDATA to or from the legend. */
function toggleLegend (self, show, streamdata, update) {
    if (update == undefined) {
        update = true;
    }
    if (show) {
        self.idata.selectedStreamsBuffer.push(streamdata);
        var row = d3.select(self.find("tbody.legend"))
          .append("tr")
            .datum(streamdata)
            .attr("class", function (d) { return "legend-" + d.uuid; });
        var colorMenu = row.append("td")
            .append(self.idata.makeColorMenu)
            .attr("class", function (d) { return "color-" + d.uuid; })
          .node();
        colorMenu.onchange = function () {
                  var newColor = this[this.selectedIndex].value;
                  var streamGroup= self.$("g.series-" + streamdata.uuid);
                  streamGroup.attr("stroke", newColor);
                  streamGroup.attr("fill", newColor);
                  self.idata.streamSettings[streamdata.uuid].color = newColor;
              };
        self.idata.streamSettings[streamdata.uuid] = { color: colorMenu[colorMenu.selectedIndex].value, axisid: "y1" }; // axisid is changed
        self.idata.streamMessages[streamdata.uuid] = [{0: ""}, 0];
        var nameElem = row.append("td")
            .html(function (d) { return s3ui.getFilepath(d); })
          .node();
        nameElem.onmouseover = function () {
                if (self.idata.initialized) {
                    self.$("g.series-" + streamdata.uuid).attr({"stroke-width": 3, "fill-opacity": 0.5});
                    var xdomain = self.idata.oldXScale.domain();
                    var currPWE = s3ui.getPWExponent((xdomain[1] - xdomain[0]) / self.idata.WIDTH);
                    setStreamMessage(self, streamdata.uuid, "Interval width: " + s3ui.nanosToUnit(Math.pow(2, currPWE)), 2);
                    s3ui.showDataDensity(self, streamdata.uuid);
                }
            };
        nameElem.onmouseout = function () {
                self.$("g.series-" + streamdata.uuid).attr({"stroke-width": 1, "fill-opacity": 0.3});
                setStreamMessage(self, streamdata.uuid, undefined, 2);
                s3ui.hideDataDensity(self);
            };
        var selectElem = row.append("td")
          .append("select")
            .attr("class", "axis-select axis-select-" + streamdata.uuid);
        selectElem.selectAll("option")
          .data(self.idata.yAxes)
          .enter()
          .append("option")
            .attr("class", function (d) { return "option-" + d.axisid; })
            .attr("value", function (d) { return d.axisid; })
            .html(function (d) { return d.axisname; });
        var selectNode = selectElem.node();
        var initIndex = s3ui.guessYAxis(self, streamdata); // use a heuristic to get the initial selection
        if (initIndex == undefined) {
            initIndex = self.idata.yAxes.length;
            s3ui.addYAxis(self);
        }
        selectNode.selectedIndex = initIndex;
        selectNode.setAttribute("data-prevselect", selectNode[selectNode.selectedIndex].value);
        selectNode.onchange = function (event, suppressUpdate) {
                var newID = this[this.selectedIndex].value;
                s3ui.changeAxis(self, streamdata, this.getAttribute("data-prevselect"), newID);
                this.setAttribute("data-prevselect", newID);
                if (suppressUpdate == undefined) {
                    s3ui.applySettings(self);
                }
            };
        var intervalWidth = row.append("td").attr("class", "message-" + streamdata.uuid).node();
        s3ui.changeAxis(self, streamdata, null, selectNode[selectNode.selectedIndex].value);
        $("select.color-" + streamdata.uuid).simplecolorpicker({picker: true});
        if (update) { // Go ahead and display the stream
            s3ui.applySettings(self);
        }
    } else {
        var toRemove = self.find(".legend-" + streamdata.uuid);
        var selectElem = d3.select(toRemove).select('.axis-select').node();
        var oldAxis = selectElem[selectElem.selectedIndex].value;
        s3ui.changeAxis(self, streamdata, oldAxis, null);
        toRemove.parentNode.removeChild(toRemove);
        // we could delete self.idata.streamSettings[streamdata.uuid]; but I want to keep the settings around
        for (var i = 0; i < self.idata.selectedStreamsBuffer.length; i++) {
            if (self.idata.selectedStreamsBuffer[i] == streamdata) {
                self.idata.selectedStreamsBuffer.splice(i, 1);
                break;
            }
        }
        if (update) {
            s3ui.applySettings(self); // Make stream removal visible on the graph
        }
    }
}

/* Sets the message to be displayed for a certain importance; the message with
   the highest importanced is displayed. */
function setStreamMessage(self, uuid, message, importance) {
    var messages = self.idata.streamMessages[uuid];
    messages[0][importance] = message;
    if (message == undefined) {
        if (importance == messages[1]) {
            while (messages[0][importance] == undefined) {
                importance--;
            }
            messages[1] = importance;
            self.find(".message-" + uuid).innerHTML = messages[0][importance];
        }
    } else if (importance >= messages[1]) {
        messages[1] = importance;
        self.find(".message-" + uuid).innerHTML = message;
    }
}

function updatePlotMessage(self) {
    var message = "";
    if (self.idata.automaticAxisUpdate) {
        if (self.idata.addedStreams || self.idata.changedTimes) {
            message = 'Click "Apply all Settings and Plot Data" to update the graph.';
        }
    } else {
        if (self.idata.addedStreams || self.idata.changedTimes || self.idata.otherChange) {
            message = 'Click "Apply all Settings and Plot Data" to update the graph.';
        }
    }
    self.find(".plotLoading").innerHTML = message;
}

function getSelectedTimezone(self) {
    var timezoneSelect = self.find(".timezoneSelect");
    var selection = timezoneSelect[timezoneSelect.selectedIndex].value;
    if (selection == "OTHER") {
        return self.find(".otherTimezone").value.trim();
    } else {
        return selection;
    }
}

function createPlotDownload(self) {
    var chartElem = self.find(".chart");
    var chartData = chartElem.innerHTML.replace(/[\d.]+em/g, function (match) {
            return (parseFloat(match.slice(0, match.length - 2)) * 16) + "px";
        }); // It seems that using "em" to position fonts doesn't work in Inkview, a common SVG viewing application
    var graphStyle = self.find(".plotStyles").innerHTML;
    var xmlData = '<svg width="' + chartElem.getAttribute("width") + '" height="' + chartElem.getAttribute("height") + '" font-family="serif" font-size="16px">'
        + '<defs><style type="text/css"><![CDATA[' + graphStyle + ']]></style></defs>' + chartData + '</svg>';
    var downloadAnchor = document.createElement("a");
    downloadAnchor.innerHTML = "Download Image (created " + (new Date()).toLocaleString() + ", local time)";
    downloadAnchor.setAttribute("href", 'data:text/svg;charset="utf-8",' + encodeURIComponent(xmlData));
    downloadAnchor.setAttribute("download", "graph.svg");
    var linkLocation = self.find(".download-graph");
    linkLocation.innerHTML = ""; // Clear what was there before...
    linkLocation.insertBefore(downloadAnchor, null); // ... and replace it with this download link
}

s3ui.init_frontend = init_frontend;
s3ui.updateStreamList = updateStreamList;
s3ui.toggleLegend = toggleLegend;
s3ui.setStreamMessage = setStreamMessage;
s3ui.updatePlotMessage = updatePlotMessage;
s3ui.getSelectedTimezone = getSelectedTimezone;
s3ui.createPlotDownload = createPlotDownload;
