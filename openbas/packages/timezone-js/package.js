Package.describe({
  summary: "Provides timezone-js"
});

Package.on_use(function (api) {

  var path = Npm.require('path');
  var asset_path = path.join('.');
  api.add_files(path.join(asset_path, 'js', 'date.js'), 'client');
  
  api.export('timezoneJS');
});
