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
  
  Template.smap_plot.plot_data = [{ hide_main_title: true, hide_graph_title: true, hide_graph_export: true, hide_stream_legend: false, disable_color_selection: true, hide_axis_legend: true, hide_axis_selection: false, hide_settings_title: true, hide_automatic_update: true, hide_apply_button: true, hide_reset_button: true, hide_info_bar: true, hide_time_selection: true, hide_stream_tree: false, width: 900, height: 400 }, function (inst) { instances.push(inst); }];
}

if (Meteor.isServer) {
  console.log("asdf");
  console.log(Meteor.settings);
}
