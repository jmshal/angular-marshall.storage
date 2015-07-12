var manifest = require('./package.json'),
    gulp = require('gulp'),
    uglify = require('gulp-uglify');

gulp.task('minify', function () {
    return gulp.src(manifest.main)
        .pipe(uglify({
            preserveComments: 'some'
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', function () {
    gulp.watch(manifest.main, ['minify']);
});

gulp.task('default', ['minify', 'watch']);
