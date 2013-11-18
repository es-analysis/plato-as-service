var vow = require('vow'),
    fs = require('fs');

/**
 * Promisefied fs.readFile
 * @param {String} file
 * @returns {Promise} fulfill(contents: String)
 */
module.exports = function (file) {
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
};
