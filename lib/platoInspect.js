var vow = require('vow'),
    plato = require('plato'),
    notifyNextTick = require('./notifyNextTick');

/**
 * Inspects `files` using plato and writes result to `report` dir
 * @param {String[]} files   files to inspect
 * @param {String}   report  results dir
 * @param {Object}   options
 * @returns {Promise}
 */
module.exports = function (files, report, options) {
    var promise = vow.promise();

    notifyNextTick(promise, 'Generating report');

    plato.inspect(files, report, options, function (reports) {
        promise.fulfill(reports);
    });

    return promise;
};
