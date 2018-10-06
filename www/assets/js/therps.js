// The Rock Paper Scissor Game
// v1.0

// TheRps() - Interact with the smart contract
var TheRps = function () {
    'use strict';

    return {
        props: {
            gameAddress: '',
            gameAbi: [],
            gameContract: null,
            signedIn: false,
            web3: null,
            accountChangeTimerId: 0,

        }, 

        init: function (options, callback) {
            var rpsObj = this;

            // Download The RPS Game Contract JSON File
            $.ajax({
                url: '/assets/contracts/TheRps.json'
            }).done(function (data) {
                
                rpsObj.props.gameAddress = data['contractAddress'];
                rpsObj.props.gameAbi = data['abi'];
                rpsObj.props.gameContract = web3.eth.contract(rpsObj.props.gameAbi).at(rpsObj.props.gameAddress);

                // Connect with Blockchain
                rpsObj.connectWithBlockchain(callback);

            }).fail(function (xhr, textStatus, errorThrown) {
                console.log('[TheRps.init] Error: (Download TheRps.json) ' + errorThrown);
                if (callback) {
                    callback(errorThrown, false);
                }
            });            
        },

        connectWithBlockchain: function (callback) {
            try {
                if (typeof web3 === "undefined") {
                    console.log('[TheRps.connectWithBlockchain()] MetaMask is not installed.');
                    if (callback) {
                        callback("metamask-not-found", false);
                    }

                } else {
                    if (typeof web3.eth.defaultAccount === "undefined") {
                        console.log('[TheRps.connectWithBlockchain()] MetaMask is locked.');
                        this.props.signedIn = false;    
                        if (callback) {
                            callback("not-sign-in", false);
                        }                        
                        return;

                    } else {
                        this.props.web3 = web3;
                        this.props.signedIn = true;                        
                        console.log('[TheRps.connectWithBlockchain()] Default Account is ' + web3.eth.defaultAccount);    
                    }

                    var validNetwork = false;
                    switch (web3.version.network) {
                        case '1':
                            console.log('[TheRps.connectWithBlockchain()] Connect to Main Net.' )
                            break;
    
                        case '3':
                            console.log('[TheRps.connectWithBlockchain()] Connect to Ropsten Test Net.' )
                            validNetwork = true;
                            break;
    
                        case '4':
                            console.log('[TheRps.connectWithBlockchain()] Connect to Ringkeby Test Net.' )
                            break;
    
                        case '42':
                            console.log('[TheRps.connectWithBlockchain()] Connect to Kovan Test Net.' )
                            break;
    
                        default:
                            console.log('[TheRps.connectWithBlockchain()] Connect to unknown network (' + web3.version.network + ').');
                            validNetwork = true;
                            break;
                    }
                    
                    if (web3.currentProvider.isMetaMask) {
                        console.log('[TheRps.connectWithBlockchain()] Client Provider is MetaMask.'); 
                    }
                    
                    if (validNetwork) {
                        // Success
                        if (callback) {
                            callback(false, "success");
                        } 

                    } else {
                        if (callback) {
                            callback('invalid-network', false);
                        }
                    }

                }
            } catch (err) {
                console.log('[TheRps.connectWithBlockchain()] Error: ', err.message);
                if (callback) {
                    callback(err, false);
                }

            }
        },

        monitorMetaMaskSignIn: function (callback) {
            var rpsObj = this;
            var timerId = window.setInterval(function () {
                if (typeof web3.eth.defaultAccount !== "undefined") {

                    var validNetwork = false;

                    switch (web3.version.network) {
                        case '1':
                            console.log('[TheRps.monitorMetaMaskSignIn()] Connect to Main Net.' )
                            break;
    
                        case '3':
                            console.log('[TheRps.monitorMetaMaskSignIn()] Connect to Ropsten Test Net.' )
                            validNetwork = true;
                            break;
    
                        case '4':
                            console.log('[TheRps.monitorMetaMaskSignIn()] Connect to Ringkeby Test Net.' )
                            break;
    
                        case '42':
                            console.log('[TheRps.monitorMetaMaskSignIn()] Connect to Kovan Test Net.' )
                            break;
    
                        default:
                            console.log('[TheRps.monitorMetaMaskSignIn()] Connect to unknown network (' + web3.version.network + ').');
                            validNetwork = true;
                            break;
                    }

                    if (validNetwork) {
                        rpsObj.props.web3 = web3;
                        rpsObj.props.signedIn = true;                        
                        rpsObj.props.account = web3.eth.defaultAccount;
                    
                        window.clearInterval(timerId);
                        if (callback) {
                            callback();
                        }
                                
                    }
                    
                }
            }, 1000);
        },

        monitorAccountChange: function (callback) {
            var rpsObj = this;
            var timerId = window.setInterval(function () {
                if (web3.eth.defaultAccount !== rpsObj.props.account) {
                    rpsObj.props.account = web3.eth.defaultAccount;

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

        getFiatPrice: function (cryptoCodes, fiatCodes, callback) {

            // Load ETH Price
            $.ajax({
                url: 'https://min-api.cryptocompare.com/data/pricemulti?fsyms=' + cryptoCodes +'&tsyms=' + fiatCodes
            }).done(function (data) {
                console.log('[TheRps.getFiatPrice()] CryptoCurrency Price Data ');
                console.log(data);
                if (callback) {
                    callback(false, data);
                }
            }).fail(function (xhr, textStatus, errorThrown) {
                console.log('[TheRps.getFiatPrice()] Error: ' + errorThrown);
                if (callback) {
                    callback(errorThrown, false);
                }
            });

        }        

    };
}();


// Account Change Event
var accountChange = function () {
    updateUI();
}

// Update Game Contract Information
var updateContractInfo = function () {

    var accountAddress = TheRps.props.web3.eth.defaultAccount;
    if (accountAddress.length > 27) {
      accountAddress = accountAddress.substring(0, 24) + "...";
    }

    var gameAddressTag = '';
    var accountAddressTag = '';

    switch (web3.version.network) {
      case '1':
        gameAddressTag = '<a href="https://etherscan.io/address/' + TheRps.props.gameAddress + '" target="_blank">' + TheRps.props.gameAddress + '</a>';
        accountAddressTag = '<a href="https://etherscan.io/address/' + TheRps.props.web3.eth.defaultAccount + '" target="_blank">' + accountAddress + '</a>';

        $('#game-info-link').attr('href', 'https://etherscan.io/address/' + TheRps.props.tokenAddress);
        $('#network-version').html('(mainnet)');
        break;

      case '3':
        gameAddressTag = '<a href="https://ropsten.etherscan.io/address/' + TheRps.props.TheRpsAddress + '" target="_blank">' + TheRps.props.TheRpsAddress + '</a>';
        accountAddressTag = '<a href="https://ropsten.etherscan.io/address/' + TheRps.props.web3.eth.defaultAccount + '" target="_blank">' + accountAddress + '</a>';
        $('#game-info-link').attr('href', 'https://ropsten.etherscan.io/address/' + TheRps.props.tokenAddress);
        $('#network-version').html('(ropsten)');
        break;

      case '4':
        gameAddressTag = '<a href="https://rinkeby.etherscan.io/address/' + TheRps.props.TheRpsAddress + '" target="_blank">' + TheRps.props.TheRpsAddress + '</a>';
        accountAddressTag = '<a href="https://rinkeby.etherscan.io/address/' + TheRps.props.web3.eth.defaultAccount + '" target="_blank">' + accountAddress + '</a>';
        $('#game-info-link').attr('href', 'https://rinkeby.etherscan.io/address/' + TheRps.props.tokenAddress);
        $('#network-version').html('(rinkeby)');
        break;

      case '42':
        gameAddressTag = '<a href="https://kovan.etherscan.io/address/' + TheRps.props.TheRpsAddress + '" target="_blank">' + TheRps.props.TheRpsAddress + '</a>';
        accountAddressTag = '<a href="https://kovan.etherscan.io/address/' + TheRps.props.web3.eth.defaultAccount + '" target="_blank">' + accountAddress + '</a>';
        $('#game-info-link').attr('href', 'https://kovan.etherscan.io/address/' + TheRps.props.tokenAddress);
        $('#network-version').html('(kovan)');
        break;

      default:
        gameAddressTag = TheRps.props.gameAddress;
        accountAddressTag = accountAddress;
        $('#network-version').html('(private)');
    }          

    $('#game-address').html('<strong>' + gameAddressTag + '</strong>');

    $('#account-addr').html(accountAddressTag);
    $('#account-addr').attr('title', "Account: " + TheRps.props.web3.eth.defaultAccount);


}

// Update ETH Balance
var updateEthBalance = function () {
        
    TheRps.props.web3.eth.getBalance(TheRps.props.web3.eth.defaultAccount, function (err, result) {
        if (err) {

        } else {
            console.log('[Main.updateEthBalance()] ETH Balance: ' + result.toNumber());
            var eth = TheRps.props.web3.fromWei(result, 'ether');              
            $('#eth-balance').html(eth.toFixed(4));

            // Update ETH Price
            TheRps.getFiatPrice('BTC,ETH', 'USD,MYR', function (err, result) {
                if (err) {

                } else {
                    var totalUSD = result['ETH']['USD'] * eth;
                    $('#eth-price').html('ETH <strong>(USD ' + totalUSD.toFixed(4) + ')</strong>');
                }

            });

        }
    });

};

// Update UI
var updateUI = function () {

    updateContractInfo();
    updateEthBalance();

};

// Start here
$(document).ready(function() {


    toastr.options = {
        "closeButton": true,
        "debug": false,
        "newestOnTop": true,
        "progressBar": true,
        "positionClass": "toast-top-center",
        "preventDuplicates": true,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "5000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };
    
    
    // Init
    TheRps.init('', function (err, result) {
        if (result) {

            // Update UI
            updateUI();

            // Monitor Account Change
            TheRps.monitorAccountChange(accountChange);

        } else {
            if (err == 'metamask-not-found') {
                $('#modal-warning-msg').html('Please install MetaMask.');
            } else if (err == 'not-sign-in') {
                $('#modal-warning-msg').html('Please sign in MetaMask.');

                // Monitor MetaMask sign-in 
                TheRps.monitorMetaMaskSignIn(function () {                
                    // Dismiss warning modal
                    $('#modal-warning').modal('hide');

                    // Update UI
                    updateUI();

                    // Start to monitor account change
                    TheRps.monitorAccountChange(accountChange);
                });                

            } else if (err == 'invalid-network') {
                $('#modal-warning-msg').html('Please switch to Ropsten or Private Network.');     

            } else {
                $('#modal-warning-msg').html(err);

            }

            // Pop warning modal
            $('#modal-warning').modal({
                backdrop: 'static',
                keyboard: false
            });
  
        }
    });


});