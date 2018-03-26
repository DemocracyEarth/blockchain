<p align="center">
<img src="https://github.com/DemocracyEarth/vote/raw/master/images/democracy-earth.png" width="400" title="Democracy Earth Foundation">
</p>

# Peer.Vote

A delegated proof of stake block chain for votes that is resistant to coercion by preventing monopoly formation using quadratic voting under a liquid democracy.

Our goal is to create the smallest possible chain able to store the largest quantity of social political interactions. The aim is to develop it in the least amount of lines under the most widespread development language. Inspired by the [Naivechain](https://medium.com/@lhartikk/a-blockchain-in-200-lines-of-code-963cc1cc0e54) project developed by [Lucas Hartikk](http://github.com/lhartikk), this project is meant strictly for research purposes and is not meant to be put in live production as it is right now. In a similar fashion to what Minix was for Linux, it is to be used for learning as we don't see the tech mature enough yet for resisting Nation-State actors.

## Rules

* On-chain governance using _votes_ as tokens.
* Transactions can only be done in quadratic quantities to prevent a monopoly as end-game.
* Mining reward is airdropped to active nodes that get voted valid if it's a singular human identity.
* Taxing is made to idle coins that are not allocated to _contracts_ or delegated to _identities_.
* Voting is real time (never ending polls) to prevent violent coercion _afk_.
* A dPoS mechanism that can be implemented in smartphone-scale hardware that is energy saving & _vote_ based.
* A logchain able to store _contracts_, _identities_ & _votes_ in a compressed form.
* Implemented in a widespread language using best practices.

### Motivation
All the current implementations of blockchains are tightly coupled with the larger context and problems they (e.g. Bitcoin or Ethereum) are trying to solve. This makes understanding blockchains a necessarily harder task, than it must be. Especially source-code-wisely. This project is an attempt to provide as concise and simple implementation of a blockchain as possible.


### What is blockchain
[From Wikipedia](https://en.wikipedia.org/wiki/Blockchain_(database)) : Blockchain is a distributed database that maintains a continuously-growing list of records called blocks secured from tampering and revision.

### Key concepts of Naivechain
Check also [this blog post](https://medium.com/@lhartikk/a-blockchain-in-200-lines-of-code-963cc1cc0e54#.dttbm9afr5) for a more detailed overview of the key concepts
* HTTP interface to control the node
* Use Websockets to communicate with other nodes (P2P)
* Super simple "protocols" in P2P communication
* Data is not persisted in nodes
* No proof-of-work or proof-of-stake: a block can be added to the blockchain without competition


![alt tag](naivechain_blockchain.png)

![alt tag](naivechain_components.png)

### Quick start
(set up two connected nodes and mine 1 block)
```
npm install
HTTP_PORT=3001 P2P_PORT=6001 npm start
HTTP_PORT=3002 P2P_PORT=6002 PEERS=ws://localhost:6001 npm start
curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/mineBlock
```

### Quick start with Docker
(set up three connected nodes and mine a block)
###
```sh
docker-compose up
curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/mineBlock
```

### HTTP API
##### Get blockchain
```
curl http://localhost:3001/blocks
```
##### Create block
```
curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/mineBlock
```
##### Add peer
```
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6001"}' http://localhost:3001/addPeer
```
#### Query connected peers
```
curl http://localhost:3001/peers
```
