# express-browserify

Thin browserify middleware for express.

## Installation

```sh
npm install express --save
npm install express-browserify --save
```

## Usage

```js
var app = require('express')();
var browserify = require('express-browserify');
```

### browserify.settings

The default options object. If an options object is passed to the middelware constructor, then its keys will replace any duplicate keys in this object.

### browserify([files][, options][, callback])

Creates a middlware function which can be used with any express request method.

`files` String, Stream, or Array passed to the browserify constructor.

`options` Object passed to the browserify constructor. Some extra options have been added for use by this middleware: watch, precompile, and mutate.

`callback` Function passed a reference to the browserify instance to allow additional configuration before the bundle is compiled. Returning false from this callback will override the precompile option. The `.bundle()` method may be called to precompile manually.

Example:

```js
app.get('/bundle.js', browserify(
	// Specify a list of entry scripts for the bundle.
	['./entry.js'],

	// Pass options to browserify and the middleware.
	{
		// All standard browserify options are supported and passed directly to
		// the browserify constructor.

		// All options are shown here with their default values.
		
		// The following non-standard options are added to fill in missing
		// browserify options. Non-null/undefined values will be passed to the
		// browserify method of the same name.

		require: null,
		external: null,
		ignore: null,
		exclude: null,

		// The following non-standard options are used by this middleware.

		// Use watchify to update the bundle when a file changes. If this is
		// true, the browserify instance will be wrapped using the watchify
		// module and the "update" event will be bound to re-invoke .bundle()
		// on the browserify instance.
		watch: false,

		// Compile the bundle before the first request. If false, compilation
		// will be delayed util the first request is received.
		precompile: true,

		// Provide a function or an array of functions which can modify
		// browserify's output.
		mutate: []
	},

	// Access the browserify instance before .bundle() is called.
	function(b) {
		b.transform(...);
	}
});
```

Single-Entry-Point Bundle:

```js
app.get('/bundle.js', browserify('./entry.js'));
```

No-Entry-Point Bundle Exposing Modules Via `require()`:

```js
app.get('/bundle.js', browserify({
	require: [
		'foo',
		'./bar.js',
		{ file: './baz.js', expose: 'baz' }
	]
}));
```

Using Modules From Another Bundle:

```js
app.get('/bundle.js', browserify({
	// Use exclude instead of external for bundles which are dynamically
	// generated and therefore do not have a filename that can be referenced.
	// It's up to you to include a bundle on the page that will expose a
	// require() method for the excluded module names.
	exclude: [
		'foo',
		'./bar.js',
		'baz'
	],

	// You can of course still use external for pre-compiled bundles.
	external: [
		'./compiled-bundle.js'
	]
}));
```

#### options.mutate

This can be a single function or an array of functions. Each function will be passed the compiled source, the options passed to the middleware constructor, and a next callback.

```js
function(source, options, next) {
	// Modify the source and pass it to the next callback. Pass null as the
	// first argument to indicate no errors.
	next(null, source);
}
```

If there is an error during mutation, either throw the error synchronously call the next method with the error as the first argument.

```js
function(source, next) {
	somethingAsync(source, function(err, data) {
		if  (err) {
			next(err);
		} else {
			next(null, data);
		}
	});
}
```

#### Internal Browserify Instance

The browserify instance that the middleware uses internally can be accessed through the callback argument to the middleware constructor, or the `.browserify` property on the returned middleware callback function.

```js
var middleware = browserify(function(b) {
	// b is the browserify instance.
});

// This is the same browserify instance.
middleware.browserify;
```

## Browserify Patches

If the "watch" option is true, then browserify will be wrapped using the watchify module. See the [watchify documentation](https://github.com/substack/watchify) for more information.

### b.require()

Accept a single object argument with "file" property. Equivalent to passing an array containing a single object.

### b.ignore()

Accept arrays as well as single values.

### b.exclude()

Accept arrays as well as single values. Values can be `.require()` compatible objects in which case the "expose" or "file" value will be excluded.

### Event: bundled

Emitted after `.bundle()` has been called and completed successfully. Callbacks are passed the browserified and mutated output.