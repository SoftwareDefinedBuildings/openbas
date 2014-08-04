s3ui = {instances: [], instanceid: -1}; // stores functions used in multiple files

Template.s3plot.rendered = function () {
        var self = this;
        s3ui.instances.push(self);
        self.idata = {}; // an object to store instance data
        self.imethods = {}; // an object to store instance methods
        s3ui.init_axis(self);
        s3ui.init_plot(self);
        s3ui.init_data(self);
        s3ui.init_frontend(self);
        s3ui.init_control(self);
        
        self.idata.instanceid = ++s3ui.instanceid;
        if (s3ui.instanceid == 4503599627370495) {
            s3ui.instanceid = -4503599627370495;
        }
        
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
        
        // For some reason, Any+Time requires the text elements to have IDs.
        // So, I'm going to give them IDs that are unique across all instances
        self.find(".startdate").id = "start" + self.idata.instanceid;
        self.find(".enddate").id = "end" + self.idata.instanceid;
        self.$(".datefield").AnyTime_picker({format: self.idata.dateFormat});
        s3ui.updateStreamList(self);
        if (self.find(".automaticAxisSetting").checked) { // Some browsers may fill in this value automatically after refresh
            self.idata.automaticAxisUpdate = true;
            self.idata.selectedStreamsBuffer = self.idata.selectedStreams;
        } else {
            self.idata.automaticAxisUpdate = false;
            self.idata.selectedStreamsBuffer = [];
        }
        s3ui.addYAxis(self);
        self.$(".removebutton").remove(); // Get rid of the remove button for the first axis
        self.find(".timezoneSelect").onchange(); // In case the browser selects "Other:" after refresh
        self.idata.addedStreams = false;
        self.idata.changedTimes = false;
        self.idata.otherChange = false;
        s3ui.updatePlotMessage(self);
    };
