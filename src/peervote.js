#!/usr/bin/env node
/**
* @name peer.vote
* @description a blockchain for democratic governance.
* @version 0.0.1
* @author Democracy Earth Foundation
* @license MIT
* @copyright 2017
*/

'use strict';

const program = require('commander');

const init = () => {
  program
    .version('0.0.1')
    .description('A blockchain for democratic governance.')
    .command('server [httpPort]', 'Start blockchain node server.')
    .command('peer [p2pPort]', 'Connect to a peer.')
    .command('mine [data]', 'Mine a new block.')
    .command('blockchain', 'Show blockchain data');

  program.parse(process.argv);
};

init();

module.exports = program;
