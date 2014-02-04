// Generated by CoffeeScript 1.7.1
var db, productionOrTest, randomString, recoverApp, recoverDesignDocs, recoverDocs, request;

db = require('../helpers/db_connect_helper').db_connect();

request = {};

randomString = function(length) {
  var string;
  string = "";
  while (string.length < length) {
    string = string + Math.random().toString(36).substr(2);
  }
  return string.substr(0, length);
};

productionOrTest = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test";

module.exports.create = (function(_this) {
  return function(app, req, views, newView, callback) {
    var path;
    if (productionOrTest) {
      if ((views[req.req_name] != null) && JSON.stringify(views[req.req_name]) !== JSON.stringify(newView)) {
        path = "" + app + "-" + req.req_name;
        if (!request[app]) {
          request[app] = {};
        }
        request[app]["" + req.type + "/" + req.req_name] = path;
        return callback(null, path);
      } else {
        path = req.req_name;
        if (!request[app]) {
          request[app] = {};
        }
        request[app]["" + req.type + "/" + req.req_name] = path;
        return callback(null, path);
      }
    } else {
      return callback(null, req.req_name);
    }
  };
})(this);

module.exports.get = (function(_this) {
  return function(app, req, callback) {
    var _ref;
    if (productionOrTest && (((_ref = request[app]) != null ? _ref["" + req.type + "/" + req.req_name] : void 0) != null)) {
      return callback(request[app]["" + req.type + "/" + req.req_name]);
    } else {
      return callback("" + req.req_name);
    }
  };
})(this);

recoverApp = (function(_this) {
  return function(callback) {
    var apps;
    apps = [];
    return db.view('application/all', function(err, res) {
      if (err) {
        return callback(err);
      } else if (!res) {
        return callback([]);
      } else {
        res.forEach(function(app) {
          return apps.push(app.name);
        });
        return callback(apps);
      }
    });
  };
})(this);

recoverDocs = (function(_this) {
  return function(res, docs, callback) {
    var doc;
    if (res && res.length !== 0) {
      doc = res.pop();
      return db.get(doc.id, function(err, result) {
        docs.push(result);
        return recoverDocs(res, docs, callback);
      });
    } else {
      return callback(docs);
    }
  };
})(this);

recoverDesignDocs = (function(_this) {
  return function(callback) {
    var filterRange;
    filterRange = {
      startkey: "_design/",
      endkey: "_design0"
    };
    return db.all(filterRange, function(err, res) {
      return recoverDocs(res, [], callback);
    });
  };
})(this);

module.exports.init = (function(_this) {
  return function(callback) {
    if (productionOrTest) {
      return recoverApp(function(apps) {
        return recoverDesignDocs(function(docs) {
          var app, body, doc, req_name, type, view, _i, _j, _len, _len1, _ref;
          for (_i = 0, _len = apps.length; _i < _len; _i++) {
            app = apps[_i];
            for (_j = 0, _len1 = docs.length; _j < _len1; _j++) {
              doc = docs[_j];
              _ref = doc.views;
              for (view in _ref) {
                body = _ref[view];
                if (view.indexOf(app + '-') === 0) {
                  type = doc._id.substr(8, doc._id.length - 1);
                  req_name = view.split('-')[1];
                  if (!request[app]) {
                    request[app] = {};
                  }
                  request[app]["" + type + "/" + req_name] = view;
                }
              }
            }
          }
          return callback(null);
        });
      });
    } else {
      return callback(null);
    }
  };
})(this);