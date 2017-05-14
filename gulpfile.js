var gulp = require('gulp')
var sass = require('gulp-sass')
var nodemon = require('gulp-nodemon')
var browserSync = require('browser-sync').create()

var reload = browserSync.reload

gulp.task('default', ['sass', 'browser-sync'], function() {
	gulp.watch('public/scss/*.scss', ['sass'], reload)
	gulp.watch(['views/**/*.pug', 'public/js/*.js', 'routes/**/*.js'], reload)
})

// SASS Compiler
gulp.task('sass', function() {
	gulp.src('./public/scss/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest('./public/css/'))
		.pipe(reload({
			stream: true
		}))
})

// BrowserSync
gulp.task('browser-sync', ['nodemon'], function() {
	browserSync.init(null, {
		proxy: 'http://localhost:8080',
		port: 3000,
		reloadDelay: 1000
	})
})

gulp.task('nodemon', function(cb) {
	var called = false
	return nodemon({
		script: 'app.js',
		ignore: [
			'gulpfile.js',
			'node_modules/'
		]
	})
	.on('start', function() {
		if (!called) {
			called = true
			cb()
		}
	})
	.on('restart', function() {
		setTimeout(function() {
			reload({
				stream: false
			})
		}, 100)
	})
})
