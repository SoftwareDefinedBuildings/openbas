Package.describe({
  summary: "Provides timezone-js"
});

Package.on_use(function (api) {
  var path = Npm.require('path');
  var asset_path = path.join('.');
  api.add_files(path.join(asset_path, 'tz', 'africa'), 'client');
  api.add_files(path.join(asset_path, 'tz', 'antarctica'), 'client');
  api.add_files(path.join(asset_path, 'tz', 'asia'), 'client');
  api.add_files(path.join(asset_path, 'tz', 'australasia'), 'client');
  api.add_files(path.join(asset_path, 'tz', 'backward'), 'client');
  api.add_files(path.join(asset_path, 'tz', 'etcetera'), 'client');
  api.add_files(path.join(asset_path, 'tz', 'europe'), 'client');
  api.add_files(path.join(asset_path, 'tz', 'northamerica'), 'client');
  api.add_files(path.join(asset_path, 'tz', 'pacificnew'), 'client');
  api.add_files(path.join(asset_path, 'tz', 'southamerica'), 'client');
  api.add_files(path.join(asset_path, 'js', 'date.js'), 'client');
  api.add_files(path.join(asset_path, 'js', 'init.js'), 'client');
  
  api.export('timezoneJS');
});
