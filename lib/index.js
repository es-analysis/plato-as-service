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
    vow = require('vow');

tmp.setGracefulCleanup();

var archiveRoute = Route({
    pattern: 'https://github.com/<user>/<repo>/archive/<branch>.zip',
    defaults: {
        branch: 'master'
    }
});

function extractTo(zipUrl, path) {
    var promise = vow.promise();

    var zip = new Extract({
        path: path
    });

    zip.on('close', function () {
        promise.fulfill(path);
    });
    zip.on('error', promise.reject.bind(promise));

    request(zipUrl).pipe(zip);

    return promise;
}

function createTmpDir() {
    var promise = vow.promise();

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

function findJavaScripts(path, globPattern) {
    var promise = vow.promise();

    glob(join(path, globPattern), function(err, path) {
        if (err) {
            promise.reject(err);
        }

        promise.fulfill(path);
    });

    return promise;
}

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

function readDotJsHintRc(path, defaults) {
    var promise = vow.promise(),
        dotJsHintRc = join(path, '.jshintrc');

    fs.exists(dotJsHintRc, function (exists) {
        if (!exists) {
            return promise.fulfill(defaults || {});
        }

        fs.readFile(dotJsHintRc, function (err, contents) {
            if (err) {
                return promise.reject(err);
            }
            try {
                return promise.fulfill(JSON.parse(contents));
            } catch (e) {
                return promise.reject(err);
            }
        });
    });


    return promise;
}

function constructPlatoOptions(path, resultsDir) {
    return firstDir(path)
        .then(function (path) {
            return vow.all([
                findJavaScripts(path, '**/*.js'),
                readDotJsHintRc(path)
            ]);
        })
        .spread(function(files, jshint) {
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

function platoInspect(files, report, options) {
    var promise = vow.promise();

    plato.inspect(files, report, options, function (reports) {
        promise.fulfill(reports);
    });

    return promise;
}

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

function createReportFor(options) {
    return createTmpDir()
        .then(function (tmpDir) {
            return vow.all([
                extractTo(buildZipUrl(options), tmpDir),
                makeResultsDir(options)
            ]);
        })
        .spread(function (tmpDir, resultsDir) {
            return constructPlatoOptions(tmpDir, resultsDir);
        })
        .then(function (options) {
            return platoInspect(options.files, options.result, options.options);
        })
        .then(function () {
            console.log('done');
        })
        .fail(function (error) {
            console.error(error);
        });
}

createReportFor({
    user: 'azproduction',
    repo: 'talk-better-js',
    branch: 'master'
});
