import gulp from 'gulp';
import mainBowerFiles from 'main-bower-files';
import babel from 'gulp-babel';
import concat from 'gulp-concat';
var scripts = [
            'src/geometry.js',
            'src/vectorizer.js',
            'src/core.js',
            'src/cell.js',
            'src/element.js',
            'src/link.js',
            'src/graph.js',
            'src/shape/shape.basic.js',
            'src/paper.js',
            'src/chart.js',
            'src/connectors/connectors.normal.js'];

var plugins = [
            'src/shape/shape.devs.js',
            'src/shape/shape.node.js',
            'src/shape/shape.simple.js',
            'src/shape/shape.uml.state.js',
            'src/shape/shape.node_red.js'
];
gulp.task('js', ()=>{
  gulp.src(scripts.concat(plugins))
      .pipe(concat('joint_chart.js'))
      .pipe(gulp.dest('dist'))
});

gulp.task('bower', ()=>{
  gulp.src(mainBowerFiles())
      .pipe(gulp.dest('dist'))
})


