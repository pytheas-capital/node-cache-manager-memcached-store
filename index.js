import Memcached from "memcache-plus";

export default class MemcachedClient {
  constructor(options) {
    this.options = options;

    if (!this.options) {
      throw new Error("[cache-manager] memcache options not defined");
    }

    this.memcached = new Memcached(this.options.options);
  }
  /**
   * Used for testing; Gets the set options
   * @returns {object}
   * @private
   */
  _getOptions() {
    return this.options;
  }
  /**
   * See https://github.com/BryanDonovan/node-cache-manager/blob/master/lib/caching.js
   * for the interface methods that need to be implemented
   */
  /**
   * Get a value for a given key.
   * @method get
   * @param {String} key - The cache key
   * @param {Object} [options] - The options (optional)
   * @return {Promise}
   */
  get(key, options) {
    return this.memcached.get(key, options);
  }
  /**
   * Set a value for a given key.
   * @method set
   * @param {String} key - The cache key
   * @param {String} value - The value to set
   * @param {Object} [options] - The options (optional)
   * @param {Object} options.ttl - The ttl value. Default is 2592000 seconds
   * @return {Promise}
   */
  set(key, value, options) {
    var opt = {
      ttl: 2592000,
    };

    if (typeof options === "number") {
      opt = {
        ttl: options,
      };
      return this.memcached.set(key, value, opt.ttl);
    } else if (typeof options === "object") {
      return this.memcached.set(key, value, options);
    }
  }
  /**
   * Delete value of a given key
   * @method del
   * @param {String} key - The cache key
   * @param {Object} [options] - The options (optional)
   * @return {Promise}
   */
  del(key, options, cb) {
    return this.memcached.delete(key);
  }
  /**
   * Delete all the keys
   * @method reset
   * @return {Promise}
   */
  reset() {
    return this.memcached.flush();
  }
  /**
   * Specify which values should and should not be cached.
   * If the function returns true, it will be stored in cache.
   * By default, it caches everything except null and undefined values.
   * Can be overriden via standard node-cache-manager options.
   * @method isCacheableValue
   * @param {String} value - The value to check
   * @return {Boolean} - Returns true if the value is cacheable, otherwise false.
   */
  isCacheableValue(value) {
    if (this.options.isCacheableValue) {
      return this.options.isCacheableValue(value);
    }

    return value !== null && value !== undefined;
  }
  /**
   * Returns the underlying memcached client connection
   * @method getClient
   * @param {Function} cb - A callback that returns a potential error and an object containing the Redis client and a done method
   */
  getClient(cb) {
    return cb(null, {
      client: this.memcached,
    });
  }
  /**
   * Returns all keys. Warning: Potentially very expensive function as memcache does not have a simple way to get key data.
   * @method keys
   * @param {String} [pattern] - Has no use, retained for interface compat.
   * @param {Function} cb - A callback that returns a potential error and the response
   */
  keys(pattern, cb) {
    if (typeof pattern === "function") {
      cb = pattern;
    }

    getKeys(this.memcached, handleError(cb));
  }
}

MemcachedClient.prototype.name = "memcached";

module.exports = {
  create: function (args) {
    return new MemcachedClient(args);
  },
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

// from: http://blog.pointerstack.com/2012/08/nodejs-extract-keys-from-memcache-server.html
function getKeys(memcached, cb) {
  var keyArray = [];
  var keyLength = 0;

  memcached
    .items()
    .then(function (items) {
      items.forEach(function (item) {
        keyLength += item.data.number;

        memcached
          .cachedump(item.slab_id, item.data.number)
          .then(function (dataSet) {
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
    })
    .catch(function (err) {
      cb(err);
    });
}
