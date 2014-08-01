Package.describe({
  summary: "Provides vakata-jstree"
});

Package.on_use(function (api) {

  var path = Npm.require('path');
  var asset_path = path.join('.');
  api.add_files(path.join(asset_path, 'themes', 'default', '32px.png'), 'client');
  api.add_files(path.join(asset_path, 'themes', 'default', 'style.min.css'), 'client');
  api.add_files(path.join(asset_path, 'themes', 'default', '40px.png'), 'client');
  api.add_files(path.join(asset_path, 'themes', 'default', 'throbber.gif'), 'client');
  api.add_files(path.join(asset_path, 'libs', 'require.js'), 'client');
  api.add_files(path.join(asset_path, 'jstree.min.js'), 'client');
  api.add_files(path.join(asset_path, 'libs', 'jquery.js'), 'client');
});
