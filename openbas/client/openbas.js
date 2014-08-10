Points = new Meteor.Collection("points");
instances = [];

deliver = function(err, res) {
  if (err) {
    console.log(err);
  }
  console.log("got RES", res);
};

if (Meteor.isClient) {

  Template.points.pointsAll = function() {
    return Points.find({});
  };  

  Template.actuators.actuatorsAll = function() {
    // only returns points that have ActuatorPath
    return Points.find({"ActuatorUUID": {"$exists": true} })
  };

  Template.actuator_display.rendered = function() {
    var uuid = this.data.ActuatorUUID;
    console.log("rendered",uuid);
    Meteor.call('tags', uuid);
  };

  Template.actuator_display.type = function() {
    return Session.get(this.ActuatorUUID) || "none";
  };


  Template.navbar.helpers({
    activeIf: function (template) {
      var currentRoute = Router.current();
      return currentRoute &&
        template === currentRoute.lookupTemplate() ? 'active' : '';
    }
  });

  Template.home.greeting = function () {
    return "Welcome to openbas.";
  };

  Template.home.events({
    'click input': function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log("You pressed the button");
    }
  });
  
  Template.smap_plot.plot_data = [{ tagsURL: 'http://new.openbms.org/backend/api/query?', dataURLStart: 'http://quasar.cal-sdb.org:9000/data/uuid/' }, function (inst) { instances.push(inst); }, function () { var inst = instances[instances.length - 1]; inst.imethods.selectStreams([{"Path": "/tests/uPMU Range Test", "Metadata": {"SourceName": "Fake Data", "Instrument": {"ModelName": "A Python Program"}}, "uuid": "189d722c-44d4-4db7-9799-88f063aa2242", "Properties": {"UnitofTime": "ns", "Timezone": "America/Phoenix", "UnitofMeasure": "deg", "ReadingType": "long"}}, {"Path": "/keti/1665/temperature", "uuid": "39ef31da-d369-5d90-bcdf-f6245ab0387a", "Properties": {"UnitofTime": "s", "Timezone": "America/Los_Angeles", "UnitofMeasure": "C", "ReadingType": "double"}, "Metadata": {"Building": "CIEE", "Room": "General Area East", "Floor": "2", "SourceName": "CIEE KETImotes", "moteid": "1665", "Site": "51320145-1f5d-11e4-bd08-6003089ed1d0", "System": "Monitoring", "Hvaczone": "General Area", "Location": {"Building": "CIEE Office", "Room": "General Area East"}, "Type": "Sensor"}}]); }];
}

if (Meteor.isServer) {
  console.log("asdf");
  console.log(Meteor.settings);
}
