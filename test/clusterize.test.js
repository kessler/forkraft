var assert = require('assert');
var numCPUs = require('os').cpus().length;
var child = require('child_process');
var path = require('path');
var $u = require('util');
var clusterize = require('../lib/clusterize');
//var testmaster = require('./testlib/testmaster');

describe('clusterize', function () {

	it('spawns a worker process', function(done) {
		this.timeout(10000);
		
		var simpleServer = path.join(__dirname, 'testlib','simpleserver.js');
		
		child.exec('node ' + simpleServer + ' hello', function(error, stdout, stderr) {
			
			if (error !== null)
				throw error;

			if (stderr !== '') 
				throw new Error(stderr);
			
			var splitted = stdout.split('\n');
			var found = 0;
			for (var i = 0; i < splitted.length; i++)
				if (splitted[i] === 'hello') found++;

			assert.strictEqual(found, numCPUs);

			done();
		});
	});

	it.skip('resolves master properly', function(done) {
		/*
			run a server like this:
			clusterize('./testlib/testworker.js', './testlib/testmaster.js');
		*/

		this.timeout(10000);
		
		var server = path.join(__dirname, 'testlib', 'testserver.js');
		
		child.exec('node ' + server + ' hello', function(error, stdout, stderr) {
			
			if (error !== null)
				throw error;

			if (stderr !== '') 
				throw new Error(stderr);
			
			var splitted = stdout.split('\n');
			var found = 0;
			for (var i = 0; i < splitted.length; i++)
				if (splitted[i] === 'hello') found++;

			assert.strictEqual(found, 1);

			done();
		});
		
	});
});
