/**
 *
 */
(function (angular) {
    'use strict';

    angular
        .module('marshall.storage', [])
        .factory('storageService', StorageServiceProvider);

    function StorageServiceProvider ($rootScope) {
        var proto = StorageService.prototype,
            priv = {},
            callbacks = [];

        /**
         * Wraps a function in an $apply, which fixes any issues with events and angular's
         * $digest. Make sure to invoke this only if you know the callback is coming from
         * 'outside' of angular.
         *
         * @param {Function} callback
         * @returns {Function}
         */
        function wrapFn (callback) {
            return function () {
                var that = this,
                    args = arguments;

                return $rootScope.$apply(function () {
                    callback.apply(that, args);
                });
            };
        }

        /**
         * Creates a new StorageService instance.
         *
         * @param {String} [prefix]
         * @constructor
         */
        function StorageService (prefix) {
            this.prefix = angular.isDefined(prefix) ? prefix : '';
            this.storage = window.localStorage;
        }

        /**
         * Returns the value of a local storage item (by key).
         *
         * @param {String} key
         * @returns {String|null}
         */
        proto.get = function (key) {
            return this.storage.getItem(this.prefix + key);
        };

        /**
         * Sets a value in local storage (by key).
         *
         * @param {String} key
         * @param {String} value
         */
        proto.set = function (key, value) {
            this.storage.setItem(this.prefix + key, value);
        };

        /**
         * Checks whether an item exists in local storage (by key).
         *
         * @param {String} key
         */
        proto.has = function (key) {
            return this.storage.hasOwnProperty(this.prefix + key);
        };

        /**
         * Removes an item in local storage (by key).
         *
         * @param {String} key
         */
        proto.remove = function (key) {
            this.storage.removeItem(this.prefix + key);
        };

        /**
         * Clears all the items within the scoped local storage.
         */
        proto.clear = function () {
            this.keys().forEach(this.remove.bind(this));
        };

        /**
         * Gets/sets an item in local storage (by key).
         *
         * This function automatically parses/stringifies the target object.
         *
         * @param {String} key
         * @param {Object|Array} [value]
         * @returns {Object|Array|undefined}
         */
        proto.json = function (key, value) {
            var data;

            if (angular.isDefined(value)) {
                this.set(key, JSON.stringify(value));
            } else if (this.has(key)) {
                try {
                    data = JSON.parse(this.get(key));
                } catch (err) {}
            }

            return data;
        };

        /**
         * Watches for local storage changes that match a specific criteria.
         *
         * Returns the function which unbinds the event listener. It's important to do this
         * to avoid leaking memory.
         *
         * @param {String} match
         * @param {Function} callback
         * @param {Boolean} [initial]
         * @returns {Function}
         */
        proto.watch = function (match, callback, initial) {
            var regex = priv.regex.call(this, match, true),
                updateEvent = priv.updateEvent.bind(this, regex, callback),
                wrapUpdateEvent = wrapFn(updateEvent);

            callbacks.push(updateEvent);
            window.addEventListener('storage', wrapUpdateEvent, false);

            // If we need to also provide a callback for all the current items in local
            // storage, that match the specific `match` argument.
            if (initial === true) {
                var matches = priv.match.call(this, match);

                // For all the items, invoke the callback (same old as current)
                Object.keys(matches).forEach(function (key) {
                    callback(key, matches[key], matches[key]);
                }, this);
            }

            return function () {
                callbacks.splice(callbacks.indexOf(updateEvent), 1);
                window.removeEventListener('storage', wrapUpdateEvent, false);
                regex = updateEvent = wrapUpdateEvent = null;
            };
        };

        /**
         * Returns the array of keys within the scope of a StorageService.
         *
         * Uses the `this.prefix` to select only the keys that are contained within the
         * scope of the instance.
         *
         * @returns {Array}
         */
        proto.keys = function () {
            return Object.keys(this.storage)
                .filter(function (key) {
                    return key.indexOf(this.prefix) === 0;
                }, this)
                .map(function (key) {
                    return key.substring(this.prefix.length);
                }, this);
        };

        /**
         * Creates a new StorageService with a prefix that is prefixed with the current
         * `this.prefix` value.
         *
         * @param {String} prefix
         * @returns {StorageServiceProvider.StorageService}
         */
        proto.sub = function (prefix) {
            return new StorageService(this.prefix + prefix);
        };

        /**
         * The event handler which checks whether an update event has triggered due
         * to an item (within scope) has changed.
         *
         * @param {RegExp} regex
         * @param {Function} callback
         * @param {Object} event
         */
        priv.updateEvent = function (regex, callback, event) {
            var matches = regex.test(event.key),
                key;

            if (matches) {
                key = event.key.substring(this.prefix.length);
                callback(key, event.newValue, event.oldValue);
            }
        };

        /**
         * All the items within the local storage (by a matcher string).
         *
         * @param {String} match
         * @returns {Object}
         */
        priv.match = function (match) {
            var regex = priv.regex.call(this, match, false),
                matches = {};

            this.keys().forEach(function (key) {
                if (regex.test(key)) {
                    matches[key] = this.get(key);
                }
            }, this);

            return matches;
        };

        /**
         * Returns the prefix for matching items (by key).
         *
         * @param {String} key
         * @param {Boolean} prefix
         * @returns {RegExp}
         */
        priv.regex = function (key, prefix) {
            return new RegExp('^' + (prefix ? this.prefix : '') + key.replace('*', '(.*)') + '$');
        };

        /**
         * Triggers an update (for any watchers) so they can know when an item has
         * changed. The `onstorage` event is only for catching changes from other tabs.
         *
         * @param {String} key
         * @param {String} current
         * @param {String|null} old
         */
        priv.triggerUpdate = function (key, current, old) {
            var event = { key: key, newValue: current, oldValue: old };

            angular.forEach(callbacks, function (callback) {
                try {
                    callback(event);
                } catch (err) {
                    if (window.console) {
                        console.error(err);
                    }
                }
            });
        };

        angular.forEach(['setItem', 'removeItem'], function (fn) {
            var method = window.Storage.prototype[fn];

            /**
             * Hook into the `setItem` and `removeItem` methods on the Storage class in
             * order to notify any watchers of updates done on the same page (maybe
             * even through means that aren't via angular.
             */
            window.Storage.prototype[fn] = function (key) {
                var old = this.getItem(key),
                    current;

                method.apply(this, arguments);
                current = this.getItem(key);

                if (current !== old) {
                    // Trigger an update if the current item has changed
                    priv.triggerUpdate(key, current, old);

                    // As we don't know where this function was invoked from, we need
                    // to lazy check whether an angular `$$phase` is set, if not, we need
                    // to trigger a $digest to make angular see any changes.
                    if ( ! $rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
            };
        });

        (function () {
            var method = window.Storage.prototype.clear;

            /**
             * Clears out the storage object, but makes a copy first, so it can notify
             * any watchers of the changes. Calls `triggerUpdate` several times with each
             * one of the old items.
             */
            window.Storage.prototype.clear = function () {
                // Make a copy of what the items were before the clear
                var before = JSON.parse(JSON.stringify(this));

                // Clear the local storage (wiping all data)
                method.call(this);

                angular.forEach(Object.keys(before), function (key) {
                    // Trigger an item update for this key (pass null as current)
                    priv.triggerUpdate(key, null, before[key]);
                });

                // Again, with the clear function, we need to force angular to notice
                // the changes to local storage, so if there isn't a current digest,
                // call $apply.
                if ( ! $rootScope.$$phase) {
                    $rootScope.$apply();
                }
            };
        })();

        /**
         * Creates a new StorageService, with an optional prefix.
         *
         * @param {String} [prefix]
         * @returns {StorageServiceProvider.StorageService}
         */
        return function (prefix) {
            return new StorageService(prefix);
        };
    }

    StorageServiceProvider.$inject = ['$rootScope'];
})(window.angular);
