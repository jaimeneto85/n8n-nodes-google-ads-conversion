const gulp = require('gulp');

function buildIcons() {
	return gulp.src(['credentials/**/*.svg', 'nodes/**/*.svg'], { base: '.' })
		.pipe(gulp.dest('dist'));
}

exports['build:icons'] = buildIcons; 