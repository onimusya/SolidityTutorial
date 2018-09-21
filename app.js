
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
const md5File = require('md5-file')

var accounts = appConfig['accounts'];
var selectedHost = appConfig['networks'][ appConfig['settings']['selectedHost'] ];
var selectedAccountIndex = appConfig['settings']['selectedAccountIndex'];
var contractAddress = '';


// Retrieve the command line arguments
var argv = require('minimist')(process.argv.slice(2), { string: ['checkminter'] });


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

    
    try {
        // Find in contracts folder first
        result = fs.readFileSync("contracts/" + importFile, 'utf8');
        return { contents: result };
    } catch (error) {
        // Try to look into node_modules
        try {
            result = fs.readFileSync("node_modules/" + importFile, 'utf8');
            return { contents: result };
        } catch (error) {
            console.log(error.message);
            return { error: 'File not found' };
        }    
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
    let jsonOutputFile = './build/contracts/' + jsonOutputName;
    let result = false;
    
    try {
        result = fs.statSync(contractFile);
    } catch (error) {
        console.log(error.message);
        return false;
    }

    let contractFileChecksum = md5File.sync(contractFile);

    try {
        fs.statSync(jsonOutputFile);
        
        let jsonContent = fs.readFileSync(jsonOutputFile, 'utf8');
        let jsonObject = JSON.parse(jsonContent);
        let buildChecksum = '';
        if (typeof jsonObject['contracts'][contract]['checksum'] != 'undefined') {
            buildChecksum = jsonObject['contracts'][contract]['checksum'];

            console.log('File Checksum: ' + contractFileChecksum);
            console.log('Build Checksum: ' + buildChecksum);

            if (contractFileChecksum === buildChecksum) {
                console.log('No build is required due no change in file.');
                console.log('==============================');
                return true;
            }
        }

    } catch (error) {
        // Any file not found, will continue build
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

    // Update the sol file checksum
    jsonOutput['contracts'][contract]['checksum'] = contractFileChecksum;

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

        // Update new nonce
        //nonce =  web3.eth.getTransactionCount(accounts[selectedAccountIndex].address);
        nonce++;
        nonceHex = web3.toHex(nonce);

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

if (typeof argv.tokensale !== 'undefined') {

    // Francis Token Contract
    let tokenSource = 'FrancisToken.sol';
    let jsonTokenFilename = path.parse(tokenSource).name + '.json';
    let jsonTokenFile = './build/contracts/' + jsonTokenFilename;

    let tokenJsonContent = fs.readFileSync(jsonTokenFile, 'utf8');    
    let tokenJsonOutput = JSON.parse(tokenJsonContent);

    let tokenAbi = tokenJsonOutput['contracts'][tokenSource][path.parse(tokenSource).name]['abi'];
    let tokenAddress = tokenJsonOutput['contracts'][tokenSource]['contractAddress'];
    let tokenContract = web3.eth.contract(tokenAbi).at(tokenAddress);

    // Francis Token Sale Contract
    let tokenSaleSource = 'FrancisTokenSale.sol';
    let jsonTokenSaleFilename = path.parse(tokenSaleSource).name + '.json';
    let jsonTokenSaleFile = './build/contracts/' + jsonTokenSaleFilename;

    let tokenSaleJsonContent = fs.readFileSync(jsonTokenSaleFile, 'utf8');    
    let tokenSaleJsonOutput = JSON.parse(tokenSaleJsonContent);

    let tokenSaleAbi = tokenSaleJsonOutput['contracts'][tokenSaleSource][path.parse(tokenSaleSource).name]['abi'];
    let tokenSaleAddress = tokenSaleJsonOutput['contracts'][tokenSaleSource]['contractAddress'];
    let tokenSaleContract = web3.eth.contract(tokenSaleAbi).at(tokenSaleAddress);


    let privateKey = new Buffer(accounts[selectedAccountIndex].key, 'hex');

    let result = false;

    console.log('Token Contract Address: ' + tokenAddress);
    console.log('Token Sale Contract Address: ' + tokenSaleAddress);

    function addPriceTier(tierTokenPrice, tierMaxSupply, tierTimestamp) {

        let solidityFunction = new SolidityFunction('', _.find(tokenSaleAbi, { name: 'addPriceTier' }), '');
        let payloadData = solidityFunction.toPayload([tierTokenPrice, tierMaxSupply, tierTimestamp]).data;
    
        let rawTx = {
            nonce: nonceHex,
            gasPrice: gasPriceHex,
            gasLimit: gasLimitHex,
            to: tokenSaleAddress,
            from: accounts[selectedAccountIndex].address,
            data: payloadData
        };
    
        let tx = new Tx(rawTx);
        tx.sign(privateKey);
        
        let serializedTx = tx.serialize();    
        /*
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
        */
       let receipt = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
       console.log ('Transaction Receipt: ' + receipt);
       
       return receipt;
    }

    if (typeof argv.isminter !== 'undefined') {

        // Check the token sale contract allow to mint token or not?
        tokenSaleContract.isMinter( ( error, status) => {
            if(!error) {
                console.log(JSON.stringify(status));
            } else {
                console.error(error);            
            }            
        });
        
        //console.log('IsMinter() exit.');
        return;
    }

    if (typeof argv.updatetokenaddress !== 'undefined') {
        let solidityFunction = new SolidityFunction('', _.find(tokenSaleAbi, { name: 'setTokenAddress' }), '');
        let payloadData = solidityFunction.toPayload([tokenAddress]).data;
    
        let rawTx = {
            nonce: nonceHex,
            gasPrice: gasPriceHex,
            gasLimit: gasLimitHex,
            to: tokenSaleAddress,
            from: accounts[selectedAccountIndex].address,
            data: payloadData
        };
    
        let tx = new Tx(rawTx);
        tx.sign(privateKey);
        
        let serializedTx = tx.serialize();    
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

    if (typeof argv.enableminter !== 'undefined') {

        // Add Token Sale Contract as Minter
        let solidityFunction = new SolidityFunction('', _.find(tokenAbi, { name: 'addMinter' }), '');
        let payloadData = solidityFunction.toPayload([tokenSaleAddress]).data;
    
        let rawTx = {
            nonce: nonceHex,
            gasPrice: gasPriceHex,
            gasLimit: gasLimitHex,
            to: tokenAddress,
            from: accounts[selectedAccountIndex].address,
            data: payloadData
        };

        let tx = new Tx(rawTx);
        tx.sign(privateKey);
        
        let serializedTx = tx.serialize();    
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

    if (typeof argv.checkminter !== 'undefined') {

        console.log ('Check Address: ' + argv.checkminter);

        tokenContract.isMinter( argv.checkminter, ( error, status) => {
            if(!error) {
                console.log(JSON.stringify(status));
            } else {
                console.error(error);            
            }            
        });

        return;
    }
    
    if (typeof argv.addpricetier !== 'undefined') {

        console.log('Add Price Tier -->');

        let tierTimestamp = 0;
        let tierTokenPrice = 0;
        let tierMaxSupply = 0;

        let tokenDecimals = tokenContract.decimals();
        console.log('Token Decimals: ' + tokenDecimals);

        if (typeof argv.date !== 'undefined') {
            tierTimestamp = new Date(argv.date).getTime() / 1000;
            console.log('Timestamp: ' + tierTimestamp);
        }

        if (typeof argv.tokenprice !== 'undefined') {
            tierTokenPrice = argv.tokenprice;
            console.log('Token Price: ' + tierTokenPrice);
        }

        if (typeof argv.maxsupply !== 'undefined') {
            tierMaxSupply = argv.maxsupply * Math.pow(10, tokenDecimals);
            console.log('Max Supply: ' + tierMaxSupply);
        }

        addPriceTier(tierTokenPrice, tierMaxSupply, tierTimestamp);

        return;
    }

    if (typeof argv.generatepricetiers !== 'undefined') {

        console.log('Generate Price Tier -->');

        let tokenDecimals = tokenContract.decimals();
        let tierTokenPrice = 10;
        let tierTimestamp = new Date('2018-09-20').getTime() / 1000;
        let tierMaxSupply = 10000  * Math.pow(10, tokenDecimals);

        addPriceTier(tierTokenPrice, tierMaxSupply, tierTimestamp);

        nonce++;
        nonceHex = web3.toHex(nonce);
        tierTokenPrice = 9;
        tierTimestamp = new Date('2018-09-21').getTime() / 1000;
        addPriceTier(tierTokenPrice, tierMaxSupply, tierTimestamp);

        nonce++;
        nonceHex = web3.toHex(nonce);
        tierTokenPrice = 8;
        tierTimestamp = new Date('2018-09-22').getTime() / 1000;
        addPriceTier(tierTokenPrice, tierMaxSupply, tierTimestamp);

        nonce++;
        nonceHex = web3.toHex(nonce);
        tierTokenPrice = 7;
        tierTimestamp = new Date('2018-09-23').getTime() / 1000;
        addPriceTier(tierTokenPrice, tierMaxSupply, tierTimestamp);

        nonce++;
        nonceHex = web3.toHex(nonce);
        tierTokenPrice = 6;
        tierTimestamp = new Date('2018-09-24').getTime() / 1000;
        addPriceTier(tierTokenPrice, tierMaxSupply, tierTimestamp);

    }

    if (typeof argv.pricetierscount !== 'undefined') {
        
        tokenSaleContract.priceTiersCount( ( error, status) => {
            if(!error) {
                console.log ('Price Tier Count: ' + status);
            } else {
                console.error(error);            
            }            
        });

        return;

    }

    if (typeof argv.getpricetier !== 'undefined') {

        console.log('Get Price Tier -> ');
        
        tokenSaleContract.getPriceTier( argv.getpricetier, ( error, status) => {
            if(!error) {
                console.log(JSON.stringify(status));
                let tierDate = new Date(status[3] * 1000);
                console.log ('Tier Date: ' + tierDate.getUTCFullYear() + '-' 
                    + (tierDate.getUTCMonth()+1) + '-' + tierDate.getUTCDate() + ' ' 
                    + tierDate.getUTCHours() + ':' + tierDate.getUTCMinutes() + ':' + tierDate.getUTCSeconds());

            } else {
                console.error(error);            
            }            
        });

        return;

    }

    if (typeof argv.getcurrentpricetierindex !== 'undefined') {
        console.log('Get Current Price Tier Index -> ');

        tokenSaleContract.getCurrentPriceTierIndex( ( error, status) => {
            if(!error) {
                console.log(JSON.stringify(status));
            } else {
                console.error(error);            
            }            
        });

    }
    return;
}


console.log('End here.');