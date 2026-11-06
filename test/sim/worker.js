// Runs one seed for simulation.js's runSeeds and hands the result back to the parent process.
'use strict';

const { simulate } = require('./simulation');

const { seed, opts } = JSON.parse(process.argv[2]);
simulate({ seed, opts })
  .then((r) => process.send(r, () => process.exit(0)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
