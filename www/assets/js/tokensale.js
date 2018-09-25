
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
            },
            username: "",
            account: "",
            accountChangeTimerId: 0,
        },

        init: function (option, callback) {
            var tsObj = this;
            // Download Token contract json files
            $.ajax({
                url: '/assets/contracts/FrancisToken.json'
            }).done(function (data) {
                //console.log('[TokenSale.init] Data: ' + JSON.stringify(data));
                tsObj.props.tokenAddress = data['contractAddress'];
                tsObj.props.tokenAbi = data['abi'];
                tsObj.props.tokenContract = web3.eth.contract(tsObj.props.tokenAbi).at(tsObj.props.tokenAddress);
                // Download Token Sale contract json file
                $.ajax({
                    url: '/assets/contracts/FrancisTokenSale.json'
                }).done(function(data) {
                    //console.log('[TokenSale.init] Data: ' + JSON.stringify(data));
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
                        callback("metamask-not-found", false);
                    }

                } else {

                    if (typeof web3.eth.defaultAccount === "undefined") {
                        console.log('[TokenSale.connectWithBlockchain()] No sign in');
                        this.props.signedIn = false;    
                        if (callback) {
                            callback("not-sign-in", false);
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
                    
                    this.retrieveTokenInfo(callback);

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

        },

        monitorMetaMaskSignIn: function (callback) {
            var tsObj = this;
            var timerId = window.setInterval(function () {
                if (typeof web3.eth.defaultAccount !== "undefined") {
                    window.clearInterval(timerId);
                    tsObj.props.account = web3.eth.defaultAccount;
                    tsObj.retrieveTokenInfo(callback);

                }
            }, 1000);
        },

        monitorAccountChange: function (callback) {
            var tsObj = this;
            var timerId = window.setInterval(function () {
                if (web3.eth.defaultAccount !== tsObj.props.account) {
                    tsObj.props.account = web3.eth.defaultAccount;

                    if (callback) {
                        callback();
                    }
                }
            }, 1000);
            this.props.accountChangeTimerId = timerId;
            return timerId;
        },

        stopMonitorAccountChange: function () {
            if (this.props.accountChangeTimerId > 0) {
                window.clearInterval(this.props.accountChangeTimerId);
                this.props.accountChangeTimerId = 0;
            }
        },

        retrieveTokenInfo: function (callback) {
            var tsObj = this;
            var jobCounter = 0;
            var errorCounter = 0;

            tsObj.props.account = web3.eth.defaultAccount;

            this.props.tokenContract.name(function (err, result) {
                if (err) {
                    console.log("[TokenSale.connectWithBlockchain()] Error: (Get token name) " + err);
                    errorCounter++;
                } else {
                    console.log("[TokenSale.connectWithBlockchain()] Token Name: " + result);          
                    tsObj.props.tokenInfo.name = result;
                }
                jobCounter++;
            });

            this.props.tokenContract.symbol(function (err, result) {
                if (err) {
                    console.log("[TokenSale.connectWithBlockchain()] Error: (Get token symbol) " + err);
                    errorCounter++;
                } else {
                    console.log("[TokenSale.connectWithBlockchain()] Token symbol: " + result);          
                    tsObj.props.tokenInfo.symbol = result;
                }
                jobCounter++;
            });


            this.props.tokenContract.decimals(function (err, result) {
                if (err) {
                    console.log("[TokenSale.connectWithBlockchain()] Error: (Get token decimals) " + err);
                    errorCounter++;
                } else {
                    console.log("[TokenSale.connectwithBlockchain()] Token Decimals: " + result);          
                    tsObj.props.tokenInfo.decimals = result;
                }
                jobCounter++;
            });

            this.props.tokenContract.totalSupply(function (err, result) {
                if (err) {
                    console.log("[TokenSale.connectWithBlockchain()] Error: (Get token total supply) " + err);
                    errorCounter++;
                } else {
                    console.log("[TokenSale.connectwithBlockchain()] Token Total Supply: " + result);          
                    tsObj.props.tokenInfo.totalSupply = result;
                }
                jobCounter++;
            });

            // Get username
            this.props.tokenSaleContract.getUsername(function (err, result) {
                if (err) {
                    console.log("[TokenSale.connectWithBlockchain()] Error: (Get username) " + err);
                    errorCounter++;                            
                } else {
                    console.log("[TokenSale.connectwithBlockchain()] Username: " + result);          
                    tsObj.props.username = result;                    
                }
                jobCounter++;
            });

            var timerId = window.setInterval(function() {
                if (jobCounter >= 5) {
                    // All task completed
                    window.clearInterval(timerId);

                    if (errorCounter > 0) {
                        // Contains error
                        if (callback) {
                            callback("Error while retrieve token information", false);
                        } 
                    } else {
                        if (callback) {
                            callback(false, "success");
                        } 
                    }
                }
            }, 1000);
        },

        getUsername: function (callback) {
            this.props.tokenSaleContract.getUsername(function (err, result) {
                if (err) {
                    console.log("[TokenSale.getUsername()] Error: " + err);
                } else {
                    console.log("[TokenSale.getUsername()] Result: " + result);
                }
                
                if (callback) {
                    callback(err, result);
                }
            });
        },

        setUsername: function (username, callback) {
            var tsObj = this;
            this.props.tokenSaleContract.setUsername(username, function (err, result) {
                if (err) {
                    console.log("[TokenSale.setUsername()] " + err);
                } else {
                    console.log("[TokenSale.setUsername()] Result: " + result);
                    tsObj.props.username = username;
                }
                
                if (callback) {
                    callback(err, result);
                }
            });
        }
    }
}();