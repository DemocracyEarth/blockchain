#!/usr/bin/env node
/**
    ____                _    __      __
   / __ \___  ___  ____| |  / /___  / /____
  / /_/ / _ \/ _ \/ ___/ | / / __ \/ __/ _ \
 / ____/  __/  __/ /   | |/ / /_/ / /_/  __/
/_/    \___/\___/_(_)  |___/\____/\__/\___/

@name peer.vote
@description a blockchain for political economies using votes as tokens.
@version 0.0.1
@author Democracy Earth Foundation
@license MIT
@copyright 2017
*/

'use strict';

// dependencies
const program = require('commander');
const crypto = require('crypto-js');
const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');

// app
const log = require('./log');

// environment
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const P2P_PORT = process.env.P2P_PORT || 6001;
const initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];

class Block {
  constructor(index, previousHash, timestamp, data, hash) {
    this.index = index;
    this.previousHash = previousHash.toString();
    this.timestamp = timestamp;
    this.data = data;
    this.hash = hash.toString();
  }
}

/**
* @summary randomness
*/
class Entropy {
  constructor() {
    return Math.random();
  }
}


/**
* @summary 256 bit public & private key
*/
class Address {
  constructor() {
    this.privateKey = this.hexString(256);
    this.publicKey = '';
  }

  hexString(length) {
    let ret = '';
    while (ret.length < length) {
      ret += new Entropy().toString(16).substring(2);
    }
    return ret.substring(0, length);
  }
}

/**
* @summary address collection to send and receive funds
*/
class Wallet {
  constructor() {
    this.index = [];

    // first Address
    this.index.push(this.createAddress());
  }

  createAddress() {
    return new Address();
  }
}

/**
* @summary an operation sending funds from source to target
*/
class Transaction {
  constructor(input, output, coins) {
    this.input = input;
    this.output = output;
    this.coins = coins;
  }
}

const sockets = [];
const MessageType = {
  QUERY_LATEST: 0,
  QUERY_ALL: 1,
  RESPONSE_BLOCKCHAIN: 2,
};

const rules = {
  BLOCK_SIZE_MAX: 1000,
  BLOCK_TIME_INTERVAL: 1000,
  TOTAL_COINS: 2100000000,
  COINBASE_PER_BLOCK: 50,
  INFLATION_MULTIPLIER: 0.5,
  INFLATION_BLOCK_LENGTH: 240000,
};

const wallet = new Wallet();
const getGenesisBlock = () => new Block(0, '0', 1465154705, 'let there be light.', '816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7');
let blockchain = [getGenesisBlock()];
const getLatestBlock = () => blockchain[blockchain.length - 1];

const write = (ws, message) => ws.send(JSON.stringify(message));
const broadcast = message => sockets.forEach(socket => write(socket, message));
const queryChainLengthMsg = () => ({ type: MessageType.QUERY_LATEST });
const queryAllMsg = () => ({ type: MessageType.QUERY_ALL });
const responseChainMsg = () => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify(blockchain),
});
const responseLatestMsg = () => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify([getLatestBlock()]),
});

const calculateHash = (index, previousHash, timestamp, data) => crypto.SHA256(index + previousHash + timestamp + data).toString();
const calculateHashForBlock = block => calculateHash(block.index, block.previousHash, block.timestamp, block.data);

const isValidNewBlock = (newBlock, previousBlock) => {
  if (previousBlock.index + 1 !== newBlock.index) {
    log('invalid index');
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    log('invalid previoushash');
    return false;
  } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
    log(`${typeof (newBlock.hash)} ${typeof calculateHashForBlock(newBlock)}`);
    log(`invalid hash: ${calculateHashForBlock(newBlock)} ${newBlock.hash}`);
    return false;
  }
  return true;
};

const addBlock = (newBlock) => {
  if (isValidNewBlock(newBlock, getLatestBlock())) {
    blockchain.push(newBlock);
  }
};

const generateNextBlock = (blockData) => {
  const previousBlock = getLatestBlock();
  const nextIndex = previousBlock.index + 1;
  const nextTimestamp = new Date().getTime() / 1000;
  const nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
  return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
};

