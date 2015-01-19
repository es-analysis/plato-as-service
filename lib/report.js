var Route = require('susanin').Route,
    fs = require('fs'),
    join = require('path').join,
    mkdirp = require('mkdirp'),
    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),
    all = require('./all'),
    platoOptions = require('./platoOptions'),
    platoInspect = require('./platoInspect'),
    tmpDir = require('./tmpDir'),
    extractTo = require('./extractTo'),
    generateBadge = require('./generateBadge');

var AVAILABLE_BADGES = {
    sloc: true,
    maintainability: true
};

/**
 *
 * @param {Object} [options]
 * @param {String} [options.hostname]
 * @param {String} [options.badgeService]
 * @param {String} [options.reports]
 * @param {Number} [options.ttl]
 * @param {Object} query
 * @param {String} query.user
 * @param {String} query.repo
 * @param {String} query.branch
 * @param {String} [query.oauth_token]
 * @constructor
 */
function ReportGenerator(options, query) {
    this.options = _.defaults(options || {}, {
        apiHostname: 'api.github.com',
        badgeService: 'img.shields.io',
        reports: join(__dirname, '..', 'reports'),
        ttl: 60 * 15 * 1000
    });

    this.query = query || {};

    this.router = new Route({
        pattern: 'https://' + this.options.apiHostname + '/repos/<user>/<repo>/zipball/<branch>',
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
     * Creates badge
     * @returns {Promise|*}
     */
    createBadge: function (badgeName) {
        var self = this;
        var badgeFile = join(self._rootDir(), badgeName + '.png'),
            reportFile = join(self._rootDir(), 'report.json');

        return self.create()
            .then(function () {
                return vowFs.read(reportFile);
            })
            .then(function (json) {
                return generateBadge({
                    name: badgeName,
                    value: JSON.parse(json).summary.average[badgeName],
                    color: 'green',
                    hostname: self.options.badgeService
                }, badgeFile);
            });
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
                var downloadZipAndExtract = extractTo({
                    url: self.buildZipUrl(),
                    headers: self.getRequestHeaders()
                }, tmpDir);

                return all([
                    downloadZipAndExtract,
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
        var promise = vow.promise();

        var resultsDir = this._rootDir();

        mkdirp(resultsDir, function (err) {
            if (err) {
                promise.reject(err);
            }

            promise.fulfill(resultsDir);
        });

        return promise;
    },
    /**
     * @returns {String}
     * @private
     */
    _rootDir: function () {
        var query = this.query;
        return join(this.options.reports, query.user, query.repo, query.branch);
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
     * @returns {Promise}
     */
    isFreshBadge: function (badgeName) {
        var self = this;
        if (!AVAILABLE_BADGES.hasOwnProperty(badgeName)) {
            return vow.reject('No such badge ' + badgeName);
        }

        var badgeFile = join(self._rootDir(), badgeName + '.png');

        return this.isFresh()
            // Page is fresh
            .then(function (isFresh) {
                return isFresh ? vowFs.exists(badgeFile) : isFresh;
            });
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
    },
    getRequestHeaders: function() {
        var headers = {
            // Header required by api.github.com
            'User-Agent': 'es-analysis/plato-as-service'
        };

        if (this.query.oauth_token) {
            headers['Authorization'] = 'token ' + String(this.query.oauth_token);
        }

        return headers;
    }
};

module.exports = ReportGenerator;
module.exports.AVAILABLE_BADGES = AVAILABLE_BADGES;
