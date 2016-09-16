var fs = require('fs');
var assert = require('stream-assert');
var expect = require('chai').expect;
var File = require('vinyl');
var wcI18n = require('../');
var StreamFactory = require('./test-stream.js');
var path = require('path');

describe('gulp-wc-i18n', function() {
  it('should properly inject all locale files (if available)', function(done) {
    var stream = StreamFactory('demo-comp');
    stream.pipe(wcI18n())
    .pipe(assert.first(function(d) { 
      var contents = d.contents.toString().trim();
      var expected = fs.readFileSync(path.join(__dirname, './outFiles/demo-comp.html'), 'utf8').trim();
      expect(contents).to.equal(expected);
    }))
    .pipe(assert.end(done));
  });

  it('should inject empty object (if locales unavailable)', function(done) {
    var stream = StreamFactory('bad-comp');
    stream.pipe(wcI18n())
    .pipe(assert.first(function(d) { 
      var contents = d.contents.toString().trim();
      var expected = fs.readFileSync(path.join(__dirname, './outFiles/bad-comp.html'), 'utf8').trim();
      expect(contents).to.equal(expected);
    }))
    .pipe(assert.end(done));
  });

  it('should properly inject all locale files (if available)', function(done) {
    var stream = StreamFactory('v2-comp');
    stream.pipe(wcI18n({
      version: 2
    }))
    .pipe(assert.first(function(d) { 
      var contents = d.contents.toString().trim();
      var expected = fs.readFileSync(path.join(__dirname, './outFiles/v2-comp.html'), 'utf8').trim();
      expect(contents).to.equal(expected);
    }))
    .pipe(assert.end(done));
  });
});