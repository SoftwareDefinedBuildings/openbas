s3ui = {instances: [], instanceid: -1}; // stores functions used in multiple files

Template.s3plot.rendered = function () {
        var self = this;
        s3ui.instances.push(self);
        
        self.idata = {}; // an object to store instance data
        self.imethods = {}; // an object to store instance methods
        
        self.idata.instanceid = ++s3ui.instanceid;
        if (s3ui.instanceid == 4503599627370495) {
            s3ui.instanceid = -4503599627370495;
        }
        
        self.find("tr.streamLegend").className = "streamLegend-" + self.idata.instanceid;
        self.idata.dynamicStyles = self.find("style.dynamicStyles");
        
        s3ui.init_axis(self);
        s3ui.init_plot(self);
        s3ui.init_data(self);
        s3ui.init_frontend(self);
        s3ui.init_streamtree(self);
        s3ui.init_control(self);
        
        var c1, c2;
        
        if (self.data !== null && typeof self.data === "object" && typeof self.data[0] === "object" && typeof self.data[1] === "function" && typeof self.data[2] === "function") {
            init_visuals(self, self.data[0]);
            if (self.data[0].width != undefined) {
                self.find("svg.chart").setAttribute("width", self.data[0].width);
                self.idata.WIDTH = self.data[0].width;
            }
            if (self.data[0].height != undefined) {
                self.find("svg.chart").setAttribute("height", self.data[0].height);
                self.idata.HEIGHT = self.data[0].height;
            }
            if (self.data[0].dataURLStart != undefined) {
                self.idata.dataURLStart = self.data[0].dataURLStart;
            }
            if (self.data[0].tagsURL != undefined) {
                self.idata.tagsURL = self.data[0].tagsURL;
            }
            self.imethods.changeVisuals = function (options) {
                    init_visuals(self, options);
                };
            c1 = self.data[1];
            c2 = self.data[2];
        } else {
            c1 = function () {};
            c2 = false;
        }
        
        __init__(self, c1, c2);
    };
    
function init_visuals(self, options) {
    setVisibility(self, options, "h1.mainTitle", "hide_main_title");
    setVisibility(self, options, "h2.graphTitle", "hide_graph_title");
    setVisibility(self, options, "div.graphExport", "hide_graph_export");
    setVisibility(self, options, "tr.streamLegend-" + self.idata.instanceid, "hide_stream_legend");
    setVisibility(self, options, "tr.axisLegend", "hide_axis_legend");
    setVisibility(self, options, "span.settingsTitle", "hide_settings_title");
    setVisibility(self, options, "span.automaticUpdate", "hide_automatic_update");
    setVisibility(self, options, "button.plotButton", "hide_apply_button");
    setVisibility(self, options, "button.resetZoom", "hide_reset_button");
    setVisibility(self, options, "span.plotLoading", "hide_info_bar");
    setVisibility(self, options, "div.timeSelection", "hide_time_selection");
    setVisibility(self, options, "div.streamSelection", "hide_stream_tree");
    setVisibility(self, options, "g.plotDirections", "hide_plot_directions");
    setVisibility(self, options, "button.updateStreamList", "hide_refresh_button");
    
    setCSSRule(self, options, "tr.streamLegend-" + self.idata.instanceid + " select.axis-select { display: none; }", "hide_axis_selection");
    setCSSRule(self, options, "tr.streamLegend-" + self.idata.instanceid + " span.simplecolorpicker { pointer-events: none; }", "disable_color_selection");
}

function setVisibility(self, options, selector, attr) {
    if (options.hasOwnProperty(attr)) {
        if (options[attr]) {
            self.find(selector).setAttribute("style", "display: none;");
        } else {
            self.find(selector).setAttribute("style", "");
        }
    }
}

function setCSSRule(self, options, rule, attr) {
    if (options.hasOwnProperty(attr)) {
        var styles = self.idata.dynamicStyles;
        if (options[attr]) {
            styles.innerHTML += rule;
        } else {
            styles.innerHTML = styles.innerHTML.replace(rule, "");
        }
    }
}
    
function __init__(self, c1, c2) {
    // Finish building the graph components
    s3ui.addYAxis(self);
    self.$(".removebutton").remove(); // Get rid of the remove button for the first axis
    
    // For some reason, Any+Time requires the text elements to have IDs.
    // So, I'm going to give them IDs that are unique across all instances
    self.find(".startdate").id = "start" + self.idata.instanceid;
    self.find(".enddate").id = "end" + self.idata.instanceid;
    
    // Event handlers are added programmatically
    self.find(".makeGraph").onclick = function () {
            self.find(".download-graph").innerHTML = 'Creating image...';
            setTimeout(function () { s3ui.createPlotDownload(self); }, 50);
        };
    self.find(".addAxis").onclick = function () {
            s3ui.addYAxis(self);
        };
    self.find(".plotButton").onclick = function () {
            self.idata.addedStreams = false;
            self.idata.changedTimes = false;
            s3ui.updatePlot(self);
        };
    self.find(".resetZoom").onclick = function () {
            s3ui.resetZoom(self);
        };
    self.find(".automaticAxisSetting").onchange = function () {
            self.idata.automaticAxisUpdate = !self.idata.automaticAxisUpdate;
            if (self.idata.automaticAxisUpdate) {
                self.idata.selectedStreams = self.idata.selectedStreamsBuffer;
                if (self.idata.otherChange || self.idata.addedStreams) {
                    s3ui.applySettings(self);
                }
            } else {
                s3ui.updatePlotMessage(self);
                self.idata.selectedStreamsBuffer = self.idata.selectedStreams.slice();
            }
        };
    var changedDate = function () {
            self.idata.changedTimes = true;
            s3ui.updatePlotMessage(self);
        };
    self.find(".startdate").onchange = changedDate;
    self.find(".enddate").onchange = changedDate;
    self.find(".nowButton").onclick = function () {
            self.$('.enddate').val(self.idata.dateConverter.format(new Date())).change();
        };
    self.find(".timezoneSelect").onchange = function () {
            var visibility = (this[this.selectedIndex].value == 'OTHER' ? 'visible' : 'hidden');
            self.find(".otherTimezone").style.visibility = visibility;
            self.idata.changedTimes = true;
            s3ui.updatePlotMessage(self);
        };
    self.find(".otherTimezone").onchange = changedDate;
    self.find(".updateStreamList").onclick = function () {
            s3ui.updateStreamList(self);
        };
    
    self.$(".datefield").AnyTime_picker({format: self.idata.dateFormat});
    if (self.find(".automaticAxisSetting").checked) { // Some browsers may fill in this value automatically after refresh
        self.idata.automaticAxisUpdate = true;
        self.idata.selectedStreamsBuffer = self.idata.selectedStreams;
    } else {
        self.idata.automaticAxisUpdate = false;
        self.idata.selectedStreamsBuffer = [];
    }
    self.find(".timezoneSelect").onchange(); // In case the browser selects "Other:" after refresh
    self.idata.addedStreams = false;
    self.idata.changedTimes = false;
    self.idata.otherChange = false;
    s3ui.updatePlotMessage(self);
    
    self.$(".streamTree").on("ready.jstree", c2);
    s3ui.updateStreamList(self);
    c1(self);
}
