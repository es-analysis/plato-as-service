var vow = require('vow'),
    plato = require('plato');

/**
 * Inspects `files` using plato and writes result to `report` dir
 * @param {String[]} files   files to inspect
 * @param {String}   report  results dir
 * @param {Object}   options
 * @returns {Promise}
 */
module.exports = function (files, report, options) {
    var promise = vow.promise();

    process.nextTick(function () {
        promise.notify('Generating report. It make take up to minute.');

        try {
            plato.inspect(files, report, options, function (reports) {
                promise.fulfill(reports);
            });
        } catch (e) {
            promise.reject(e);
        }
    });

    return promise;
};
