var gulp = require('gulp');
var fse = require('fs-extra');

gulp.task('clean', function(done) {
  fse.removeSync('dist');
  fse.mkdirSync('dist');
  done();
});

gulp.task('default', ['clean'], function() {
  return gulp
    .src('static/*')
    .pipe(gulp.dest('dist'));
});
