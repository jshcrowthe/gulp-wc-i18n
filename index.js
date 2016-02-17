// SETUP DEPENDENCIES/CONSTANTS
var through = require("through2");
var gutil = require("gulp-util");
var PluginError = gutil.PluginError;
var PLUGIN_NAME = 'gulp-fs-i18n-src';
var glob = require('glob');
var dom5 = require('dom5');
var path = require('path');
var fs = require('fs');
var q = require('q');
var pred = dom5.predicates;

var srcTagFinder = pred.AND(
  pred.hasTagName('wc-i18n-src'),
  pred.NOT(
    pred.hasAttr('src-locales')
  ),
  pred.hasAttr('locale-dir')
);

var slashRegex = /([^/]+$)/;
var localeRegex = /.*_(\w{2}).json/;

var flattenArray = function(obj, val) {
  Object.keys(val).forEach(function(key) {
    obj[key] = val[key];
  });
  return obj;
};

var fetchJSONContent = function(file) {
  var returnObj = {};
  var locale = file.match(slashRegex)[1].match(localeRegex)[1];
  var contents = fs.readFileSync(file, 'utf-8');
  if (contents) {
    contents = JSON.parse(contents);
  }
  returnObj[locale] = contents;
  return returnObj;
};

var getNewContents = function(localePath, componentName, doc, el) {
  var dfd = q.defer();

  glob(localePath + '/' + componentName + '_' + '*.json', function(err, files) {
    var srcLocales = files.map(fetchJSONContent);
    dom5.removeAttribute(el, 'locale-dir');
    dom5.setAttribute(el, 'src-locales', JSON.stringify(srcLocales.reduce(flattenArray, {})));
    dfd.resolve(dom5.serialize(doc));
  });

  return dfd.promise;
};

module.exports = function () {
  var newline = gutil.linefeed;
   var buildClosure = function() {
     return function(file, encoding, callback) {
      if (file.isNull()) {
        this.push(file);
        return callback();        
      }

      if (file.isStream()) {
        this.emit('error', new PluginError(PLUGIN_NAME, PLUGIN_NAME + ': Streaming not supported'));
        return callback();
      }

      if (file.isBuffer()) {
        var doc = dom5.parseFragment(String(file.contents));
        var el = dom5.query(doc, srcTagFinder)
        if (el) {
          var componentName = dom5.getAttribute(el, 'domain');
          var locationAttr = dom5.getAttribute(el, 'locale-dir');
          var localePath = (locationAttr === '[[localeDir()]]' || locationAttr === '{{localeDir()}}') ? path.resolve(file.path, '../locales') : null;
          if (localePath) {
            return getNewContents(localePath, componentName, doc, el)
              .then(function(contents) {
                file.contents = new Buffer(contents);
                this.push(file);
                return callback();
              }.bind(this));
          }
        }
      }
      this.push(file);
      return callback();
    };
  };

  return through.obj(buildClosure());
};