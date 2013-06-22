Forkraft
========

a node cluster helper lib.

features: clusterize, messaging

### Install
```
	npm install forkraft
```

## clusterize
typical server.js:
```
var clusterize = require('forkraft').clusterize;

clusterize({
	worker: function() {
	    console.log('I am a worker');
	},
	master: function() {
		console.log('I am the master');
	},
	reforkOnDeath: false,
	workersToCoresRatio: 0.5
});

//on a 4 cores system will (eventually) print 'I am a worker' twice and 'I am the master' once

```
Same as the above only this time called directly:
```
var clusterize = require('forkraft').clusterize;

clusterize(
	function() {
	    console.log('I am a worker');
	}, 
	function() {
		console.log('I am the master');
	},
	false,
	0.5);
```
files instead of functions:
```
var clusterize = require('forkraft').clusterize;

clusterize({
	worker: 'worker.js',
	master: 'master.js'
});
```

#### clusterize options reference:
- *worker*            - required, a function to invoke on worker processes or a name of a javascript filename

- *master*            - optional, will be fired after forking code, can be a function or a javascript filename

- *reforkOnDeath*       - optional, whether to refork processes when a worker dies, defaults to true

- *workersToCoresRatio* - optional, workers to cores ratio expressed in numerical notation 
                            (i.e 0.5 = 50% of the cores etc.), default is 1 (100%). In any case there will
	                        always be a minimum of one worker. Values over 100% are acceptable and will spawn more workers than cores. 
	                        The calculation will round the result down (i.e on a system with 5 cores, 0.5 will be rounded down to 2)

- *workersCount*        - optional, en explicit number of worker to start, this will override workersToCoresRatio.
                            as with workerstoCoresRation a minumum of 1 worker is enforced.

- *workerDeathCallback* - optional, a callback to invoke on worker death. specifying this param will override
	                        reforkOnDeath behavior.

- *env* 				- optional, environment of the worker

-----------------------------------------------------------------------------------------------------------
##Messaging
####Simple messaging:
instead of this code in a worker:
```	
	process.on('message', function(message) {
		if (message.type && message.type === 'myMessageType')
			doSomethingWithMyMessage(message);
	});
```
use this:
```	
	function doSomethingWithMyMessage(msg) { // will only get called when message type matches }

	var Messaging = require('forkraft').Messaging;
	Messaging.on('myMessageType', doSomethingWithMyMessage);
```
also works the same in master process, instead of:
```
	var cluster = require('cluster');
	
	// spawn cluster and message handler code omitted...

	for (var id in cluster.workers) {		 
		cluster.workers[id].on('message', messageHandler);
	}
```
do this:
```
	function doSomethingWithMyMessage(msg) { // will only get called when message type matches }

	var Messaging = require('forkraft').Messaging;
	Messaging.on('myMessageType', doSomethingWithMyMessage);
```
Yes, it looks exactly the same as the code used in the worker...
####Broadcast
at master:
```
	// code for creating cluster in master omitted ...

	var Messaging = require('forkraft').Messaging;
	Messaging.setupMasterMessageRelay();

	Messaging.broadcast({ type: 'boom' })
```
at worker1:
```
	var Messaging = require('forkraft').Messaging;
	process.on('message', Messaging.handleMessage('boom'), function(boomMessage) {
		Messaging.broadcast({ type: 'bam' });
	});
```
at worker2:
```
var Messaging = require('forkraft').Messaging;
process.on('message', Messaging.handleMessage('bam', function() {
	console.log('boom on worker1 set off a bam on worker2');
}));
```
at worker3:
```
var Messaging = require('forkraft').Messaging;
process.on('message', Messaging.handleMessage('bam', function() {
	console.log('boom on worker1 set off a bam on worker3');
}));
```
###TODO
expand tests