var ignore = require('ignore'),
    readFile = require('./readFile'),
    firstDir = require('./firstDir'),
    join = require('path').join,
    notifyNextTick = require('./notifyNextTick'),
    getIgnores = require('./getIgnores'),
    collectFiles = require('./collectFiles'),
    all = require('./all');

/**
 * Promisefied fs.readFile + JSON.parse
 * @param {String} file
 * @returns {Promise} fulfill(contents: Object)
 */
function readJSON(file) {
    return readFile(file).then(function (contents) {
        return JSON.parse(contents);
    });
}

/**
 * Reads .jshintrc in `path` and returns `defaults` if not found
 * @param {String} path
 * @param {Object} [defaults={}]
 * @returns {Promise} fulfill(contents: Object)
 */
function readDotJsHintRc(path, defaults) {
    var dotJsHintRc = join(path, '.jshintrc');

    var promise = readJSON(dotJsHintRc);

    notifyNextTick(promise, 'Reading .jshintrc');

    return promise.fail(function () {
        return defaults || {};
    });
}

/**
 * @param {String} path
 * @param {String} resultsDir
 * @returns {Promise} fulfill(options: Object)
 */
module.exports = function (path, resultsDir) {
    return firstDir(path)
        .then(function (path) {
            return all([
                collectFiles(path, '**/*.js'),
                readDotJsHintRc(path),
                getIgnores(path)
            ]);
        })
        .spread(function(files, jshint, ignores) {
            var exclude = ignore().addPattern(ignores);
            files = files.filter(exclude.createFilter());

            return {
                files: files,
                result: resultsDir,
                options: {
                    jshint: jshint,
                    complexity: {
                        newmi: true,
                        logicalor: false,
                        switchcase: false,
                        forin: true,
                        trycatch: true
                    }
                }
            };
        });
};
