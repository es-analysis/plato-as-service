var fs = require('fs'),
    vow = require('vow'),
    join = require('path').join;

/**
 * Returns first dir in `path`
 * @param {String} path
 * @returns {Promise} fulfill(path: String)
 */
module.exports = function (path) {
    var promise = vow.promise();

    fs.readdir(path, function (err, paths) {
        if (err) {
            promise.reject(err);
        }

        promise.fulfill(join(path, paths[0]));
    });

    return promise;
};
