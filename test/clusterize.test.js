var assert = require('assert');
var numCPUs = require('os').cpus().length;
var child = require('child_process');
var path = require('path');
var $u = require('util');

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
});
