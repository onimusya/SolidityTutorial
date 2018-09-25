
var TokenSale = function () {
    "use strict";

    return {

        props: {
            tokenAddress: "",
            tokenSaleAddress: "",
            tokenAbi: [],
            tokenSaleAbi: [],
            signedIn: false,
            web3: null,
            tokenContract: null,
            tokenSaleContract: null,
            tokenInfo: {
                name: '',
                symbol: '',
                decimals: 0,
                totalSupply: 0
            }
        },

        init: function (option, callback) {
            var tsObj = this;
            // Download Token contract json files
            $.ajax({
                url: '/assets/contracts/FrancisToken.json'
            }).done(function (data) {
                console.log('[TokenSale.init] Data: ' + JSON.stringify(data));
                tsObj.props.tokenAddress = data['contractAddress'];
                tsObj.props.tokenAbi = data['abi'];
                tsObj.props.tokenContract = web3.eth.contract(tsObj.props.tokenAbi).at(tsObj.props.tokenAddress);
                // Download Token Sale contract json file
                $.ajax({
                    url: '/assets/contracts/FrancisTokenSale.json'
                }).done(function(data) {
                    console.log('[TokenSale.init] Data: ' + JSON.stringify(data));
                    tsObj.props.tokenSaleAddress = data['contractAddress'];
                    tsObj.props.tokenSaleAbi = data['abi'];   
                    tsObj.props.tokenSaleContract = web3.eth.contract(tsObj.props.tokenSaleAbi).at(tsObj.props.tokenSaleAddress);

                    // Retrieve contract address & abi
                    tsObj.connectWithBlockchain(callback);

                }).fail(function(xhr, textStatus, errorThrown) {
                    console.log('[TokenSale.init] Error: (Download FrancisTokenSale.json) ' + errorThrown);
                    if (callback) {
                        callback(errorThrown, false);
                    }    
                });

            }).fail(function (xhr, textStatus, errorThrown) {
                console.log('[TokenSale.init] Error: (Download FrancisToken.json) ' + errorThrown);
                if (callback) {
                    callback(errorThrown, false);
                }
            });
            
        },

        connectWithBlockchain: function (callback) {
            try {

                if (typeof web3 === "undefined") {
                    console.log('[TokenSale.connectWithBlockchain()] MetaMask is not installed.');
                    if (callback) {
                        callback("Please install MetaMask.", false);
                    }

                } else {

                    if (typeof web3.eth.defaultAccount === "undefined") {
                        console.log('[TokenSale.connectWithBlockchain()] No sign in');
                        this.props.signedIn = false;    
                        if (callback) {
                            callback("MetaMask is not sign in.", false);
                        }                        
                        return;

                    } else {
                        this.props.web3 = web3;
                        this.props.signedIn = true;                        
                        console.log('[TokenSale.connectWithBlockchain()] Sign In: ' + web3.eth.defaultAccount);    
                    }

                    switch (web3.version.network) {
                        case '1':
                            console.log('[TokenSale.connectWithBlockchain()] Connect to Main Net.' )
                            break;
    
                        case '3':
                            console.log('[TokenSale.connectWithBlockchain()] Connect to Ropsten Test Net.' )
                            break;
    
                        case '4':
                            console.log('[TokenSale.connectWithBlockchain()] Connect to Ringkeby Test Net.' )
                            break;
    
                        case '42':
                            console.log('[TokenSale.connectWithBlockchain()] Connect to Kovan Test Net.' )
                            break;
    
                        default:
                            console.log('[TokenSale.connectWithBlockchain()] Connect to unknown network (' + web3.version.network + ').');
                            break;
    
                    }
                    
                    if (web3.currentProvider.isMetaMask) {
                        console.log('[TokenSale.connectWithBlockchain()] Provider is MetaMask.'); 
                    }
                    

                    var tsObj = this;

                    this.props.tokenContract.name(function (err, result) {
                        if (err) {
                            console.log("[TokenSale.connectWithBlockchain()] Error: (Get token name) " + err);
                            if (callback) {
                                callback(err, false);
                            }        
                        } else {
                            console.log("[TokenSale.connectwithBlockchain()] Token Name: " + result);          
                            tsObj.props.tokenInfo.name = result;
                            if (callback) {
                                callback(false, 'success');
                            }
                        }
                    });

                }

                //this.props.w3 = new Web3 (new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/a19b9a56da2c4e91ae0fac4ebdb88060"));
                //this.props.httpContract = this.props.w3.eth.contract(this.props.abi).at(this.props.contractAddress);

            } catch (e) {
                console.log("[TokenSale.connectWithBlockchain()] ERROR: ", e)
                if (callback) {
                    callback(e, false);
                }
                return;
            }

        }
    }
}();