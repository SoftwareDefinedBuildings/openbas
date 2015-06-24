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

var iperiod = 0;

Template.schedule.master = function(){
  return MasterSchedule.findOne({});
}

Template.schedule.days = function(){
  var rv = [
    {'day': 'Sunday', 'day_id': 'sun'},
    {'day': 'Monday', 'day_id': 'mon'},
    {'day': 'Tuesday', 'day_id': 'tue'},
    {'day': 'Wednesday', 'day_id': 'wed'},
    {'day': 'Thursday', 'day_id': 'thu'},
    {'day': 'Friday', 'day_id': 'fri'},
    {'day': 'Saturday', 'day_id': 'sat'}
  ];
  return rv;
};

Template.schedule.schedules = function(){
  return Schedules.find({});
};

Template.schedule.rendered = function(){
  var master_sched = MasterSchedule.findOne({});
  _.each(master_sched, function(type, day){ 
    $('#'+day+'-schedule').val(type);
  });
};

Template.period_point.path_names = function(){
  return OpenBAS.PathNames;
};

Template.schedule.events({
  'click #save-schedule': function(){
    var master_sched = MasterSchedule.findOne({});
    var id = master_sched._id;
    _.each(master_sched, function(val, ind){
      master_sched[ind] = $('#'+ind+'-schedule').val();
    });
    delete master_sched._id;
    var r = MasterSchedule.update(id, {$set: master_sched});
    if (r){
      $("#success-alert").slideDown(800);
      window.setTimeout(function(){
        $("#success-alert").slideUp(800);
      }, 5000);
    }
  },
  'click .delete-schedule': function(event){
    var clicked_id = $(event.target).data('id');
    Schedules.remove({ _id: clicked_id});
  },
});

Template.edit_schedule.events({
  'click #add-period': function(event){
    iperiod++; 
    var rendered = UI.renderWithData(Template.schedule_period, {'iperiod': iperiod});
    UI.insert(rendered, $('table')[0]);
  },
  'click .add-control-point': function(event){
    var clicked_name = $(event.target).data('name') || $(event.target).data('period');
    var rendered = UI.render(Template.period_point);
    UI.insert(rendered, $("#schedule-period-" + clicked_name)[0]);
  },
  'click #edit-schedule-cancel': function(){
    Router.go("/schedule");
  },
  'click #edit-schedule-save': function(){
    var id = this._id;
    var periods = _.map($('.schedule-period'), function(p){
      rv = {};
      rv.name = $(p).find(".period-name").val();
      rv.start = $(p).find(".period-start").val();
      rv.points = _.map($(p).find(".period-point"), function(point){
        mypoint = {};
        mypoint.path = $(point).find('.period-point-name').val();
        mypoint.value = $(point).find('.period-point-value').val();
        return mypoint;
      });
      return rv; 
    });
    this.periods = periods;
    this.name = $('#schedule-name').val();
    delete this._id;

    var r = Schedules.update(id, {$set: this});
    if (r){
      Router.go("/schedule/");
    }
  },
  'click .remove-control-point': function(){
    $(event.target).closest('tr').remove();
  },
  'click .remove-period': function(){
    var name = $(event.target).data('name');
    $('#schedule-period-'+name).remove();
    $(event.target).closest('tbody').remove();
  }
});

Template.edit_schedule.rendered = function(){
  _.each(this.data.periods, function(p){
    var el_period = $('#schedule-period-'+p.name);
    var el_period_point_name = $(el_period).find(".period-point-name");
    var el_period_point_value = $(el_period).find(".period-point-value");
    _.each(_.zip(el_period_point_name, el_period_point_value, p.points), function(x){
      x[0].value = x[2].path;
      x[1].value = x[2].value;
    });
  });
};

Template.add_schedule.events({
  'click #add-period': function(event){
    iperiod++; 
    var rendered = UI.renderWithData(Template.schedule_period, {'iperiod': iperiod});
    UI.insert(rendered, $('table')[0]);
  },
  'click .add-control-point': function(event){
    var clicked_iperiod = $(event.target).data('period');
    var rendered = UI.render(Template.period_point);
    UI.insert(rendered, $("#schedule-period-" + clicked_iperiod)[0]);
  },
  'click #add-schedule-cancel': function(){
    Router.go("/schedule/");
  },
  'click #add-schedule-save': function(){
    var sched = {};
    var periods = _.map($('.schedule-period'), function(p){
      rv = {};
      rv.name = $(p).find(".period-name").val();
      rv.start = $(p).find(".period-start").val();
      rv.points = _.map($(p).find(".period-point"), function(point){
        mypoint = {};
        mypoint.path = $(point).find('.period-point-name').val();
        mypoint.value = $(point).find('.period-point-value').val();
        return mypoint;
      });
      return rv;
    });
    sched.periods = periods;
    sched.name = $('#schedule-name').val();
    sched.color = "#EBCACA";
    var r = Schedules.insert(sched);
    if (r){
      Router.go("/schedule/");
    }
  },
  'click .remove-control-point': function(){
    $(event.target).closest('tr').remove();
  },
  'click .remove-period': function(){
    var period = $(event.target).data('period');
    $('#schedule-period-'+period).remove();
    $(event.target).closest('tbody').remove();
  }
});

Template.view_schedule.helpers({
  getPathName: function(path){
    var mypath = _.find(OpenBAS.PathNames, function(p){
      return p.path == path;
    });
    return mypath.name;
  },
});
