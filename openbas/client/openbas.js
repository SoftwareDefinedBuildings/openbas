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
  
  Template.smap_plot.plot_data = [{ hide_stream_tree: true, dataURLStart: 'http://miranda.cs.berkeley.edu:9000/data/uuid/' }, function (inst) { instances.push(inst); inst.imethods.selectMissingStreams([{"Path": "/tests/Data Range Test", "Metadata": {"SourceName": "Fake Data", "Instrument": {"ModelName": "A Python Program"}}, "uuid": "189d722c-44d4-4db7-9799-88f063aa2242", "Properties": {"UnitofTime": "ns", "Timezone": "America/Phoenix", "UnitofMeasure": "deg", "ReadingType": "long"}}]); }, function () { instances[instances.length - 1].imethods.selectStreams(['fake-data2']); }];
}

if (Meteor.isServer) {
  console.log("asdf");
  console.log(Meteor.settings);
}
