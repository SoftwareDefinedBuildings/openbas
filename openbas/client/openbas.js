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
  
  Template.smap_plot.plot_data = [{ tagsURL: 'http://quasar.cal-sdb.org:4523', dataURLStart: 'http://quasar.cal-sdb.org:9000/data/uuid/', permalinkStart: 'start.html' }, function (inst) { instances.push(inst); }, 'streams=' + encodeURIComponent('{"Path": "/tests/uPMU Range Test", "Metadata": {"SourceName": "Fake Data", "Instrument": {"ModelName": "A Python Program"}}, "uuid": "b213930f-66d3-4878-9a24-0a643a3d2943", "Properties": {"UnitofTime": "ns", "Timezone": "America/Phoenix", "UnitofMeasure": "deg", "ReadingType": "long"}}') + '&start=1401244860&end=1401244920&tz=America%2FLos_Angeles&zoom=29.36447623396371&translate=-8406.537633202037'];
}

if (Meteor.isServer) {
  console.log("asdf");
  console.log(Meteor.settings);
}
