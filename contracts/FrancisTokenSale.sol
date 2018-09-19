pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "FrancisToken.sol";

contract FrancisTokenSale is Ownable {

    FrancisToken private _token;

    constructor () public Ownable() {

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


}
