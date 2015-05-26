var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var $u = require('util');
var path = require('path');
var fs = require('fs');

function clusterize2(params) {
    if (arguments.length > 1 || typeof(params) === 'function' || typeof(params) === 'string') 
        return clusterize.apply(null, Array.prototype.slice.call(arguments, 0));

    params.workerFn = params.workerFn || params.worker;

    if (!params.workerFn || arguments.length === 0)
        throw new Error('must specify workerFn');

    params.masterFn = params.masterFn || params.master;

    clusterize(params.workerFn, params.masterFn, params.reforkOnDeath, params.workersToCoresRatio, params.workersCount, params.workerDeathCallback, params.env);
}

/**
 *  see readme for details
 */
function clusterize(workerFn, masterFn, reforkOnDeath, workersToCoresRatio, workersCount, workerDeathCallback, env) {
    
    if (cluster.isMaster) {

        var timeouts = [];

        cluster.on('fork', function(worker) {
            timeouts[worker.id] = setTimeout(failedToFork, 30000);
        });

        cluster.on('online', function(worker) {
            clearTimeout(timeouts[worker.id]);
            console.log('worker %s spawned', worker.id);
        });

        cluster.on('listening', function(worker, address) {
            clearTimeout(timeouts[worker.id]);
            console.log('worker %s listening at %s', worker.id, $u.inspect(address));
        });

        cluster.on('exit', function(worker, code, signal) {
            clearTimeout(timeouts[worker.id]);
            console.log('worker %s exit. code: [%s], signal:[%s]', worker.id, code, signal);
        });
        
        if (typeof(reforkOnDeath) === 'undefined') reforkOnDeath = true;
        
        var _finalCount = numCPUs;

        if (workersToCoresRatio) 
            _finalCount = Math.floor(numCPUs * workersToCoresRatio);
            
        if (workersCount) 
            _finalCount = workersCount;
            
        _finalCount = Math.max(_finalCount, 1); // minimum of 1 worker.
        
        console.log('cluster size is %s', _finalCount);

        if (typeof(workerFn) === 'string') {
            cluster.setupMaster({
              exec : workerFn
            });
        }

        for (var i = 0; i < _finalCount; i++) {
            console.log('spawning worker #%s', i);
            cluster.fork(env);
        }
        
        var defaultDeathCallback = function(worker) {
            if (reforkOnDeath) {
                console.log('worker %s has died, respawning', worker.id);
                cluster.fork(env);
            }
        };

        if (workerDeathCallback)
            onDeathCallback = workerDeathCallback;
        else
            onDeathCallback = defaultDeathCallback;

        cluster.on('exit', function(worker, code, signal) {
            onDeathCallback(worker, code, signal, env, function() { defaultDeathCallback(worker) });
        });

        if (typeof(masterFn) === 'function') {
            masterFn();
        } else if (typeof(masterFn) === 'string') {
            module.parent.parent.require(fixMasterPath(masterFn));        
        }

    } else {
        // this should only execute when workerFn is a function 
        if (typeof(workerFn) !== 'function')  throw new Error('invalid worker');
        workerFn();
    }
}

function fixMasterPath(masterPath) {
    var start = masterPath.substring(0, 2);

    if (start === './' || start === '..')
        return masterPath;
    else
        return './' + masterPath;
}

function failedToFork() {
    console.log('failed to fork worker');
}

module.exports = clusterize2;