// Copyright (c) 2015, Regents of the University of California
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
// 
// 1. Redistributions of source code must retain the above copyright notice, this
// list of conditions and the following disclaimer.
// 
// 2. Redistributions in binary form must reproduce the above copyright notice,
// this list of conditions and the following disclaimer in the documentation
// and/or other materials provided with the distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
// OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

String.prototype.toProperCase = function () { // from http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
      return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

Session.set('loading',false);
var actuators = {};
var actuatorsDep = new Deps.Dependency;

var getActuators = function(act_uuid) {
  actuatorsDep.depend();
  return actuators[act_uuid] || {"Actuator": {"Model": "none", "States": [0,1], "MinValue": 0, "MaxValue": 100, "Values": ["does","not","work"]}};
};

var updateActuators = function(act_uuid, data) {
  actuators[act_uuid] = data;
  actuatorsDep.changed();
};

var permalinks = {};
var permalinksDep = new Deps.Dependency;

var getPermalink = function(uuid) {
  permalinksDep.depend();
  return permalinks[uuid] || '#';
};

var updatePermalink = function(uuid, link) {
  permalinks[uuid] = link
  permalinksDep.changed();
};

Template.actuators.actuatorsAll = function() {
  // only returns points that have ActuatorPath
  return Points.find({"ActuatorUUID": {"$exists": true}}, {"reactive": !Session.get('loading')});
};

Template.point_row.rendered = function() {
  var uuid = this.data.uuid;
  Meteor.call('createPermalink', {
    "streams": [ {"stream": uuid, "color": "#000000" } ],
     "autoupdate": true,
     "window_type": "now",
     "window_width": 86400000000000,
     "tz": "UTC",
   }, function(err, res) {
     updatePermalink(uuid, res);
  });
};

Template.actuator_display.rendered = function() {
  var uuid = this.data.ActuatorUUID;
  Meteor.call('tags', uuid, function(err, res) {
    if (err) {
      console.log(err);
    }
    updateActuators(res[0].uuid, res[0]);
  });
  Meteor.call('createPermalink', 
  {
     "streams":
     [
         {
             "stream": this.data.uuid,
             "color": "#000000"
         },
     ],
     "autoupdate": true,
     "window_type": "now",
     "window_width": 86400000000000,
     "tz": "UTC",
   }, function(err, res) {
     updatePermalink(uuid, res);
  });
};

Template.actuator_display.type = function() {
  return getActuators(this.ActuatorUUID).Actuator.Model || "none";
};

// functions to help determine type of actuator based on Actuator.Model from sMAP metadata
Template.actuator_display.helpers({
  isDiscrete: function(template) {
    return getActuators(this.ActuatorUUID).Actuator.Model === "discrete";
  },
  isBinary: function(template) {
    return getActuators(this.ActuatorUUID).Actuator.Model === "binary";
  },
  isContinuous: function(template) {
    var model = getActuators(this.ActuatorUUID).Actuator.Model;
    return model === 'continuous' || model === 'continuousInteger';
  }
});

Template.actuator_display.point = function(uuid) {
  //var p = Points.find({'uuid': uuid}, {'reactive': false }).fetch()[0];
  var p = Points.find({'uuid': uuid}, {'reactive': !Session.get('loading')}).fetch()[0];
  return p;
};

Template.actuator_display.name = function() {
  var p = Points.find({'_id': this._id}).fetch()[0];
  var pathcomponents = p.Path.split("/");
  return pathcomponents[pathcomponents.length - 1].replace('_',' ').toProperCase();
};

Template.point_row.ploturl = function() {
  return '/plot?'+getPermalink(this.uuid);
};

Template.actuator_display.ploturl = function() {
  return '/plot?'+getPermalink(this.ActuatorUUID);
};

Template.point_display.point = function(uuid) {
  //var p = Points.find({'uuid': uuid}, {'reactive': false }).fetch()[0];
  var p = Points.find({'uuid': uuid}, {'reactive': !Session.get('loading')}).fetch()[0];
  return p;
};

Template.point_display.ploturl = function() {
  return '/plot?'+getPermalink(this.uuid);
};

Template.point_display.name = function() {
  var p = Points.find({'_id': this._id}).fetch()[0];
  var pathcomponents = p.Path.split("/");
  return pathcomponents[pathcomponents.length - 1].replace('_',' ').toProperCase();
};

Template.point_display.rendered = function(){
  var myuuid = this.data.uuid;
  Meteor.call('createPermalink', 
  {
     "streams":
     [
         {
             "stream": myuuid,
             "color": "#000000"
         },
     ],
     "autoupdate": true,
     "window_type": "now",
     "window_width": 86400000000000,
     "tz": "UTC",
   }, function(err, res) {
      if (err) {
         console.log('permalink error',err)
      }
     updatePermalink(myuuid, res);
  });
  var restrict = "uuid='" + this.data.uuid + "'";
  var q = "select data in (now -4h, now) where " + restrict;
  Meteor.call("query", q, function(err, res){
    if (res[0] != undefined){
      var mydata = jsonify(res[0].Readings);
      sparkline("#sparkline-" + myuuid, mydata, 300, 50, "last 4 hours");
    }
  });
};

/* Actuator Continuous */

Template.actuator_continuous.rendered = function() {
  var that = getActuators(this.data.ActuatorUUID);
  var port = this.data.ServerPort;
  var min = 0;
  var max = 10;
  if (that.Actuator.MinValue) {
    min = that.Actuator.MinValue;
    max = that.Actuator.MaxValue;
  } else {
    var states;
    if (typeof(that.Actuator.States) == "object") {
        states = that.Actuator.States;
    } else {
        states = EJSON.parse(that.Actuator.States);
    }
    min = states[0];
    max = states[1]
  }
  $("#"+this.data.ActuatorUUID).slider({
    min: Number(min),
    max: Number(max),
    step: 1,
    value: this.data.value
  }).on('slideStop', function(e) {
    Meteor.call("actuate", port, that.Path, e.value, function(err, res) {
      if (err) {
        console.log("ERROR", err);
      }
    });
  }).on('slideStart', function(e) {
  });
};

//Template.actuator_continuous.value = function() {
//  var p = Points.find({'_id': this._id}, {'reactive': !Session.get('loading')}).fetch();
//  $('#'+this.ActuatorUUID).slider('setValue', p[0].value);
//  return p[0].value;
//};

/* Actuator Discrete */

Template.actuator_discrete.rendered = function() {
  var that = getActuators(this.data.ActuatorUUID);
  var uuid = this.data.ActuatorUUID;
  var port = this.data.ServerPort;
  $.each(that.Actuator.Values, function(idx, val) {
    $('#'+uuid).append($("<option></option>")
        .attr("value", idx)
        .text(val));
  });
};

Template.actuator_discrete.events({
  'change': function(e) {
    var that = getActuators(this.ActuatorUUID);
    Meteor.call("actuate", this.ServerPort, that.Path, e.target.selectedIndex, function(err, res) {
        if (err) {
            console.log("ERROR", err);
        }
        $('#'+this.ActuatorUUID).val(e.target.selectedIndex);
    });
  }
});

Template.actuator_discrete.value = function() {
  var p = Points.find({'_id': this._id}).fetch();
  $('#'+this.ActuatorUUID).val(p[0].value);
  return p[0].value;
};

/* Actuator Binary */

Template.actuator_binary.rendered = function() {
  var p = Points.find({'uuid': this.data.uuid}, {'reactive': false}).fetch();
  if (p[0].value === 0) {
    $('#'+this.data.ActuatorUUID+"-on").removeClass("pressed");
    $('#'+this.data.ActuatorUUID+"-off").addClass("pressed");
  } else {
    $('#'+this.data.ActuatorUUID+"-off").removeClass("pressed");
    $('#'+this.data.ActuatorUUID+"-on").addClass("pressed");
  }
};

Template.actuator_binary.events({
  'click': function (e) {
    var target = $(e.target);
    if (!target.hasClass('pressed')) {
      if (target.hasClass('on-button')) { // on button pressed
        var val = 1;
        $('#'+this.ActuatorUUID+"-off").removeClass("pressed");
        $('#'+this.ActuatorUUID+"-on").addClass("pressed");
      } else {
        var val = 0;
        $('#'+this.ActuatorUUID+"-on").removeClass("pressed");
        $('#'+this.ActuatorUUID+"-off").addClass("pressed");
      }
      var act = getActuators(this.ActuatorUUID);
      Meteor.call("actuate", this.ServerPort, act.Path, val, function(err, res) {
        if (err) {
          console.log("ERROR", err);
        }
      });
    }
  }
});

