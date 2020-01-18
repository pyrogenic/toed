/// <reference types="gulp" />
/// <reference types="gulp-typescript" />

const gulp = require('gulp');
const gulpTypescript = require('gulp-typescript');

const OUT_DIR = 'srv';
const JSON_FILES = ['src/**/*.json'];

// pull in the project TypeScript config
const tsProject = gulpTypescript.createProject('tsconfig.srv.json');

gulp.task('build-srv', () => {
  const tsResult = tsProject.src()
    .pipe(tsProject());
  return tsResult.js.pipe(gulp.dest(OUT_DIR));
});

gulp.task('build-json', () => {
  return gulp.src(JSON_FILES)
    .pipe(gulp.dest(OUT_DIR));
});

gulp.task('watch-ts', () => gulp.watch('src/**/*.ts', ['build-srv']));
gulp.task('watch-json', () => gulp.watch(JSON_FILES, ['build-json']));

gulp.task('watch', gulp.parallel([
  'watch-ts',
  'watch-json',
]));

