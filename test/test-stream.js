var fs = require('fs');
var streamify = require('stream-array');
var path = require('path');
var File = require('gulp-util').File;

module.exports = function (fileName) {
  var file = new File({
    base: path.join(__dirname, './' + fileName + '/'),
    cwd: __dirname,
    path: path.join(__dirname, './' + fileName + '/' + fileName + '.html'),
    contents: new Buffer(fs.readFileSync(path.join(__dirname, './' + fileName + '/' + fileName + '.html'), 'utf8'))
  });

  return streamify([file]);
};