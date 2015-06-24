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

Router.onBeforeAction(function(){
  if (!(Meteor.loggingIn() || Meteor.user())) {
    this.render('login');
    pause();
  } 
});

Router.map(function() {
    this.route('dashboard', {
      path: '/',
      waitOn: function() {
        return [
          Meteor.subscribe('schedules'),
          Meteor.subscribe('master_schedule'),
          Meteor.subscribe('points'),
          Meteor.subscribe('hvac'),
          Meteor.subscribe('lighting'),
          Meteor.subscribe('monitoring')
        ];
      },  
      action: function () {
        if (this.ready()){ 
          this.render();
        } else {
            this.render('loading');
        } 
      }
    });

    this.route('schedule', {
      waitOn: function(){
        return [
          Meteor.subscribe('schedules'),
          Meteor.subscribe('master_schedule')
        ];
      },
    });
    
    this.route('status', {
      onBeforeAction: function() {
        Meteor.call('querysystem');
        this.subscribe('hvac').wait();
        this.subscribe('monitoring').wait();
        this.subscribe('lighting').wait();
        this.subscribe('points').wait();
        this.subscribe('unconfigured').wait();
        this.subscribe('site').wait();
      },
    });

    this.route('points');
    this.route('about');
    this.route('plot');
    
    this.route('zone_detail', {
      path: '/dashboard/:zonetype/:zone',
      waitOn: function() {
        return [
          Meteor.subscribe('points'),
          Meteor.subscribe('hvac'),
          Meteor.subscribe('lighting'),
          Meteor.subscribe('monitoring')
        ];
      },
      data: function() { 
        if (this.params.zonetype == 'hvac') {
          return {'type': 'hvac', 'points': HVAC.find({'hvaczone': this.params.zone}).fetch()};
        } else if (this.params.zonetype == 'lighting') {
          return {'type': 'lighting', 'points': Lighting.find({'lightingzone': this.params.zone}).fetch()};
        } else {
          return 0
        }
      }
    });

    this.route('room_detail', {
      path: '/room/:room',
      data: function(){
        return {
          'room': Rooms.findOne({'RoomNumber': this.params.room}),
          'general_controllers': GeneralControl.find({'room': this.params.room}) };
        }
    });

    this.route('pointDetail', {
      path: '/points/:uuid',
      data: function() { return Points.findOne({uuid: this.params.uuid}); },
    });
    
    this.route('view_schedule', {
      path: '/schedule/view/:id',
      data: function() { return Schedules.findOne({_id: this.params.id}); },
    });
    
    this.route('edit_schedule', {
      path: '/schedule/edit/:id',
      data: function() { return Schedules.findOne({_id: this.params.id}); },
    });
    
    this.route('add_schedule', {
      path: '/schedule/add',
      data: {'iperiod': 0},
    });

    this.route('building', {
      waitOn: function(){
        return [Meteor.subscribe("rooms"), Meteor.subscribe("floorplans")];
      },
    });

    this.route('add_room', {
      path: '/building/add_room', 
      waitOn: function(){
        return [Meteor.subscribe("rooms"), Meteor.subscribe("floorplans")];
      }
    });

    this.route('edit_room', {
      path: '/building/edit_room/:id',
      data: function() { return Rooms.findOne({_id: this.params.id}); },
      waitOn: function(){
        return [Meteor.subscribe("rooms"), Meteor.subscribe("floorplans")];
      }
    });

    this.route('view_room', {
      path: '/building/view_room/:id',
      data: function(){ 
        return Rooms.findOne({_id: this.params.id})
      },
    });

});

Router._filters = {
  resetScroll: function () {
    var scrollTo = window.currentScroll || 0;
    $('body').scrollTop(scrollTo);
    $('body').css("min-height", 0);
  }
};

var filters = Router._filters;

if(Meteor.isClient) {
  Router.onAfterAction(filters.resetScroll); // for all pages
}