const isValidChain = (blockchainToValidate) => {
  if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(getGenesisBlock())) {
    return false;
  }
  const tempBlocks = [blockchainToValidate[0]];
  for (let i = 1; i < blockchainToValidate.length; i += 1) {
    if (isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
      tempBlocks.push(blockchainToValidate[i]);
    } else {
      return false;
    }
  }
  return true;
};

const replaceChain = (newBlocks) => {
  if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
    log('Received blockchain is valid. Replacing current blockchain with received blockchain');
    blockchain = newBlocks;
    broadcast(responseLatestMsg());
  } else {
    log('Received blockchain invalid');
  }
};

const handleBlockchainResponse = (message) => {
  const receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
  const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
  const latestBlockHeld = getLatestBlock();
  if (latestBlockReceived.index > latestBlockHeld.index) {
    log(`blockchain possibly behind. We got: ${latestBlockHeld.index} Peer got: ${latestBlockReceived.index}`);
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      log('We can append the received block to our chain');
      blockchain.push(latestBlockReceived);
      broadcast(responseLatestMsg());
    } else if (receivedBlocks.length === 1) {
      log('We have to query the chain from our peer');
      broadcast(queryAllMsg());
    } else {
      log('Received blockchain is longer than current blockchain');
      replaceChain(receivedBlocks);
    }
  } else {
    log('received blockchain is not longer than received blockchain. Do nothing');
  }
};

const initMessageHandler = (ws) => {
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    log(`Received message ${JSON.stringify(message)}`);
    switch (message.type) {
      case MessageType.QUERY_LATEST:
        write(ws, responseLatestMsg());
        break;
      case MessageType.QUERY_ALL:
        write(ws, responseChainMsg());
        break;
      case MessageType.RESPONSE_BLOCKCHAIN:
      default:
        handleBlockchainResponse(message);
        break;
    }
  });
};

const initErrorHandler = (ws) => {
  const closeConnection = (socket) => {
    log(`connection failed to peer: ${ws.url}`);
    sockets.splice(sockets.indexOf(socket), 1);
  };
  ws.on('close', () => closeConnection(ws));
  ws.on('error', () => closeConnection(ws));
};

const initConnection = (ws) => {
  sockets.push(ws);
  initMessageHandler(ws);
  initErrorHandler(ws);
  write(ws, queryChainLengthMsg());
};

const initP2PServer = () => {
  const server = new WebSocket.Server({ port: P2P_PORT });
  server.on('connection', ws => initConnection(ws));
  log(`listening websocket p2p port on: ${P2P_PORT}`);
};

const connectToPeers = (newPeers) => {
  newPeers.forEach((peer) => {
    const ws = new WebSocket(peer);
    ws.on('open', () => initConnection(ws));
    ws.on('error', () => {
      log('connection failed');
    });
  });
};

const initWallet = () => {
  // TODO: everything
  log('init wallet');
};

const initHttpServer = () => {
  log('Initiating HTTP server.....');
  const app = express();
  app.use(bodyParser.json());
  app.get('/blocks', (req, res) => res.send(JSON.stringify(blockchain, null, 4)));
  app.post('/mineBlock', (req, res) => {
    const newBlock = generateNextBlock(req.body.data);
    addBlock(newBlock);
    broadcast(responseLatestMsg());
    log(`block added: ${JSON.stringify(newBlock)}`);
    res.send();
  });
  app.get('/peers', (req, res) => {
    res.send(sockets.map(s => `${s._socket.remoteAddress}:${s._socket.remotePort}`));
  });
  app.post('/addPeer', (req, res) => {
    connectToPeers([req.body.peer]);
    res.send();
  });
  app.get('/wallet', (req, res) => {
    res.send(JSON.stringify(wallet));
    initWallet();
  });
  app.get('/addAddress', (req, res) => {
    // TODO: create an address
    log(res);
  });
  app.listen(HTTP_PORT, () => log(`Listening http on port: ${HTTP_PORT}`));
};

const server = (start) => {
  if (start) {
    connectToPeers(initialPeers);
    initHttpServer();
    initP2PServer();
  }
};

const init = () => {
  program
    .version('0.0.1')
    .description('Peer.Vote - A blockchain for democratic governance..')
    .command('init [httpPort]', 'Start blockchain node server.')
    .command('addpeer [p2pPort]', 'Connect to a peer.')
    .command('mine [data]', 'Mine a new block.')
    .command('blockchain', 'Show blockchain data');

  program.parse(process.argv);
};

init();
