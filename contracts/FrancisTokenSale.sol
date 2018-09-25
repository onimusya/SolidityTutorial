pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "FrancisToken.sol";
import "DateTime.sol";

contract FrancisTokenSale is Ownable, DateTime {
 
    using SafeMath for uint;

    FrancisToken private _token;

    struct PriceTier {
        uint tokenPrice;
        uint maxSupply;
        uint totalToken;
        uint timestamp;
        uint8 isActive;
        
    }

    struct Multihash {
        bytes32 digest;
        uint8 hashFunction;
        uint8 size;
    }

    PriceTier[] private _priceTiers;

    uint private _requireWhitelist;
    
    uint constant _usernameLimit = 32;

    mapping (address => string) private _username;
    mapping (bytes32 => address) private _usernameHash;

    // uint is index, start with 1
    mapping (address => uint) private _whitelist;
    address[] private _whitelistAddress;

    // uint is index, start with 1
    mapping (address => uint) private _pendingWhitelist;
    address[] private _pendingWhitelistAddress;

    // Profile Image Entries
    mapping (address => Multihash) private _imageEntries;

    event PurchaseToken(address indexed to, uint value, uint tokenAmount);
    event Withdraw(address indexed to, uint value);

    event RequestWhitelist(address indexed addr);
    event ApproveWhitelist(address indexed addr);
    event RemovePendingWhitelist(address indexed addr);
    event RemoveWhitelist(address indexed addr);

    event ImageSet (address indexed key, bytes32 digest, uint8 hashFunction, uint8 size);

    event ImageDeleted (address indexed key);

    constructor () public Ownable() {

    }

    function setImageEntry(bytes32 _digest, uint8 _hashFunction, uint8 _size) public {
        Multihash memory entry = Multihash(_digest, _hashFunction, _size);
        _imageEntries[msg.sender] = entry;
        emit ImageSet(msg.sender, _digest, _hashFunction, _size);
    }

    function clearImageEntry() public {
        require(_imageEntries[msg.sender].digest != 0);
        delete _imageEntries[msg.sender];
        emit ImageDeleted(msg.sender);
    }

    function getImageEntry(address _address) public view returns(bytes32 digest, uint8 hashfunction, uint8 size) {
        Multihash storage entry = _imageEntries[_address];
        return (entry.digest, entry.hashFunction, entry.size);
    }

    function setUsername(string name_) public {
        bytes memory n = bytes(name_);
        if (n.length > _usernameLimit) {
            revert("Username is too long.");
        }

        bytes32 h = keccak256(abi.encodePacked(name_));

        if (bytes(_username[msg.sender]).length == 0) {
            // New username
            // Check username is exist?
            if (_usernameHash[h] != address(0) ) {
                revert("Username is used.");
            }

            _username[msg.sender] = name_;
            _usernameHash[h] = msg.sender;

        } else {
            // Existing username
            if (_usernameHash[h] == address(0)) {
                
                // Reset the old hash record
                bytes32 o = keccak256(abi.encodePacked(_username[msg.sender]));
                _usernameHash[o] = address(0);

                // Update new one
                _username[msg.sender] = name_;
                _usernameHash[h] = msg.sender;

            } else {
                revert("Username is used.");
            }
        }

        
    }

    function getUsername() public view returns (string) {
        return _username[msg.sender];
    }

    function setRequireWhitelist(uint value_) public onlyOwner {
        _requireWhitelist = value_;
    }

    function requestWhitelist() public {
        require (_whitelist[msg.sender] == 0);

        // Make sure the address not in pending list
        require (_pendingWhitelist[msg.sender] == 0);

        _pendingWhitelistAddress.push(msg.sender);
        _pendingWhitelist[msg.sender] = _pendingWhitelistAddress.length;
        
        emit RequestWhitelist(msg.sender);
    }

    function getPendingWhitelistCount() public view onlyOwner returns (uint) {
        return _pendingWhitelistAddress.length;
    }

    function getPendingWhitelist(uint index_) public view onlyOwner returns (address) {
        require (index_ > 0);
        require (index_ <= _pendingWhitelistAddress.length);

        return _pendingWhitelistAddress[index_ - 1];
    }

    function getPendingWhitelistIndex(address addr_) public view onlyOwner returns (uint) {
        require (addr_ != address(0));

        return _pendingWhitelist[addr_];
    }

    function removePendingWhitelist(address addr_) public onlyOwner {
        require (addr_ != address(0));
        require (_pendingWhitelist[addr_] > 0);

        uint index = _pendingWhitelist[addr_] - 1;

        if (_pendingWhitelistAddress.length > (index + 1)) {
            // Not the last record, move the last record to current location, then delete the last one
            _pendingWhitelistAddress[index] = _pendingWhitelistAddress[_pendingWhitelistAddress.length - 1];
        } 

        // Save some gas
        delete _pendingWhitelistAddress[_pendingWhitelistAddress.length - 1];
        _pendingWhitelist[addr_] = 0;

        emit RemovePendingWhitelist(addr_);
    }

    function getWhitelistCount() public view onlyOwner returns (uint) {
        return _whitelistAddress.length;
    }

    function getWhitelist(uint index_) public view onlyOwner returns (address) {
        require (index_ > 0);
        require (index_ <= _whitelistAddress.length);

        return _whitelistAddress[index_ - 1];
    }

    function getWhitelistIndex(address addr_) public view onlyOwner returns (uint) {
        require (addr_ != address(0));

        return _whitelist[addr_];
    }

    function removeWhitelist(address addr_) public onlyOwner {
        require (addr_ != address(0));
        require (_whitelist[addr_] > 0);

        uint index = _whitelist[addr_] - 1;

        if (_whitelistAddress.length > (index + 1)) {
            // Not the last record, move the last record to current location, then delete the last one
            _whitelistAddress[index] = _whitelistAddress[_whitelistAddress.length - 1];
        } 

        // Save some gas
        delete _whitelistAddress[_whitelistAddress.length - 1];
        _whitelist[addr_] = 0;

        emit RemoveWhitelist(addr_);
    }


    function approveWhitelist(address addr_) public onlyOwner {
        require (addr_ != address(0));

        require (_pendingWhitelistAddress.length > 0);

        require (_pendingWhitelist[addr_] != 0);

        uint index = _pendingWhitelist[addr_] - 1;

        if (_pendingWhitelistAddress.length > (index + 1)) {
            // Not the last record, move the last record to current location, then delete the last one
            _pendingWhitelistAddress[index] = _pendingWhitelistAddress[_pendingWhitelistAddress.length - 1];
        } 

        // Save some gas
        delete _pendingWhitelistAddress[_pendingWhitelistAddress.length - 1];
        _pendingWhitelist[addr_] = 0;

        // Put in approval list
        _whitelistAddress.push(addr_);
        _whitelist[addr_] = _whitelistAddress.length;

        emit ApproveWhitelist(addr_);

    }

    function setTokenAddress(address tokenContract) public onlyOwner {

        require (tokenContract != address(0), "Invalid token contract address.");

        uint32 size;
        
        assembly {
            size := extcodesize(tokenContract)
        }

        require (size > 0, "Address is not a contract.");

        _token = FrancisToken(tokenContract);
    }

    function isMinter() public view returns (bool) {
        require (_token != FrancisToken(0), "Token contract address is not set.");

        return _token.isMinter(address(this));
    }

    function addPriceTier(uint tokenPrice_, uint maxSupply_, uint timestamp_) public onlyOwner {
        require (tokenPrice_ > 0);

        _priceTiers.push(PriceTier({ 
            tokenPrice: tokenPrice_,
            maxSupply: maxSupply_,
            totalToken: 0,
            timestamp: timestamp_,
            isActive: 1
        }));

    }

    function updatePriceTier(uint index_, uint tokenPrice_, uint maxSupply_, uint timestamp_) public onlyOwner {
        require ((tokenPrice_ > 0) && (_priceTiers.length > index_));

        _priceTiers[index_] = PriceTier({ 
            tokenPrice: tokenPrice_,
            maxSupply: maxSupply_,
            totalToken: 0,
            timestamp: timestamp_,
            isActive: 1
        });
        
    }

    function priceTiersCount() public view returns (uint) {
        return _priceTiers.length;
    }

    function getPriceTier(uint index_) public view returns (uint, uint, uint, uint, uint8) {
        
        PriceTier storage priceTier_ = _priceTiers[index_];

        return (priceTier_.tokenPrice, priceTier_.maxSupply, priceTier_.totalToken, priceTier_.timestamp, priceTier_.isActive);
    }

    function getCurrentPriceTierIndex() public view returns (uint) {
        uint i;
        uint activeIndex_ = _priceTiers.length - 1;

        for ( i=0; i<_priceTiers.length; i++ ) {
            if (_priceTiers[i].timestamp > now) {
                if (i > 0) {
                    activeIndex_ = i - 1;
                }
                break;
            }
        }

        return activeIndex_;
    }
    
    function () public payable {
        require (msg.value > 0);

        _purchaseToken(msg.sender, msg.value);
    }

    function purchaseToken(address to_) public payable {
        require (msg.value > 0);

        _purchaseToken(to_, msg.value);
    }

    function _purchaseToken(address to_, uint value_) internal {
        require (to_ != address(0) && value_ > 0);

        if (_requireWhitelist != 0) {
            // Make sure the address is in whitelist
            require (_whitelist[to_] > 0);
        }

        uint index_ = getCurrentPriceTierIndex();
        PriceTier storage priceTier_ = _priceTiers[index_];

        // value_ is wei
        uint tokenAmount_ = SafeMath.mul(priceTier_.tokenPrice, value_);
        priceTier_.totalToken = priceTier_.totalToken.add(tokenAmount_);

        require (priceTier_.maxSupply >= priceTier_.totalToken);

        _token.mint(to_, tokenAmount_);
        
        emit PurchaseToken(to_, value_, tokenAmount_);

    }

    function getEtherBalance() public view returns (uint) {
        return address(this).balance;
    }

    function withdraw() public onlyOwner {
        require (address(this).balance > 0);

        uint withdrawAmount = address(this).balance;

        msg.sender.transfer(withdrawAmount);

        emit Withdraw(msg.sender, withdrawAmount);
    }

}
