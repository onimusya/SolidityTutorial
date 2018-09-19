
// Load library
const path = require('path');
const fs = require('fs');
const solc = require('solc');
const Web3 = require('web3')
const Tx = require('ethereumjs-tx');
//const sleep = require('sleep');
const SolidityFunction = require('web3/lib/web3/function');
const appConfig = require('./appconfig');
const _ = require('lodash');

var accounts = appConfig['accounts'];
var selectedHost = appConfig['networks'][ appConfig['settings']['selectedHost'] ];
var selectedAccountIndex = appConfig['settings']['selectedAccountIndex'];
var contractAddress = '';


// Retrieve the command line arguments
var argv = require('minimist')(process.argv.slice(2));


var solcInput = {
    language: "Solidity",
    sources: { },
    settings: {
        optimizer: {
            enabled: true
        },
        evmVersion: "byzantium",
        outputSelection: {
            "*": {
              "": [
                "legacyAST",
                "ast"
              ],
              "*": [
                "abi",
                "evm.bytecode.object",
                "evm.bytecode.sourceMap",
                "evm.deployedBytecode.object",
                "evm.deployedBytecode.sourceMap",
                "evm.gasEstimates"
              ]
            },
          }
    }

};


const web3 = new Web3(new Web3.providers.HttpProvider(selectedHost));
var gasPrice = web3.eth.gasPrice;
var gasPriceHex = web3.toHex(gasPrice);
var gasLimitHex = web3.toHex(6000000);
var block = web3.eth.getBlock("latest");
var nonce =  web3.eth.getTransactionCount(accounts[selectedAccountIndex].address);
var nonceHex = web3.toHex(nonce);


function findImports(importFile) {
    console.log("Import File:" + importFile);

    // Try to find it under node_modules folder
    try {
        result = fs.readFileSync("node_modules/" + importFile, 'utf8');
        return { contents: result };
    } catch (error) {
        console.log(error.message);
        return { error: 'File not found' };
    }

}

function waitForTransactionReceipt(hash) {
    console.log('Waiting for contract to be mined');
    const receipt = web3.eth.getTransactionReceipt(hash);
    // If no receipt, try again in 1s
    if (receipt == null) {
        setTimeout(() => {
            waitForTransactionReceipt(hash);
        }, 1000);
    } else {
        // The transaction was mined, we can retrieve the contract address
        console.log('Contract address: ' + receipt.contractAddress);
        //testContract(receipt.contractAddress);
    }
}

function buildContract(contract) {
    let contractFile = 'contracts/' + contract;
    let jsonOutputName = path.parse(contract).name + '.json';
    let result = false;

    try {
        result = fs.statSync(contractFile);
    } catch (error) {
        console.log(error.message);
        return false;
    }

    let contractContent = fs.readFileSync(contractFile, 'utf8');

    console.log('Contract File: ' + contract);

    solcInput.sources[contract] = {
        "content": contractContent
    };
    
    let solcInputString = JSON.stringify(solcInput);
    let output = solc.compileStandardWrapper(solcInputString, findImports);

    let jsonOutput = JSON.parse(output);
    let isError = false;

    if (jsonOutput.errors) {
        jsonOutput.errors.forEach(error => {
            console.log(error.severity + ': ' + error.component + ': ' + error.formattedMessage);
            if (error.severity == 'error') {
                isError = true;
            }
        });
    } 

    if (isError) {
        // Compilation errors
        console.log('Compile error!');
        return false;
    }        

    let formattedJson = JSON.stringify(jsonOutput, null, 4);

    //console.log(formattedJson);
    fs.writeFileSync('./build/contracts/' + jsonOutputName, formattedJson);

    console.log('==============================');

    return true;
}

function deployContract(contract) {
    let jsonOutputName = path.parse(contract).name + '.json';
    let jsonFile = './build/contracts/' + jsonOutputName;

    let result = false;

    try {
        result = fs.statSync(jsonFile);
    } catch (error) {
        console.log(error.message);
        return false;
    }

    let contractJsonContent = fs.readFileSync(jsonFile, 'utf8');    
    let jsonOutput = JSON.parse(contractJsonContent);

    var abi = jsonOutput['contracts'][contract][path.parse(contract).name]['abi'];
    var bytecode = jsonOutput['contracts'][contract][path.parse(contract).name]['evm']['bytecode']['object'];
    //console.log(bytecode);
    var tokenContract = web3.eth.contract(abi);
    var contractData = tokenContract.new.getData('Francis Token', 'FST', 18, 100000000 * 1e18, {
        data: '0x' + bytecode
    });

    var rawTx = {
        nonce: nonceHex,
        gasPrice: gasPriceHex,
        gasLimit: gasLimitHex,
        data: contractData,
        from: accounts[selectedAccountIndex].address
    };

    console.log(rawTx);
    var privateKey = new Buffer(accounts[selectedAccountIndex].key, 'hex')

    var tx = new Tx(rawTx);
    tx.sign(privateKey);
    var serializedTx = tx.serialize();

    var receipt = null;

    web3.eth.sendRawTransaction(serializedTx.toString('hex'), (err, hash) => {
        if (err) { 
            console.log(err); return; 
        }
    
        // Log the tx, you can explore status manually with eth.getTransaction()
        console.log('Contract creation tx: ' + hash);
    
        // Wait for the transaction to be mined
        while (receipt == null) {

            receipt = web3.eth.getTransactionReceipt(hash);
            //sleep.sleep(1);
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
        }

        console.log('Contract address: ' + receipt.contractAddress);
        console.log('Contract File: ' + contract);

        // Update JSON
        jsonOutput['contracts'][contract]['contractAddress'] = receipt.contractAddress;

        let formattedJson = JSON.stringify(jsonOutput, null, 4);

        //console.log(formattedJson);
        fs.writeFileSync(jsonFile, formattedJson);
    
        console.log('==============================');
    
    });
    
    return true;
}

