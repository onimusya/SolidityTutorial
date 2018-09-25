'use strict'

var IPFS = require('ipfs')
var Buffer = require('buffer/').Buffer;
var bs58 = require('bs58');

var node = new IPFS({ repo: String(Math.random() + Date.now()) });

global.Buffer = Buffer;
global.node = node;
global.bs58 = bs58;