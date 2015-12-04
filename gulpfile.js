var gulp = require('gulp');
var fse = require('fs-extra');
var jshint = require('gulp-jshint');

gulp.task('clean', function(done) {
  fse.removeSync('dist');
  fse.mkdirSync('dist');
  done();
});

gulp.task('lint', function() {
  return gulp.src(['./*.js', './*/*.js'])
    .pipe(jshint({esnext: true}))
    .pipe(jshint.reporter('default', {esnext: true}));
});

gulp.task('default', ['clean', 'lint'], function() {
  return gulp
    .src(['static/*', 'node_modules/localforage/dist/localforage.min.js'])
    .pipe(gulp.dest('dist'));
});
