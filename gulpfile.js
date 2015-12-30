var gulp = require('gulp');
var fse = require('fs-extra');
var jshint = require('gulp-jshint');
var oghliner = require('oghliner');

gulp.task('clean', function() {
  fse.removeSync('dist');
  fse.mkdirSync('dist');
});

var ignore = ['!./dist/**', '!./node_modules/**', '!./coverage/**'];

gulp.task('lint', function() {
  return gulp.src(['**/*.js'].concat(ignore))
    .pipe(jshint({esnext: true}))
    .pipe(jshint.reporter('default', {esnext: true}));
});

gulp.task('build', function() {
  return gulp
  .src([
    'static/*',
    // localForage
    'node_modules/localforage/dist/localforage.min.js',
    // QuaggaJS
    'node_modules/quagga/dist/quagga.min.js',
    // bwip-js
    'node_modules/bwip-js/bwip.js', 'node_modules/bwip-js/bwipp/code128.js', 'node_modules/bwip-js/bwipp/raiseerror.js', 'node_modules/bwip-js/bwipp/renlinear.js', 'node_modules/bwip-js/freetype.js', 'node_modules/bwip-js/freetype.js.mem',
  ])
  .pipe(gulp.dest('dist'));
});

gulp.task('default', ['clean', 'lint', 'build'], function() {
  return oghliner.offline({
    rootDir: 'dist/',
    importScripts: ['sw-push.js'],
  });
});
