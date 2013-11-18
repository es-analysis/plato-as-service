var vow = require('vow'),
    tmp = require('tmp'),
    notifyNextTick = require('./notifyNextTick');

tmp.setGracefulCleanup();

/**
 * @returns {Promise} fulfill(path: String)
 */
module.exports = function () {
    var promise = vow.promise();

    notifyNextTick(promise, 'Creating tmp dir');

    tmp.dir(function(err, path) {
        if (err) {
            promise.reject(err);
        }

        promise.fulfill(path);
    });

    return promise;
};
