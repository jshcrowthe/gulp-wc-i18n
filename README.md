gulp-wc-i18n [![Build Status](https://travis-ci.org/jshcrowthe/gulp-wc-i18n.svg?branch=master)](https://travis-ci.org/jshcrowthe/gulp-wc-i18n)
-----------------------

This is the production build pipeline for use with the [wc-i18n](https://github.com/jshcrowthe/wc-i18n) component. This step will parse HTML files looking for `wc-i18n-src` tags with the `locale-dir` property set to `[[localeDir()]]` or ``{{localeDir()}}``.

With all of the discovered files, the corresponding locale files will be inlined so no request is made for the locale files.

## Example Usage
```javascript
var gulp = require('gulp');
var wcI18n = require('gulp-wc-i18n');

gulp.task('webcomponent:i18n', function() {
  return gulp.src('**/*.html')
    .pipe(wcI18n())
    .pipe(gulp.dest('./dist'));
});
```

## License
MIT
