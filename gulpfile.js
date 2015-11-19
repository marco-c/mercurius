var gulp = require('gulp');
var fse = require('fs-extra');

gulp.task('clean', function(done) {
  fse.removeSync('dist');
  fse.mkdirSync('dist');
  done();
});

gulp.task('default', ['clean'], function() {
  return gulp
    .src(['static/*', 'node_modules/localforage/dist/localforage.min.js'])
    .pipe(gulp.dest('dist'));
});
