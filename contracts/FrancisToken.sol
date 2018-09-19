pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Capped.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FrancisToken is ERC20Detailed, ERC20Capped {

    constructor(string name, string symbol, uint8 decimals, uint256 cap) 
        public 
        ERC20Detailed(name, symbol, decimals) 
        ERC20Capped(cap) 
        MinterRole() {

    }
}