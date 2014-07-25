// Functions and state of the selection of axes

function Axis (id) {
    this.axisname = id;
    this.axisid = id;
    this.streams = [];
    this.units = {};
    this.autoscale = true;
    this.manualscale = [-1, 1];
}

/* These three variables are maintained with every operation. */
var yAxes = []; // Stores a list of axis objects
var numAxes = 0; // The number of times "Add a Y-Axis" has been clicked plus 1, NOT the number of axes
var axisMap = {}; // Maps the id of an axis to its axis object

/* Move STREAM from one axis to another. If FROMAXISID or TOAXISID is null,
   STREAM is simply removed from FROMAXISID or added to TOAXISID.
   This updates the "Axes" box, but not the select menu in the "Legend" box. */
function changeAxis(stream, fromAxisID, toAxisID, updateGraph) {
    var unit = stream.Properties.UnitofMeasure;
    if (fromAxisID != null) {
        var streamList = axisMap[fromAxisID].streams;
        for (var i = 0; i < streamList.length; i++) {
            if (streamList[i] == stream) {
                streamList.splice(i, 1);
                break;
            }
        }
        axisMap[fromAxisID].units[unit]--;
        updateYAxis(fromAxisID);
    }
    if (toAxisID != null) {
        axisMap[toAxisID].streams.push(stream);
        var unitDict = axisMap[toAxisID].units;
        if (unitDict.hasOwnProperty(unit)) {
            unitDict[unit]++;
        } else {
            unitDict[unit] = 1;
        }
        streamSettings[stream.uuid].axisid = toAxisID;
        updateYAxis(toAxisID);
    }
}

/* Create a new y-axis, updating the variables and the screen as necessary. */
function addYAxis() {
    numAxes++;
    var id = "y" + numAxes;
    var axisObj = new Axis(id);
    yAxes.push(axisObj);
    axisMap[id] = axisObj;
    var row = d3.select("tbody#axes")
      .append("tr")
        .attr("class", "axissetting")
        .attr("id", "axis-" + id);
    row.append("td")
      .append("input")
        .attr("type", "text")
        .attr("class", "axisname")
        .attr("value", id)
        .node().onchange = function () {
                axisObj.axisname = this.value;
                $("option.option-" + axisObj.axisid).html(this.value);
                $("text#axistitle-" + axisObj.axisid).html(this.value);
            };
    row.append("td")
        .attr("class", "axisstreams");
    row.append("td")
        .attr("class", "axisunits");
        
    // Create the DOM element for selecting the range
    var rangeRow = document.createElement("tr");
    var selectElem = d3.select(rangeRow).append("td")
        .attr("class", "axisrangeselect")
        .attr("colspan", "4");
    selectElem.append("span")
        .text("Scale: ");
    selectElem.append("input")
        .attr("type", "text")
        .attr("class", "axisrange")
        .node().onchange = function () {
                axisObj.manualscale[0] = parseFloat(this.value.trim());
                applySettings();
            };
    selectElem.append("span")
        .text(" to ");
    selectElem.append("input")
        .attr("type", "text")
        .attr("class", "axisrange")
        .node().onchange = function () {
                axisObj.manualscale[1] = parseFloat(this.value.trim());
                applySettings();
            };
        
    var rangeElem = row.append("td");
    rangeElem.append("input")
        .attr("type", "checkbox")
        .property("checked", true)
        .node().onchange = function () {
                var thisRow = this.parentNode.parentNode;
                axisObj.autoscale = this.checked;
                if (this.checked) {
                   thisRow.parentNode.removeChild(thisRow.nextSibling);
                   applySettings();
                } else {
                    thisRow.parentNode.insertBefore(rangeRow, thisRow.nextSibling);
                    var fields = selectElem.node().getElementsByClassName("axisrange");
                    fields[0].value = axisObj.manualscale[0];
                    fields[1].value = axisObj.manualscale[1];
                }
            };
    rangeElem.append("span")
      .text("Autoscale");
    row.append("td")
      .append("button")
        .html("Remove")
        .attr("class", "removebutton")
        .node().onclick = function () {
                removeYAxis(axisObj);
            };
    d3.selectAll("select.axis-select")
      .append("option")
        .attr("class", "option-" + axisObj.axisid)
        .attr("value", axisObj.axisid)
        .html(axisObj.axisname);
}

/* Delete the y-axis specified by the Axis object AXIS. */
function removeYAxis(axis) {
    var streamList = axis.streams;
    var i;
    var selectbox;
    var mustUpdate = (streamList.length > 0);
    for (i = streamList.length - 1; i >= 0; i--) {
        selectbox = document.getElementById("axis-select-" + streamList[i].uuid);
        selectbox.selectedIndex = 0;
        selectbox.onchange(null, true); // We update the graph ONCE at the end, not after each stream is moved
    }
    updateYAxis("y1");
    delete axisMap[axis.axisid];
    for (i = 0; i < yAxes.length; i++) {
        if (yAxes[i] == axis) {
            yAxes.splice(i, 1);
            break;
        }
    }
    if (mustUpdate) {
        applySettings();
    }
    $("tr#axis-" + axis.axisid).remove();
    $("option.option-" + axis.axisid).remove();
}

/* Update the list of streams and units for the axis specified by the ID
   AXISID. */
function updateYAxis (axisid) {
    var rowSelection = d3.select("tr#axis-" + axisid);
    var streamUpdate = rowSelection.select("td.axisstreams")
      .selectAll("div")
      .data(axisMap[axisid].streams);
    streamUpdate.enter()
      .append("div");
    streamUpdate
        .text(function (stream) { return stream.Path; });
    streamUpdate.exit()
        .remove()
    rowSelection.select("td.axisunits")
        .each(function () {
                var unitList = [];
                var units = axisMap[axisid].units;
                for (unit in units) {
                    if (units.hasOwnProperty(unit) && units[unit] > 0) {
                        unitList.push(unit);
                    }
                }
                this.innerHTML = unitList.join(", ");
            });
}

/* Given a stream, heuristically determines which axis (of those currently
   present) is ideal for it. Returns the index of the chosen axis in yAxes, or
   undefined if none of the current y-axes are suitable.
   
   The function attempts to find an axis with the same units as the stream.
   If this is not possible, it searches for an axis with no streams assigned
   to it.
   If that is not possible either, it returns undefined. */
function guessYAxis (stream) {
    var axis;
    var unit = stream.Properties.UnitofMeasure;
    var backupIndex;
    for (var i = 0; i < yAxes.length; i++) {
        axisUnits = yAxes[i].units;
        if (axisUnits.hasOwnProperty(unit) && axisUnits[unit] > 0) {
            return i;
        } else if (backupIndex == undefined && yAxes[i].streams.length == 0) {
            backupIndex = i;
        }
    }
    return backupIndex;
}
