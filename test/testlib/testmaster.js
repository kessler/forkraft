/*
	used to test the successfulness of executing master code as a string
*/
console.log(process.argv[2]);
setTimeout(function() {
	process.exit(0);
}, 1000);
