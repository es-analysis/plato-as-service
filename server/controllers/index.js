var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    vow = require('vow'),
    createReport = require('../../lib/createReport');

var REPORTS_DIR = path.join(__dirname, '..', '..', 'reports'),
    REPORT_TTL = 60 * 15 * 1000;

function isReportFresh(options) {
    var promise = vow.promise();
    var file = path.join(REPORTS_DIR, options.user, options.repo, options.branch, 'report.history.json');

    fs.stat(file, function (err, stats) {
        // file is not exists
        if (err) {
            return promise.fulfill(false);
        }
        var now = new Date(),
            isFresh = (+now - +stats.mtime) < REPORT_TTL;

        if (isFresh) {
            promise.notify('Report is fresh. Next instrumentation ' + new Date(+stats.mtime + REPORT_TTL));
        }
        promise.fulfill(isFresh);
    });

    return promise;
}

exports.index = function (req, res, next) {
    isReportFresh(req.params)
        .then(function (isFresh) {
            if (isFresh) {
                return;
            }
            return createReport(req.params);
        })
        .progress(console.log)
        .fail(next)
        .then(function () {
            next();
        });
};

exports.redirectToMaster = function (req, res) {
    res.redirect('/' + req.params.user + '/' + req.params.repo + '/master/');
};

exports.usage = function (req, res) {
    res.send(
        '<pre>' +
            'Usage /:user/:repo/:branch/ ' +
            'Example <a href="/azproduction/plato-as-service/master/">/azproduction/plato-as-service/master/</a>' +
        '</pre>'
    );
};
