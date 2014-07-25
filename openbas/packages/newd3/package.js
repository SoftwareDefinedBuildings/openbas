Package.describe({
  summary: "S3UI::d3 - new D3 package"
});

Package.on_use(function (api) {
  var path = Npm.require('path');
  var asset_path = path.join('.');
  api.add_files(path.join(asset_path, 'js', 'd3.js'), 'client');
  api.export('d3');
});
