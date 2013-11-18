var join = require('path').join,
    all = require('./all'),
    notifyNextTick = require('./notifyNextTick'),
    readFile = require('./readFile');

/**
 * Collects ignores in `path`
 * @param {String} path
 * @returns {Promise} fulfill(ignores: String[])
 */
module.exports = function (path) {
    var files = ['.npmignore', '.jshintignore'];

    files = files.map(function (name) {
        var dotIgnoreFile = join(path, name);
        return readFile(dotIgnoreFile).fail(function () {
            // Assume that file is empty
            return '';
        });
    });

    var promise = all(files);
    notifyNextTick(promise, 'Getting .*ignore files');

    return promise.then(function (ignores) {
        return ignores.reduce(function (list, ignore) {
            return list.concat(ignore.split('\n'));
        }, [])
        .filter(function (entry) {
            return !!entry;
        });
    });
};
