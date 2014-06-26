// Generated by CoffeeScript 1.7.1
var Client, controllerClient, db, dbHelper, deleteFiles, fs;

fs = require("fs");

db = require('../helpers/db_connect_helper').db_connect();

deleteFiles = require('../helpers/utils').deleteFiles;

dbHelper = require('../lib/db_remove_helper');

Client = require('request-json').JsonClient;

controllerClient = new Client('http://localhost:9002');

module.exports.add = function(req, res, next) {
  var attach, err, file;
  attach = function(binary, name, file, doc) {
    var fileData, stream;
    fileData = {
      name: name,
      "content-type": file.type
    };
    stream = db.saveAttachment(binary, fileData, function(err, binDoc) {
      var bin, newBin;
      if (err) {
        console.log("[Attachment] err: " + JSON.stringify(err));
        deleteFiles(req.files);
        return next(new Error(err.error));
      } else {
        bin = {
          id: binDoc.id,
          rev: binDoc.rev
        };
        if (doc.binary) {
          newBin = doc.binary;
        } else {
          newBin = {};
        }
        newBin[name] = bin;
        return db.merge(doc._id, {
          binary: newBin
        }, function(err) {
          deleteFiles(req.files);
          res.send(201, {
            success: true
          });
          return next();
        });
      }
    });
    return fs.createReadStream(file.path).pipe(stream);
  };
  if (req.files["file"] != null) {
    file = req.files["file"];
    controllerClient.setToken(process.env.TOKEN);
    return controllerClient.get('diskinfo', (function(_this) {
      return function(err, res, body) {
        var binary, name, _ref;
        if ((err == null) && 2 * file.size > body.freeDiskSpace * 1073741824) {
          err = new Error("Not enough storage space");
          err.status = 400;
          return next(err);
        } else {
          if (req.body.name != null) {
            name = req.body.name;
          } else {
            name = file.name;
          }
          if (((_ref = req.doc.binary) != null ? _ref[name] : void 0) != null) {
            return db.get(req.doc.binary[name].id, function(err, binary) {
              return attach(binary, name, file, req.doc);
            });
          } else {
            binary = {
              docType: "Binary"
            };
            return db.save(binary, function(err, binary) {
              return attach(binary, name, file, req.doc);
            });
          }
        }
      };
    })(this));
  } else {
    err = new Error("No file sent");
    err.status = 400;
    return next(err);
  }
};

module.exports.get = function(req, res, next) {
  var err, name, stream;
  name = req.params.name;
  if (req.doc.binary && req.doc.binary[name]) {
    stream = db.getAttachment(req.doc.binary[name].id, name, function(err) {
      if (err && (err.error = "not_found")) {
        err = new Error("not found");
        err.status = 404;
        return next(err);
      } else if (err) {
        return next(new Error(err.error));
      } else {
        return res.send(200);
      }
    });
    if (req.headers['range'] != null) {
      stream.setHeader('range', req.headers['range']);
    }
    stream.pipe(res);
    return res.on('close', function() {
      return stream.abort();
    });
  } else {
    err = new Error("not found");
    err.status = 404;
    return next(err);
  }
};

module.exports.remove = function(req, res, next) {
  var err, id, name;
  name = req.params.name;
  if (req.doc.binary && req.doc.binary[name]) {
    id = req.doc.binary[name].id;
    delete req.doc.binary[name];
    if (req.doc.binary.length === 0) {
      delete req.doc.binary;
    }
    return db.save(req.doc, function(err) {
      return db.get(id, function(err, binary) {
        if (binary != null) {
          return dbHelper.remove(binary, function(err) {
            if ((err != null) && (err.error = "not_found")) {
              err = new Error("not found");
              err.status = 404;
              return next(err);
            } else if (err) {
              console.log("[Attachment] err: " + JSON.stringify(err));
              return next(new Error(err.error));
            } else {
              res.send(204, {
                success: true
              });
              return next();
            }
          });
        } else {
          err = new Error("not found");
          err.status = 404;
          return next(err);
        }
      });
    });
  } else {
    err = new Error("not found");
    err.status = 404;
    return next(err);
  }
};
