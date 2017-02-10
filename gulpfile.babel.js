import gulp from 'gulp';
import mainBowerFiles from 'main-bower-files';
import babel from 'gulp-babel';
import concat from 'gulp-concat';

gulp.task('js', ()=>{
  gulp.src('src/**/*.js')
      .pipe(gulp.dest('dist'))
});

gulp.task('bower', ()=>{
  gulp.src(mainBowerFiles())
      .pipe(gulp.dest('dist'))
})