function contractInfo(contract) {
    let jsonOutputName = path.parse(contract).name + '.json';
    let jsonFile = './build/contracts/' + jsonOutputName;

    let result = false;

    try {
        result = fs.statSync(jsonFile);
    } catch (error) {
        console.log(error.message);
        return false;
    }

    let contractJsonContent = fs.readFileSync(jsonFile, 'utf8');    
    let jsonOutput = JSON.parse(contractJsonContent);

    let abi = jsonOutput['contracts'][contract][path.parse(contract).name]['abi'];
    let contractAddress = jsonOutput['contracts'][contract]['contractAddress'];

    // Francis Token Contract
    let tokenContract = web3.eth.contract(abi).at(contractAddress);
    let tokenDecimals = tokenContract.decimals();

    console.log('My wallet address: ' + accounts[selectedAccountIndex].address);
    console.log('Token Name: ' + tokenContract.name.call());
    console.log('Token Symbol: ' + tokenContract.symbol());   
    console.log('Token Decimal: ' + tokenContract.decimals());   
    console.log('Token Total Supply: ' + (tokenContract.totalSupply()));   
    console.log('Token Capped: ' + (tokenContract.cap() / (Math.pow(10, tokenDecimals))));
    console.log('Is Minter: ' + tokenContract.isMinter.call(accounts[selectedAccountIndex].address));
    console.log('My Token Balance: ' + (tokenContract.balanceOf.call(accounts[selectedAccountIndex].address) / Math.pow(10, tokenDecimals) ) );

    return true;
}

// Display some client information
if (typeof argv.info !== 'undefined') {
    console.log('==============================');
    console.log('Gas Price: ' + gasPrice);
    console.log('Gas Limit: ' + gasLimitHex);
    console.log("Latest Block Gas Limit: " + block.gasLimit);
    console.log('Nonce: ' + nonce + '(' + nonceHex + ')');
    console.log('==============================');
}

if (typeof argv.build !== 'undefined') {
    // Build contract

    let contracts = appConfig['build']['contracts'];
    contracts.forEach(contract => {
        let result = buildContract(contract);
        if (!result) {
            return;
        }
    });


    return;
}

if (typeof argv.deploy !== 'undefined') {
    // Build contract

    let contracts = appConfig['build']['contracts'];
    contracts.forEach(contract => {
        let result = deployContract(contract);
        if (!result) {
            return;
        }
    });

    return;
}

if (typeof argv.contractinfo !== 'undefined') {

    let contracts = appConfig['build']['contracts'];
    contracts.forEach(contract => {
        let result = contractInfo(contract);
        if (!result) {
            return;
        }
    });

    return;

}

if (typeof argv.mint !== 'undefined') {

    // Mint Francis Token
    let contractSource = 'FrancisToken.sol';
    let jsonOutputName = path.parse(contractSource).name + '.json';
    let jsonFile = './build/contracts/' + jsonOutputName;

    let contractJsonContent = fs.readFileSync(jsonFile, 'utf8');    
    let jsonOutput = JSON.parse(contractJsonContent);

    let abi = jsonOutput['contracts'][contractSource][path.parse(contractSource).name]['abi'];
    let contractAddress = jsonOutput['contracts'][contractSource]['contractAddress'];

    // Francis Token Contract
    let tokenContract = web3.eth.contract(abi).at(contractAddress);
    let tokenDecimals = tokenContract.decimals();

    let tokenToMint = argv.mint * Math.pow(10, tokenDecimals);

    // Mint to my wallet address
    let privateKey = new Buffer(accounts[selectedAccountIndex].key, 'hex');

    console.log('Mint ' + argv.mint + ' token to address ' + accounts[selectedAccountIndex].address);

    let solidityFunction = new SolidityFunction('', _.find(abi, { name: 'mint' }), '');
    let payloadData = solidityFunction.toPayload([accounts[selectedAccountIndex].address, tokenToMint]).data;

    let rawTx = {
        nonce: nonceHex,
        gasPrice: gasPriceHex,
        gasLimit: gasLimitHex,
        to: contractAddress,
        from: accounts[selectedAccountIndex].address,
        data: payloadData
    };

    let tx = new Tx(rawTx);
    tx.sign(privateKey);
    
    var serializedTx = tx.serialize();    
    web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), function (err, hash) {
        if (err) {
            console.log('Error:');
            console.log(err);
        }
        else {
            console.log('Transaction receipt hash pending');
            console.log(hash);
        }
    });

    return;
}

console.log('End here.');