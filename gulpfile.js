var gulp = require('gulp');
var fse = require('fs-extra');
var jshint = require('gulp-jshint');

gulp.task('clean', function(done) {
  fse.removeSync('dist');
  fse.mkdirSync('dist');
  done();
});

var ignore = ['!./dist/**', '!./node_modules/**', '!./coverage/**'];

gulp.task('lint', function() {
  return gulp.src(['**/*.js'].concat(ignore))
    .pipe(jshint({esnext: true}))
    .pipe(jshint.reporter('default', {esnext: true}));
});

gulp.task('default', ['clean', 'lint'], function() {
  return gulp
    .src(['static/*',
          'node_modules/localforage/dist/localforage.min.js',
          'node_modules/quagga/dist/quagga.min.js',
          'node_modules/bwip-js/bwip.js', 'node_modules/bwip-js/bwipp/code128.js', 'node_modules/bwip-js/bwipp/raiseerror.js', 'node_modules/bwip-js/bwipp/renlinear.js', 'node_modules/bwip-js/Inconsolata.otf', 'node_modules/bwip-js/freetype.js', 'node_modules/bwip-js/freetype.js.mem'])
    .pipe(gulp.dest('dist'));
});
