pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title AccessControl
 * @dev Base contract to manage access control & pause of contract.
 */

contract AccessControl {

    using SafeMath for uint;

    address public ceoAddress;
    address public cfoAddress;
    address public cooAddress;

    address public newContractAddress;    
    bool private _paused = false;

    event Paused();
    event Unpaused();
    event ContractUpgrade(address newContract);

    constructor() internal {
        ceoAddress = msg.sender;
    } 

    modifier onlyCEO() {
        require(msg.sender == ceoAddress);
        _;
    }

    modifier onlyCFO() {
        require(msg.sender == cfoAddress);
        _;
    }

    modifier onlyCOO() {
        require(msg.sender == cooAddress);
        _;
    }

    modifier onlyCLevel() {
        require(
            msg.sender == cooAddress ||
            msg.sender == ceoAddress ||
            msg.sender == cfoAddress
        );
        _;
    }

    /**
    * @dev Modifier to make a function callable only when the contract is not paused.
    */
    modifier whenNotPaused() {
        require(!_paused);
        _;
    }

    /**
    * @dev Modifier to make a function callable only when the contract is paused.
    */
    modifier whenPaused() {
        require(_paused);
        _;
    }

    function setCEO(address _ceoAddress) external onlyCEO {
        require(_ceoAddress != address(0));
        ceoAddress = _ceoAddress;
    }

    function setCFO(address _cfoAddress) external onlyCEO {
        require(_cfoAddress != address(0));
        cfoAddress = _cfoAddress;
    }

    function setCOO(address _cooAddress) external onlyCEO {
        require(_cooAddress != address(0));
        cooAddress = _cooAddress;
    }

    /**
    * @return true if the contract is paused, false otherwise.
    */
    function paused() public view returns(bool) {
        return _paused;
    }

    /**
    * @dev called by the C-level to pause, triggers stopped state
    */
    function pause() public onlyCLevel whenNotPaused {
        _paused = true;
        emit Paused();
    }

    /**
    * @dev called by the CEO to unpause, returns to normal state
    */
    function unpause() public onlyCEO whenPaused {
        _paused = false;
        emit Unpaused();
    }    

    /// @dev When new contract deploy, the current contract emit an event
    function setNewAddress(address newContract) external onlyCEO whenPaused {
        newContractAddress = newContract;
        emit ContractUpgrade(newContract);
    }

}