# Angular LocalStorage Service

This service provides a simple a eloquent interface to the `localStorage` API.

## Examples

```js
angular
    .module('example', ['marshall.storage'])
    .run(function (storageService) {
        var storage = storageService('example.');

        storage.set('foobar', 'Hello World!');

        console.log(storage.get('foobar')); // 'Hello World!'
    });
```

```js
angular
    .module('example', ['marshall.storage'])
    .run(function () {
        var storage = storageService('example.');

        // Number
        storage.set('foobar', 123);

        console.log(storage.get('foobar')); // '123' (String)
        console.log(storage.get('foobar', Number)); // 123 (Number)

        // JSON
        storage.set('foobar', { one: 'two' });

        console.log(storage.get('foobar')); // '{"one":"two"}' (String)
        console.log(storage.get('foobar', JSON.parse)); // { one: 'two' } (Object)
    });
```

```js
angular
    .module('example', ['marshall.storage'])
    .run(function (storageService) {
        var storage = storageService('example.');

        var watcher = storage.watch('foobar', function (key, value) {
            console.log('%s => %s', key, value); // 'foobar => Hello World!'
        });

        storage.set('foobar', 'Hello World!');

        console.log(storage.keys()); // ['foobar']
    });
```

## API

### StorageService([String:prefix]) StorageService

Creates a new StorageService instance, with an optional prefix.

The prefix is used to isolate local storage items to a specific key. All methods on the StorageService look at this prefix. For example; with a StorageService of ‘foobar.’, the `StorageService#clear` method will only remove all items that start with ‘foobar.’.

### StorageService#get(String:key) String/null

Returns the string value of an item within local storage.

### StorageService#set(String:key, String:value)

Sets an item in local storage.

### StorageService#has(String:key) Boolean

Returns whether there is an item in local storage with the given key.

### StorageService#remove(String:key)

Removes a specific item in local storage, by key.

### StorageService#clear()

Removes all the items in local storage.

### StorageService#json(String:key [, Object/Array:value]) Object/Array/undefined

Gets or sets an item in local storage; automatically stringifying them, and parsing them out.

### StorageService#watch(String:pattern, Function:callback [, Boolean:initial]) Function

Watches local storage for any changes to specific items. The callback is fired whenever a piece of code (within the same tab, or another tab) sets/removes/changes the value of a local storage item.

The pattern argument is a string that can optionally include regular expression code. For simplicity, the `*` key will automatically be translated into `(.*)` which matches anything. This allows you to pass in a string, such as; ‘example.foo.*.id’, which will match ‘example.foo.andrew.id’, ‘example.foo.max.id’ (etc).

An optional third argument can be passed through to invoke the callback for all the existing items with their current values.

### StorageService#keys() Array

Returns an array of keys within local storage.

### StorageService#sub(String:prefix) StorageService

Spawns a child StorageService which is prefixed with the prefix the parent has.
