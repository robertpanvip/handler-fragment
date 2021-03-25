const gulp = require('gulp');
const babel = require('gulp-babel');
const ts = require('gulp-typescript');
//错误处理提示插件
const plumber = require('gulp-plumber');
const logger = require('gulp-logger');
const { runTask,deleteFolder } = require("./util");
const tsconfig = require('../../tsconfig.json');

module.exports = function () {
    gulp.task('clean', async (done) => {
        await deleteFolder('../../lib');
        done()
    });
    gulp.task('compile-tsd', () => {
        return gulp.src([
            '../../src/**/**/*.tsx',
            '../../src/**/**/*.ts',
            '!../../src/**/**/__test__/**',
        ]).pipe(logger({
            before: 'generate tsd...',
            after: 'generate tsd complete!',
            extname: '.ts',
            showChange: true
        }))
            .pipe(ts(tsconfig.compilerOptions))
            .dts
            .pipe(logger({
                before: 'write tsd ...',
                after: 'write tsd complete!',
                extname: '.ts',
                showChange: true
            }))
            .pipe(plumber())
            .pipe(gulp.dest('../../lib'));
    });

    gulp.task('compile-with-lib', () => {

        return gulp.src([
            '../../src/**/**/*.tsx',
            '../../src/**/**/*.ts',
            '!../../src/**/**/__test__/**',
        ])
            .pipe(logger({
                before: 'Starting translate ...',
                after: 'translate complete!',
                extname: '.js',
                showChange: true
            }))
            .pipe(babel({
                "presets": [
                    [
                        "@babel/preset-env",
                        {
                            "targets": {
                                "chrome": "58",
                                "ie": "9"
                            }
                        }
                    ],
                    [
                        "@babel/preset-react"
                    ],
                    [
                        "@babel/preset-typescript",
                        {
                            "isTSX": true,
                            "allExtensions": true
                        }
                    ]
                ],
                "plugins": [
                    [
                        "@babel/plugin-proposal-decorators",
                        {
                            "legacy": true
                        }
                    ],
                    [
                        "@babel/plugin-proposal-class-properties",
                        {
                            "loose": true
                        }
                    ],
                    [
                        "@babel/plugin-transform-runtime"
                    ],
                ]
            }))
            .pipe(plumber())
            .pipe(logger({
                before: 'write js ...',
                after: 'write js complete!',
                extname: '.js',
                showChange: true
            }))
            .pipe(gulp.dest('../../lib'))
    });
    gulp.task(
        'compile',
        gulp.series('clean', gulp.parallel('compile-with-lib', 'compile-tsd'))
    );
    runTask('compile')
};
