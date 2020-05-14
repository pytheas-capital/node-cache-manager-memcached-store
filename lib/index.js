"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _memcachePlus = require("memcache-plus");

var _memcachePlus2 = _interopRequireDefault(_memcachePlus);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class MemcachedClient {
  constructor(options) {
    this.options = options;

    if (!this.options) {
      throw new Error("[cache-manager] memcache options not defined");
    }

    this.memcached = new _memcachePlus2.default(this.options.options);
  }

  _getOptions() {
    return this.options;
  }

  get(key, options) {
    return this.memcached.get(key, options);
  }

  set(key, value, options) {
    var opt = {
      ttl: 2592000
    };

    if (typeof options === "number") {
      opt = {
        ttl: options
      };
      return this.memcached.set(key, value, opt.ttl);
    } else if (typeof options === "object") {
      return this.memcached.set(key, value, options);
    }
  }

  del(key, options, cb) {
    return this.memcached.delete(key);
  }

  reset() {
    return this.memcached.flush();
  }

  isCacheableValue(value) {
    if (this.options.isCacheableValue) {
      return this.options.isCacheableValue(value);
    }

    return value !== null && value !== undefined;
  }

  getClient(cb) {
    return cb(null, {
      client: this.memcached
    });
  }

  keys(pattern, cb) {
    if (typeof pattern === "function") {
      cb = pattern;
    }

    getKeys(this.memcached, handleError(cb));
  }
}

exports.default = MemcachedClient;
MemcachedClient.prototype.name = "memcached";

module.exports = {
  create: function (args) {
    return new MemcachedClient(args);
  }
};

function handleError(cb) {
  cb = cb || function () {};

  return function (err, resp) {
    if (!err) {
      return cb(null, resp);
    }

    return cb(err, resp);
  };
}

function getKeys(memcached, cb) {
  var keyArray = [];
  var keyLength = 0;

  memcached.items().then(function (items) {
    items.forEach(function (item) {
      keyLength += item.data.number;

      memcached.cachedump(item.slab_id, item.data.number).then(function (dataSet) {
        dataSet.forEach(function (data) {
          if (data.key) {
            memcached.get(data.key).then(function (val) {
              if (val) {
                keyArray.push(data.key);
              }

              keyLength -= 1;

              if (keyLength === 0) {
                cb(null, keyArray);
              }
            });
          }
        });
      });
    });
  }).catch(function (err) {
    cb(err);
  });
}