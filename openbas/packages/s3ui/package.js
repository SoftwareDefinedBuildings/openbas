Package.describe({
  summary: "SMAP 3 UI - plotting tool"
});

Package.on_use(function (api) {
  api.use('jquery');
  api.use('vakata-jstree');
  api.use('jquery-simplecolorpicker');
  api.use('timezone-js');
  api.use('anytime');
  api.use('templating');
  api.use('newd3');

  var path = Npm.require('path');
  var asset_path = path.join('.');
  
  api.add_files(path.join(asset_path, 'img', 'openhand.cur'), 'client');
  api.add_files(path.join(asset_path, 'img', 'closedhand.cur'), 'client');
  api.add_files(path.join(asset_path, 'css', 's3ui.css'), 'client');
  api.add_files(path.join(asset_path, 'html', 's3ui.html'), 'client');
  api.add_files(path.join(asset_path, 'js', 's3ui.js'), 'client');
  api.add_files(path.join(asset_path, 'js', 'axis.js'), 'client');
  api.add_files(path.join(asset_path, 'js', 'data.js'), 'client');
  api.add_files(path.join(asset_path, 'js', 'utils.js'), 'client');
  api.add_files(path.join(asset_path, 'js', 'plot.js'), 'client');
  api.add_files(path.join(asset_path, 'js', 'frontend.js'), 'client');
  api.add_files(path.join(asset_path, 'js', 'control.js'), 'client');
  
  api.export('s3ui');
});
