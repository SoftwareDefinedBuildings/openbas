Package.describe({
  summary: "S3UI::jquery-simplecolorpicker"
});

Package.on_use(function (api) {
  api.use('jquery');

  var path = Npm.require('path');
  var asset_path = path.join('.');
  api.add_files(path.join(asset_path, 'css', 'jquery.simplecolorpicker.css'), 'client');
  api.add_files(path.join(asset_path, 'css', 'jquery.simplecolorpicker-fontawesome.css'), 'client');
  api.add_files(path.join(asset_path, 'css', 'jquery.simplecolorpicker-glyphicons.css'), 'client');
  api.add_files(path.join(asset_path, 'css', 'jquery.simplecolorpicker-regularfont.css'), 'client');
  api.add_files(path.join(asset_path, 'js', 'jquery.simplecolorpicker.js'), 'client');
  
});
