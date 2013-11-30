var vow = require('vow'),
    request = require('request'),
    notifyNextTick = require('./notifyNextTick'),
    Extract = require('unzip').Extract;

/**
 * @param {String} zipUrl source url
 * @param {String} path   extract path
 * @returns {Promise} fulfill(path: String)
 */
module.exports = function (zipUrl, path) {
    var promise = vow.promise();

    var unzip = new Extract({
        path: path
    });

    unzip.on('close', function () {
        promise.fulfill(path);
    });
    unzip.on('error', promise.reject.bind(promise));

    notifyNextTick(promise, 'Downloading zip ' + zipUrl);

    var zip = request(zipUrl);
    var length = 0;
    zip.on('data', function (chunk) {
        length += chunk.length;
        promise.notify('Downloading zip ' + (length / 1024 / 1024).toFixed(2) + 'Mb');
    });
    zip.on('end', function () {
        promise.notify('Extracting zip');
    });
    zip.pipe(unzip);

    return promise;
};
