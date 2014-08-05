function bind_method(func, self) {
    return function () {
        return func.apply(self, arguments);
    }
}

function init_control(self) {
    self.imethods.selectStreams = bind_method(selectStreams, self);
    self.imethods.deselectStreams = bind_method(deselectStreams, self);
    self.imethods.setStartTime = bind_method(setStartTime, self);
    self.imethods.setEndTime = bind_method(setEndTime, self);
    self.imethods.setTimezone = bind_method(setTimezone, self);
    self.imethods.addAxis = function () { return s3ui.addYAxis(self); };
    self.imethods.removeAxis = bind_method(removeAxis, self);
    self.imethods.renameAxis = bind_method(renameAxis, self);
    self.imethods.setAxisSide = bind_method(setAxisSide, self);
    self.imethods.setAxisScale = bind_method(setAxisScale, self);
    self.imethods.setStreamAxis = bind_method(setStreamAxis, self);
    self.imethods.setStreamColor = bind_method(setStreamColor, self);
    self.imethods.applyAllSettings = bind_method(applyAllSettings, self);
    self.imethods.resetZoom = function () { return s3ui.resetZoom(self); };
    self.imethods.toggleAutomaticUpdate = bind_method(toggleAutomaticUpdate, self);
}

/* Given UUIDS, which is an array of UUIDs, selects the corresponding streams
   in the stream selection tree. */
function selectStreams(uuids) {
    this.idata.streamTree.select_node(uuids);
}

/* Given UUIDS, which is an array of UUIDs, deselects the corresponding streams
   in the stream selection tree. */
function deselectStreams(uuids) {
    this.idata.streamTree.deselect_node(uuids);
}

/* Given DATE, a date object, sets the start time to be the day/time it
   it represents in local time. The start time is set with "second" precision;
   milliseconds are ignored. */
function setStartTime(date) {
    var startTime = this.find(".startdate");
    var newValue = this.idata.dateConverter.format(date);
    if (startTime.value != newValue) {
        startTime.value = newValue;
        startTime.onchange();
    }
}

/* Given DATE, a date object, sets the start time to be the day/time it
   it represents in local time. The start time is set with "second" precision;
   milliseconds are ignored. */
function setEndTime(date) {
    var endTime = this.find(".enddate");
    var newValue = this.idata.dateConverter.format(date);
    if (endTime.value != newValue) {
        endTime.value = newValue;
        endTime.onchange();
    }
}

/* Sets the timezone to the IANA timezone string TZ. */
function setTimezone(tz) {
    var select = this.find(".timezoneSelect");
    var i;
    for (i = 0; select[i].value !== "OTHER"; i++) {
        if (tz === select[i].value) {
            if (i == select.selectedIndex) {
                return;
            }
            break;
        }
    }
    select.selectedIndex = i;
    select.onchange();
    var otherTZ;
    if (select[i].value === "OTHER") {
        otherTZ = this.find(".otherTimezone");
        if (otherTZ.value !== tz) {
            otherTZ.value = tz;
            otherTZ.onchange();
        }
    }
}

/* To create another y-axis, call "addYAxis". */

/* Removes the y-axis with the id ID. If the ID is "y1", no action will be
   taken (removing that axis will surely result in an error). */
function removeAxis(id) {
    if (id !== "y1" && this.idata.axisMap.hasOwnProperty(id)) {
        s3ui.removeYAxis(this, this.idata.axisMap[id]);
    }
}

/* Changes the name of the axis with the specified ID. */
function renameAxis(id, newName) {
    var input = this.find(".axis-" + id).firstChild.firstChild;
    if (input.value !== newName) {
        input.value = newName;
        input.onchange();
    }
}

/* Sets the side of the axis with the specified ID. If LEFT is true, sets its
   side to "Left"; otherwise, sets its side to "Right". */
function setAxisSide(id, left) {
    if (!this.idata.axisMap.hasOwnProperty(id)) {
        return;
    }
    var radButton = this.find(".axis-" + id).lastChild;
    radButton = left ? radButton.firstChild.firstChild : radButton.lastChild.firstChild;
    if (!radButton.checked) {
        radButton.checked = true;
        radButton.onclick();
    }
}

/* Sets the scale of the axis with the specified ID to the range [LOW, HIGH].
   If one of LOW and HIGH is undefined (or not specified), only the specified
   endpoint is changed; if both are undefined, the "Autoscale" settings is set
   to true. */
function setAxisScale(id, low, high) {
    if (!this.idata.axisMap.hasOwnProperty(id)) {
        return;
    }
    var autoscale = low == undefined && high == undefined;
    var currautoscale = this.idata.axisMap[id].autoscale;
    var row = this.find(".axis-" + id);
    var checkbox;
    var endpoints;
    if (autoscale) {
        if (currautoscale) {
            return;
        } else {
            // Check "Autoscale"
            checkbox = row.lastChild.previousSibling.previousSibling.firstChild;
            checkbox.checked = true;
            checkbox.onchange();
        }
    } else {
        if (currautoscale) {
            // Uncheck "Autoscale"
            checkbox = row.lastChild.previousSibling.previousSibling.firstChild;
            checkbox.checked = false;
            checkbox.onchange();
        }
        // Set the endpoints to those specified
        endpoints = row.nextSibling.querySelectorAll("input.axisrange");
        if (low != undefined && endpoints[0].value != low) {
            endpoints[0].value = low;
            endpoints[0].onchange();
        }
        if (high != undefined && endpoints[1].value != high) {
            endpoints[1].value = high;
            endpoints[1].onchange();
        }
    }
}

/* Assigns the stream corresponding to UUID to the axis corresponding to ID. */
function setStreamAxis(uuid, id) {
    var selectElem = this.find(".axis-select-" + uuid);
    if (selectElem.getAttribute("data-prevselect") === id) {
        return;
    }
    for (var i = 0; i < selectElem.length; i++) {
        if (selectElem[i].value === id) {
            selectElem.selectedIndex = i;
            selectElem.onchange();
            break;
        }
    }
}

/* Assigns the stream corresponding to UUID the color COLOR. See
   "makeMenuMaker()" in utils.js for a list of possible colors. */
function setStreamColor(uuid, color) {
    var colorSelect = this.find(".color-" + uuid);
    if (colorSelect[colorSelect.selectedIndex].value !== color) {
        $.data(colorSelect).simplecolorpicker.selectColor(color);
        colorSelect.onchange();
    }
}

/* Programmatically presses the "Apply all Settings and Update Plot" button. */
function applyAllSettings() {
    this.find(".plotButton").onclick();
}

/* To programmatically presses the "Reset Zoom" button, just call "resetZoom". */

/* Programmatically toggles the "Automatic Axis Update" checkbox. Its value can
   be found by reading the value of the "automaticAxisUpdate" boolean. */
function toggleAutomaticUpdate() {
    var checkbox = this.find(".automaticAxisSetting");
    checkbox.checked = !checkbox.checked;
    checkbox.onchange();
}

s3ui.init_control = init_control;
s3ui.bind_method = bind_method;
