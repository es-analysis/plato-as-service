var Route = require('susanin').Route,
    fs = require('fs'),
    join = require('path').join,
    mkdirp = require('mkdirp'),
    _ = require('lodash'),
    vow = require('vow'),
    all = require('./all'),
    platoOptions = require('./platoOptions'),
    platoInspect = require('./platoInspect'),
    tmpDir = require('./tmpDir'),
    extractTo = require('./extractTo');

/**
 *
 * @param {Object} [options]
 * @param {String} [options.hostname]
 * @param {String} [options.reports]
 * @param {Number} [options.ttl]
 * @param {Object} query
 * @param {String} query.user
 * @param {String} query.repo
 * @param {String} query.branch
 * @constructor
 */
function ReportGenerator(options, query) {
    this.options = _.defaults(options || {}, {
        hostname: 'github.com',
        reports: join(__dirname, '..', 'reports'),
        ttl: 60 * 15 * 1000
    });

    this.query = query || {};

    this.router = new Route({
        pattern: 'https://' + this.options.hostname + '/<user>/<repo>/archive/<branch>.zip',
        defaults: {
            branch: 'master'
        }
    });
}

ReportGenerator.pendingRequests = {};

ReportGenerator.prototype = {
    /**
     * Creates report
     * @returns {Promise}
     */
    create: function () {
        var self = this,
            pendingRequests = ReportGenerator.pendingRequests,
            key = this.cacheKey(),
            pendingRequest = pendingRequests[key];

        if (pendingRequest) {
            return pendingRequest;
        }

        pendingRequest = self._create();

        pendingRequest.always(function () {
            delete pendingRequests[key];
        });

        return pendingRequests[key] = pendingRequest;
    },
    /**
     * @return {String}
     */
    cacheKey: function () {
        var query = this.query;
        return [query.user, query.repo, query.branch].join('/');
    },
    /**
     * @private
     * @returns {Promise}
     */
    _create: function () {
        var self = this;

        return tmpDir()
            .then(function (tmpDir) {
                return all([
                    extractTo(self.buildZipUrl(), tmpDir),
                    self.makeResultsDir()
                ]);
            })
            .spread(function (tmpDir, resultsDir) {
                return platoOptions(tmpDir, resultsDir);
            })
            .then(function (options) {
                return platoInspect(options.files, options.result, options.options);
            });
    },
    /**
     * Creates result dir using `query`
     */
    makeResultsDir: function () {
        var query = this.query;
        var promise = vow.promise();

        var resultsDir = join(this.options.reports, query.user, query.repo, query.branch);

        mkdirp(resultsDir, function (err) {
            if (err) {
                promise.reject(err);
            }

            promise.fulfill(resultsDir);
        });

        return promise;
    },
    /**
     * Creates plato report for `query.user`/`query.repo` github repository
     * @returns {Promise}
     */
    isFresh: function () {
        var query = this.query;
        var ttl = this.options.ttl;
        var promise = vow.promise();
        var file = join(this.options.reports, query.user, query.repo, query.branch, 'report.history.json');

        fs.stat(file, function (err, stats) {
            // file is not exists
            if (err) {
                return promise.fulfill(false);
            }
            var now = new Date(),
                isFresh = (Number(now) - Number(stats.mtime)) < ttl;

            if (isFresh) {
                promise.notify('Report is fresh. Next instrumentation ' + new Date(Number(stats.mtime) + ttl));
            }
            promise.fulfill(isFresh);
        });

        return promise;
    },
    /**
     * @returns {boolean}
     */
    isPending: function () {
        var pendingRequests = ReportGenerator.pendingRequests,
            key = this.cacheKey();

        return !!pendingRequests[key];
    },
    buildZipUrl: function () {
        return this.router.build(this.query);
    }
};

module.exports = ReportGenerator;
