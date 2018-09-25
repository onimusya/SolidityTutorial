'use strict'

var IPFS = require('ipfs')
var Buffer = require('buffer/').Buffer;

var node = new IPFS({ repo: String(Math.random() + Date.now()) });

global.Buffer = Buffer;
global.node = node;
