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
var ast = require('ast-query');
var pred = dom5.predicates;

var srcTagFinder = pred.AND(
  pred.hasTagName('wc-i18n-src'),
  pred.NOT(
    pred.hasAttr('src-locales')
  ),
  pred.hasAttr('locale-dir')
);

var scriptTagFinder = pred.AND(
  pred.hasTagName('script')
)

var slashRegex = /([^/]+$)/;
var localeRegex = /.*_([\w\-]+).json/;

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

var getTranslations = function(localePath, componentName) {
  var dfd = q.defer();

  glob(localePath + '/' + componentName + '_' + '*.json', function(err, files) {
    var srcLocales = files.map(fetchJSONContent).reduce(flattenArray, {});
    dfd.resolve(srcLocales);
  });

  return dfd.promise;
};

var wcI18nV1 = function(file, encoding, callback) {
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
        return getTranslations(localePath, componentName)
          .then(function(translations) {
            dom5.removeAttribute(el, 'locale-dir');
            dom5.setAttribute(el, 'src-locales', JSON.stringify(translations));
            return dom5.serialize(doc);
          })
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

var wcI18nV2 = function(file, encoding, callback) {
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
    var scripts = dom5.queryAll(doc, scriptTagFinder);
    // do stuff
    var promises = scripts.map(function(script) {
      return {
        script: script,
        text: dom5.getTextContent(script)
      }
    }).filter(function(jsStringObj) {
      return /\bWCI18n\b/.test(jsStringObj.text);
    }).map(function(jsStringObj) {
      return {
        script: jsStringObj.script,
        tree: ast(jsStringObj.text)
      };
    }).filter(function(treeObj) {
      return treeObj.tree.callExpression('WCI18n').length > 0;
    }).map(function(treeObj) {
      var componentName = treeObj.tree.callExpression('Polymer').arguments.at(0).key('is').value();
      return getTranslations(path.resolve(file.path, '../locales'), componentName).then(function(translations) {
        return {
          script: treeObj.script,
          tree: treeObj.tree,
          translations: translations
        }
      });
    }).filter(function(promises) {
      return !!promises;
    });

    Promise.all(promises)
      .then(function(i18nObjArray) {
        i18nObjArray.forEach(function(i18nObj) {
          var args = i18nObj.tree.callExpression('WCI18n').arguments;
          args.push(JSON.stringify(i18nObj.translations));
          dom5.setTextContent(i18nObj.script, i18nObj.tree.toString());
        });
      })
      .then(function() {
        return dom5.serialize(doc);
      })
      .then(function(contents) {
        file.contents = new Buffer(contents);
        this.push(file);
        return callback();
      }.bind(this));
  }
};

module.exports = function (config) {
  var version = config && config.version || 1;
  var handler = version === 2 ? wcI18nV2 : wcI18nV1;
  return through.obj(handler);
};
