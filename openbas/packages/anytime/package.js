Package.describe({
  summary: "S3UI::AnyTime"
});

Package.on_use(function (api) {
  api.use('jquery');

  var path = Npm.require('path');
  var asset_path = path.join('.');
  api.add_files(path.join(asset_path, 'js', 'anytime.5.0.3.js'), 'client');
  api.add_files(path.join(asset_path, 'css', 'anytime.5.0.3.css'), 'client');
  api.export('AnyTime');
});
