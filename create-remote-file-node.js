"use strict";

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var fs = require(`fs-extra`);
var got = require(`got`);
var crypto = require(`crypto`);
var path = require(`path`);

var _require = require(`valid-url`),
    isWebUri = _require.isWebUri;

var _require2 = require(`./create-file-node`),
    createFileNode = _require2.createFileNode;

var cacheId = function cacheId(url) {
  return `create-remote-file-node-${url}`;
};

/**
 * Index of promises resolving to File node from remote url
 */
var processingCache = {};

module.exports = function (_ref) {
  var url = _ref.url,
      store = _ref.store,
      cache = _ref.cache,
      createNode = _ref.createNode,
      _ref$auth = _ref.auth,
      auth = _ref$auth === undefined ? {} : _ref$auth;

  // Check if we already requested node for this remote file
  // and return stored promise if we did.
  if (processingCache[url]) {
    return processingCache[url];
  }

  return processingCache[url] = new Promise(function () {
    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(resolve, reject) {
      var cachedHeaders, headers, digest, tmpFilename, filename, createFileSystemNode, statusCode, responseHeaders, responseError, responseStream;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!(!url || isWebUri(url) === undefined)) {
                _context.next = 3;
                break;
              }

              resolve();
              return _context.abrupt("return");

            case 3:
              _context.next = 5;
              return fs.ensureDir(path.join(store.getState().program.directory, `.cache`, `gatsby-source-filesystem`));

            case 5:
              _context.next = 7;
              return cache.get(cacheId(url));

            case 7:
              cachedHeaders = _context.sent;
              headers = {};

              // Add htaccess authentication if passed in. This isn't particularly
              // extensible. We should define a proper API that we validate.

              if (auth && auth.htaccess_pass && auth.htaccess_user) {
                headers.auth = `${auth.htaccess_user}:${auth.htaccess_pass}`;
              }

              if (cachedHeaders && cachedHeaders.etag) {
                headers[`If-None-Match`] = cachedHeaders.etag;
              }

              // Create the temp and permanent file names for the url.
              digest = crypto.createHash(`md5`).update(url).digest(`hex`);
              tmpFilename = path.join(store.getState().program.directory, `.cache`, `gatsby-source-filesystem`, `tmp-` + digest + path.parse(url).ext);
              filename = path.join(store.getState().program.directory, `.cache`, `gatsby-source-filesystem`, digest + path.parse(url).ext);

              createFileSystemNode = function createFileSystemNode() {
                // Create the file node and return.
                createFileNode(filename, {}).then(function (fileNode) {
                  // Override the default plugin as gatsby-source-filesystem needs to
                  // be the owner of File nodes or there'll be conflicts if any other
                  // File nodes are created through normal usages of
                  // gatsby-source-filesystem.
                  createNode(fileNode, { name: `gatsby-source-filesystem` });
                  resolve(fileNode);
                });
              };

              if (!fs.existsSync(filename)) {
                _context.next = 18;
                break;
              }

              createFileSystemNode();
              return _context.abrupt("return");

            case 18:

              // Fetch the file.
              statusCode = void 0;
              responseHeaders = void 0;
              responseError = false;
              responseStream = got.stream(url, headers);

              responseStream.pipe(fs.createWriteStream(tmpFilename));
              responseStream.on(`downloadProgress`, function (pro) {
                return console.log(pro);
              });

              // If there's a 400/500 response or other error.
              responseStream.on(`error`, function (error, body, response) {
                responseError = true;
                fs.removeSync(tmpFilename);
                reject(error, body, response);
              });

              // If the status code is 200, move the piped temp file to the real name.
              // Else if 304, remove the empty response.
              responseStream.on(`response`, function (response) {
                statusCode = response.statusCode;
                responseHeaders = response.headers;
              });

              responseStream.on(`end`, function (response) {
                if (responseError) return;

                // Save the response headers for future requests.
                cache.set(cacheId(url), responseHeaders);
                if (statusCode === 200) {
                  fs.moveSync(tmpFilename, filename, { overwrite: true });
                } else {
                  fs.removeSync(tmpFilename);
                }

                createFileSystemNode();
              });

            case 27:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, undefined);
    }));

    return function (_x, _x2) {
      return _ref2.apply(this, arguments);
    };
  }());
};