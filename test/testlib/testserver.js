var clusterize = require('forkraft').clusterize;

clusterize({
	worker: 'testworker.js', 
	master: 'testmaster.js'
});