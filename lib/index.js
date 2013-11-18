var request = require('request'),
    Extract = require('unzip').Extract,
    Route = require('susanin').Route,
    tmp = require('tmp'),
    fs = require('fs'),
    rmDir = require('rm-r').dir,
    plato = require('plato'),
    glob = require('glob'),
    join = require('path').join,
    mkdirp = require('mkdirp'),
    ignore = require('ignore'),
    fstream = require('fstream'),
    vow = require('vow');

tmp.setGracefulCleanup();

var archiveRoute = Route({
    pattern: 'https://github.com/<user>/<repo>/archive/<branch>.zip',
    defaults: {
        branch: 'master'
    }
});

/**
 * Acts as vow.all, but also forwards notifications
 * @param {Promise[]} promises
 * @return {Promise}
 */
function all(promises) {
    var masterPromise = vow.all(promises);

    // pipe all notifications to master promise
    promises.forEach(function (promise) {
        promise.progress(masterPromise.notify, masterPromise);
    });

    return masterPromise;
}

/**
 * Notifies promise in next tick
 *
 * @param {Promise} promise
 * @param {String}  message
 */
function notifyNextTick(promise, message) {
    process.nextTick(function () {
        promise.notify(message);
    });
}

/**
 * @param {String} zipUrl source url
 * @param {String} path   extract path
 * @returns {Promise} fulfill(path: String)
 */
function extractTo(zipUrl, path) {
    var promise = vow.promise();

    var unzip = new Extract({
        path: path
    });

    unzip.on('close', function () {
        promise.fulfill(path);
    });
    unzip.on('error', promise.reject.bind(promise));

    notifyNextTick(promise, 'Downloading zip');

    var zip = request(zipUrl);
    zip.on('end', function () {
        notifyNextTick(promise, 'Extracting zip');
    });
    zip.pipe(unzip);

    return promise;
}

/**
 * @returns {Promise} fulfill(path: String)
 */
function createTmpDir() {
    var promise = vow.promise();

    notifyNextTick(promise, 'Creating tmp dir');

    tmp.dir(function(err, path) {
        if (err) {
            promise.reject(err);
        }

        promise.fulfill(path);
    });

    return promise;
}

function buildZipUrl(options) {
    return archiveRoute.build(options);
}

/**
 * Collects all JavaScripts in `path`
 * @param {String} path        extract path
 * @param {String} globPattern source url
 *
 * @returns {Promise} fulfill(files: String[])
 */
function findJavaScripts(path, globPattern) {
    var promise = vow.promise(),
        pattern = join(path, globPattern);

    notifyNextTick(promise, 'Collecting JavaScripts');

    glob(pattern, function(err, files) {
        if (err) {
            promise.reject(err);
        }
        promise.fulfill(files);
    });

    return promise;
}

/**
 * Returns first dir in `path`
 * @param {String} path
 * @returns {Promise} fulfill(path: String)
 */
function firstDir(path) {
    var promise = vow.promise();

    fs.readdir(path, function (err, paths) {
        if (err) {
            promise.reject(err);
        }

        promise.fulfill(join(path, paths[0]));
    });

    return promise;
}

/**
 * Promisefied fs.readFile
 * @param {String} file
 * @returns {Promise} fulfill(contents: String)
 */
function readFile(file) {
    var promise = vow.promise();

    fs.exists(file, function (exists) {
        if (!exists) {
            return promise.reject('File ' + file + ' not exists');
        }

        fs.readFile(file, 'utf8', function (err, contents) {
            if (err) {
                return promise.reject(err);
            }
            return promise.fulfill(contents);
        });
    });

    return promise;
}

/**
 * Promisefied fs.readFile + JSON.parse
 * @param {String} file
 * @returns {Promise} fulfill(contents: Object)
 */
function readJSON(file) {
    return readFile(file).then(function (contents) {
        return JSON.parse(contents);
    });
}

/**
 * Reads .jshintrc in `path` and returns `defaults` if not found
 * @param {String} path
 * @param {Object} [defaults={}]
 * @returns {Promise} fulfill(contents: Object)
 */
function readDotJsHintRc(path, defaults) {
    var dotJsHintRc = join(path, '.jshintrc');

    var promise = readJSON(dotJsHintRc);

    notifyNextTick(promise, 'Reading .jshintrc');

    return promise.fail(function () {
        return defaults || {};
    });
}

/**
 * Collects ignores in `path`
 * @param {String} path
 * @returns {Promise} fulfill(ignores: String[])
 */
function getIgnores(path) {
    var files = ['.npmignore', '.jshintignore'];

    files = files.map(function (name) {
        var dotIgnoreFile = join(path, name);
        return readFile(dotIgnoreFile).fail(function () {
            // Assume that file is empty
            return '';
        });
    });

    var promise = all(files);
    notifyNextTick(promise, 'Getting .*ignore files');

    return promise.then(function (ignores) {
        return ignores.reduce(function (list, ignore) {
            return list.concat(ignore.split('\n'));
        }, [])
        .filter(function (entry) {
            return !!entry;
        });
    });
}

/**
 * @param {String} path
 * @param {String} resultsDir
 * @returns {Promise} fulfill(options: Object)
 */
function constructPlatoOptions(path, resultsDir) {
    return firstDir(path)
        .then(function (path) {
            return all([
                findJavaScripts(path, '**/*.js'),
                readDotJsHintRc(path),
                getIgnores(path)
            ]);
        })
        .spread(function(files, jshint, ignores) {
            var exclude = ignore().addPattern(ignores);
            files = files.filter(exclude.createFilter());

            return {
                files: files,
                result: resultsDir,
                options: {
                    jshint: jshint,
                    complexity: {
                        newmi : true,
                        logicalor : false,
                        switchcase : false,
                        forin : true,
                        trycatch : true
                    }
                }
            };
        });
}

/**
 * Inspects `files` using plato and writes result to `report` dir
 * @param {String[]} files   files to inspect
 * @param {String}   report  results dir
 * @param {Object}   options
 * @returns {Promise}
 */
function platoInspect(files, report, options) {
    var promise = vow.promise();

    notifyNextTick(promise, 'Generating report');

    plato.inspect(files, report, options, function (reports) {
        promise.fulfill(reports);
    });

    return promise;
}

/**
 * Creates result dir using `options`
 * @param {Object} options
 * @param {String} options.user
 * @param {String} options.repo
 * @param {String} options.branch
 * @returns {Promise} fulfill(resultsDir: String)
 */
function makeResultsDir(options) {
    var promise = vow.promise();

    var resultsDir = join('./reports', options.user, options.repo, options.branch);

    mkdirp(resultsDir, function (err) {
        if (err) {
            promise.reject(err);
        }

        promise.fulfill(resultsDir);
    });

    return promise;
}

/**
 * Creates plato report for `options.user`/`options.repo` github repository
 * @param {Object} options
 * @param {String} options.user
 * @param {String} options.repo
 * @param {String} options.branch
 * @returns {Promise}
 */
function createReportFor(options) {
    return createTmpDir()
        .then(function (tmpDir) {
            return all([
                extractTo(buildZipUrl(options), tmpDir),
                makeResultsDir(options)
            ]);
        })
        .spread(function (tmpDir, resultsDir) {
            return constructPlatoOptions(tmpDir, resultsDir);
        })
        .then(function (options) {
            return platoInspect(options.files, options.result, options.options);
        });
}

// TODO remove this test
createReportFor({
    user: 'azproduction',
    repo: 'plato-as-service',
    branch: 'master'
})
.progress(console.log)
.fail(function (error) {
    console.error(error.stack);
});
