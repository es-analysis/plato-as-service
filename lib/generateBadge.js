var Route = require('susanin').Route,
    fs = require('fs'),
    vow = require('vow'),
    request = require('request'),
    notifyNextTick = require('./notifyNextTick');

var router = new Route({
    pattern: 'http://<hostname>/<name>/<value>%20.png'
});

/**
 *
 * @param {Object} options
 * @param {String} options.hostname
 * @param {String} options.name
 * @param {String} options.value
 * @param {String} [options.color]
 * @param {String} path
 * @returns {*}
 */
module.exports = function (options, path) {
    var promise = vow.promise(),
        pngUrl = router.build(options);

    notifyNextTick(promise, 'Downloading badge ' + pngUrl);

    var zip = request(pngUrl);
    zip.on('error', function () {
        promise.reject();
    });

    var writer = fs.createWriteStream(path);
    writer.on('close', function () {
        promise.fulfill();
    });

    zip.pipe(writer);

    return promise;
};
