Router.map(function() {
    this.route('home', {path: '/'});

    this.route('about');

    this.route('points');

    this.route('actuators');

    this.route('pointDetail', {
      path: '/points/:uuid',
      data: function() { return Points.findOne({uuid: this.params.uuid}); },
    });
  
    this.route('smap_plot', 
    {
        path: '/plot/:uuid?'         
    });
});
