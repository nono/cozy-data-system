// Generated by CoffeeScript 1.10.0
var async, checkPermissions, checkReplicationPermissions, db, deleteFiles, errors, helpers, locker, logger;

locker = require('../lib/locker');

db = require('../helpers/db_connect_helper').db_connect();

logger = require('printit')({
  prefix: 'middleware/utils'
});

async = require('async');

errors = require('./errors');

helpers = require('../helpers/utils');

checkReplicationPermissions = helpers.checkReplicationPermissions;

checkPermissions = helpers.checkPermissions;

deleteFiles = helpers.deleteFiles;

module.exports.lockRequest = function(req, res, next) {
  req.lock = req.params.id || req.params.type;
  return locker.runIfUnlock(req.lock, function() {
    locker.addLock(req.lock);
    return next();
  });
};

module.exports.unlockRequest = function(req, res) {
  return locker.removeLock(req.lock);
};

module.exports.getDoc = function(req, res, next) {
  return db.get(req.params.id, function(err, doc) {
    if (err) {
      logger.error(err);
      deleteFiles(req.files);
      return next(err);
    } else if (doc != null) {
      req.doc = doc;
      return next();
    } else {
      deleteFiles(req.files);
      return next(errors.http(404, 'Not found'));
    }
  });
};

module.exports.checkPermissionsFactory = function(permission) {
  return function(req, res, next) {
    return checkPermissions(req, permission, next);
  };
};

module.exports.checkPermissionsByDoc = function(req, res, next) {
  return checkPermissions(req, req.doc.docType, next);
};

module.exports.checkPermissionsByBody = function(req, res, next) {
  return checkPermissions(req, req.body.docType, next);
};

module.exports.checkPermissionsByType = function(req, res, next) {
  return checkPermissions(req, req.params.type, next);
};

module.exports.checkPermissionsPostReplication = function(req, res, next) {
  var docs, err;
  if (req.url.indexOf('/replication/_revs_diff') === 0) {
    return next();
  } else if (req.url === '/replication/_ensure_full_commit') {
    return next();
  } else if (req.url.indexOf('/replication/_changes') === 0) {
    return next();
  } else if (req.url.indexOf('/replication/_bulk_docs') === 0) {
    docs = req.body.docs || [];
    return async.forEach(docs, function(doc, cb) {
      var err;
      if (doc._deleted) {
        return db.get(doc._id, function(err, doc) {
          if ((err != null) && err.error === 'not_found') {
            return cb();
          } else if (err) {
            logger.error(err);
            return cb(err);
          } else if (doc._id == null) {
            err = new Error("Forbidden operation");
            err.status = 403;
            return cb(err);
          } else {
            return checkReplicationPermissions(req, doc, cb);
          }
        });
      } else {
        if (doc._id == null) {
          err = new Error("Forbidden operation");
          err.status = 403;
          return cb(err);
        } else {
          return checkReplicationPermissions(req, doc, cb);
        }
      }
    }, next);
  } else if (req.url.indexOf('/replication/_all_docs') === 0 && req.body.keys) {
    return async.forEach(req.body.keys, function(key, cb) {
      return db.get(key, function(err, doc) {
        if ((err != null) && err.error === 'not_found') {
          return cb();
        } else if (err) {
          logger.error(err);
          return cb(err);
        } else {
          return checkReplicationPermissions(req, doc, cb);
        }
      });
    }, next);
  } else {
    err = new Error("Forbidden operation");
    err.status = 403;
    return next(err);
  }
};

module.exports.checkPermissionsPutReplication = function(req, res, next) {
  if (req.url.indexOf('/replication/_local') === 0) {
    delete req.body.docType;
    return next();
  } else {
    return next();
  }
};
