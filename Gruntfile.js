'use strict';

module.exports = function(grunt) {
    var stylesheets = __dirname + '/static/css/';
    var javascripts = __dirname + '/static/js/';
    var vendors = __dirname + '/static/vendors/';

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        watch: {
            js: {
                files: [javascripts + 'js/**/*.js'],
                tasks: ['js']
            },

            css: {
                files: [stylesheets + 'css/**/*.css'],
                tasks: ['css']
            }
        },

        csso: {
            index: {
                options: {
                    report: 'min'
                },
                files: {
                    './www/_index.css': [
                        // Foundation's CSS
                        vendors + 'foundation/css/normalize.css',
                        vendors + 'foundation/css/foundation.css',
                        // All our CSS
                        stylesheets + '**/*.css'
                    ]
                }
            }
        },

        concat: {
            index: {
                src: [
                    // Vendors JS
                    vendors + 'foundation/js/vendor/custom.modernizr.js',
                    vendors + 'jquery/jquery.min.js',
                    vendors + 'underscore/underscore-min.js',
                    vendors + 'foundation/js/foundation.min.js',
                    // All our JS
                    javascripts + 'progress-logger.js',
                    javascripts + 'common.js'
                ],
                dest: './www/_index.js'
            }
        },

        concurrent: {
            all: ['css', 'js']
        }
    });

    // Load tesks
    require('load-grunt-tasks')(grunt);

    // Default task
    grunt.registerTask('css', ['csso']);
    grunt.registerTask('js', ['concat']);

    // Release task
    grunt.registerTask('default', ['concurrent:all']);
};
