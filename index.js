"use strict";

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var browserify = require('browserify');
var watchify = require('watchify');
var typedArgs = require('typed-args');
var patchBrowserify = require('./lib/patchBrowserify');
var flush = require('./lib/flush');
var mutate = require('./lib/mutate');
var isStream = require('./lib/is-stream');
var isOptions = require('./lib/is-options');

var middleware = module.exports = function(files, options, callback) {
	var args = typedArgs(arguments);

	files = args.get(_.isString, _.isArray, isStream);
	options = _.assign({}, middleware.settings, args.get(isOptions));
	callback = args.get(_.isFunction) || function() {};

	var opts = _.assign({}, options);
	delete opts.watch;
	delete opts.precompile;
	delete opts.mutate;
	delete opts.require;
	delete opts.external;
	delete opts.ignore;
	delete opts.exclude;

	var b = handler.browserify = patchBrowserify(files ? browserify(files, opts) : browserify(opts));
	var compiled = false;
	var source = null;
	var err = null;
	var pending = [];

	if (options.watch) {
		b = watchify(b);
		b.on('update', function(ids) {
			process.nextTick(function() {
				b.bundle();
			});
		});
	}

	b.bundle = _.wrap(b.bundle, function(bundle, callback) {
		compiled = true;

		if (!(callback instanceof Function)) {
			callback = function() {};
		}

		return bundle.call(this, function(e, s) {
			if (e) {
				callback.call(this, e);
				oncompiled(e);
			} else {
				s = s.toString();
				mutate(options.mutate, s, options, function(e, s) {
					callback.call(this, e, s);
					oncompiled(e, s);
				});
			}
		});
	});

	if (options.require != null) {
		b.require(options.require);
	}

	if (options.external != null) {
		b.external(options.external);
	}

	if (options.ignore != null) {
		b.ignore(options.ignore);
	}

	if (options.exclude != null) {
		b.exclude(options.exclude);
	}

	if (callback.call(this, b) !== false && (options.precompile == null || options.precompile)) {
		process.nextTick(function() {
			if (compiled) {
				return;
			}

			b.bundle(function(err) {
				if (err && pending.length === 0) {
					throw err;
				}
			});
		});
	}

	return handler;

	function oncompiled(e, s) {
		if (e) {
			err = e;
			source = null;
		} else {
			err = null;
			source = s;
			b.emit('bundled', s);
		}

		flush(pending);
	}

	function handler(req, res, next) {
		if (!compiled) {
			b.bundle();
		}
		
		if (err) {
			next(err);
		} else if (source) {
			res.type('text/javascript').send(source);
		} else {
			pending.push(handler.bind(null, req, res, next));
		}
	}
};

middleware.settings = {};