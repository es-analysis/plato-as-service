var vow = require('vow'),
    glob = require('glob'),
    join = require('path').join,
    notifyNextTick = require('./notifyNextTick');

/**
 * Collects all files in `path`
 * @param {String} path        extract path
 * @param {String} globPattern source url
 *
 * @returns {Promise} fulfill(files: String[])
 */
module.exports = function (path, globPattern) {
    var promise = vow.promise(),
        pattern = join(path, globPattern);

    notifyNextTick(promise, 'Collecting files, using ' + globPattern);

    glob(pattern, function(err, files) {
        if (err) {
            promise.reject(err);
        }
        promise.fulfill(files);
    });

    return promise;
};
