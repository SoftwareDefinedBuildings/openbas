Package.describe({
  summary: "Provides vakata-jstree"
});

Package.on_use(function (api) {

  var path = Npm.require('path');
  var asset_path = path.join('vakata-jstree');
  api.add_files(path.join(asset_path, 'js', 'require.js'), 'client');
  api.add_files(path.join(asset_path, 'js', 'jstree.js'), 'client');
  api.add_files(path.join(asset_path, 'img', '32px.png'), 'client');
  api.add_files(path.join(asset_path, 'css', 'style.css'), 'client');
  api.add_files(path.join(asset_path, 'img', '40px.png'), 'client');
  api.add_files(path.join(asset_path, 'img', 'throbber.gif'), 'client');
  
});
