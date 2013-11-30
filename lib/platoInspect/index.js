var vow = require('vow'),
    notifyNextTick = require('../notifyNextTick'),
    fork = require('child_process').fork,
    path = require('path');

var workerFile = path.join(__dirname, 'worker.js');

function censor(data, report) {
    return data.trim().replace(report, '');
}

/**
 * Inspects `files` using plato and writes result to `report` dir
 * @param {String[]} files   files to inspect
 * @param {String}   report  results dir
 * @param {Object}   options
 * @returns {Promise}
 */
module.exports = function (files, report, options) {
    var promise = vow.promise();

    notifyNextTick(promise, 'Generating report. It may take up to a minute.');
    var args = [JSON.stringify([files, report, options])];
    var processOptions = {
        silent: true
    };
    var plato = fork(workerFile, args, processOptions);

    // Forward messages to promise
    ['stdout'].forEach(function (stdio) {
        if (!plato[stdio]) {
            return;
        }
        plato[stdio].setEncoding('utf8');
        plato[stdio].on('data', function (data) {
            promise.notify(censor(data, report));
        });
    });

    plato.once('exit', function (code) {
        if (code === 0) {
            promise.fulfill();
        } else {
            promise.reject('Report generator exited with code ' + code);
        }
    });

    return promise;
};
