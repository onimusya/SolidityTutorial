pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "AccessControl.sol";


/// @dev Credits to 0xfair.com. The contract has slightly updated.

contract TheRps is AccessControl {

    using SafeMath for uint;

    uint8 constant public NONE = 0;
    uint8 constant public ROCK = 10;
    uint8 constant public PAPER = 20;
    uint8 constant public SCISSORS = 30;
    uint8 constant public DEALERWIN = 201;
    uint8 constant public PLAYERWIN = 102;
    uint8 constant public DRAW = 101;

    uint public totalCommision;
    uint public totalcommisionRate = 100;

    struct GameData {
        uint expireTime;
        address dealer;
        uint dealerValue;
        bytes32 dealerHash;
        uint8 dealerChoice;
        address player;
        uint8 playerChoice;
        uint playerValue;
        uint8 result;
        bool closed;
    }

    mapping (uint => mapping(uint => uint8)) public rules;
    mapping (uint => GameData) public games;
    mapping (address => uint[]) public gamesOwner;

    uint public maxGame = 0;
    uint public expireTimeLimit = 60 minutes;
    
    event CreateGame(uint gameid, address dealer, uint amount);
    event JoinGame(uint gameid, address player, uint amount);
    event Reveal(uint gameid, address player, uint8 choice);
    event CloseGame(uint gameid,address dealer,address player, uint8 result);

    constructor () public {
        rules[ROCK][ROCK] = DRAW;
        rules[ROCK][PAPER] = PLAYERWIN;
        rules[ROCK][SCISSORS] = DEALERWIN;
        rules[PAPER][ROCK] = DEALERWIN;
        rules[PAPER][PAPER] = DRAW;
        rules[PAPER][SCISSORS] = PLAYERWIN;
        rules[SCISSORS][ROCK] = PLAYERWIN;
        rules[SCISSORS][PAPER] = DEALERWIN;
        rules[SCISSORS][SCISSORS] = DRAW;
        rules[NONE][NONE] = DRAW;
        rules[ROCK][NONE] = DEALERWIN;
        rules[PAPER][NONE] = DEALERWIN;
        rules[SCISSORS][NONE] = DEALERWIN;
        rules[NONE][ROCK] = PLAYERWIN;
        rules[NONE][PAPER] = PLAYERWIN;
        rules[NONE][SCISSORS] = PLAYERWIN;

        ceoAddress = msg.sender;
        cooAddress = msg.sender;
        cfoAddress = msg.sender;
    }

    /**
    * @dev If someone wants to donate free ether to us
    */
    function() public payable {
        totalCommision = SafeMath.add(totalCommision, msg.value);
    }

    function amountAfterComm(uint amount) internal returns (uint) {
        uint comm = SafeMath.div(amount, totalcommisionRate);
        totalCommision = SafeMath.add(totalCommision, comm);

        // Return amount after deduct the comission
        return (SafeMath.sub(amount, comm));
    }

    /// @dev Withdraw Commission
    function withdrawComm(uint amount) external onlyCFO {
        require(amount > 0 && amount <= totalCommision);
        msg.sender.transfer(amount);
        totalCommision = totalCommision - amount;
    }

    function getProof(address sender, uint8 choice, bytes32 randomSecret) public pure returns (bytes32){
        return keccak256(abi.encodePacked(sender, choice, randomSecret));
    }

    function checkChoice(uint8 choice) public pure returns (bool){
        return choice==ROCK||choice==PAPER||choice==SCISSORS;
    }

    function gameCountOf(address owner) public view returns (uint){
        return gamesOwner[owner].length;
    }
    
    function createGame(bytes32 dealerHash, address player) public payable whenNotPaused returns (uint){
        require(dealerHash != 0x0);

        maxGame += 1;
        GameData storage game = games[maxGame];
        game.dealer = msg.sender;
        game.player = player;
        game.dealerHash = dealerHash;
        game.dealerChoice = NONE;
        game.dealerValue = msg.value;
        game.expireTime = expireTimeLimit + now;

        gamesOwner[msg.sender].push(maxGame);

        emit CreateGame(maxGame, game.dealer, game.dealerValue);

        return maxGame;
    }

    function joinGame(uint gameid, uint8 choice) public payable whenNotPaused returns (uint){
        GameData storage game = games[gameid];

        require(msg.value == game.dealerValue && game.dealer != address(0) && game.dealer != msg.sender && game.playerChoice==NONE);
        require(game.player == address(0) || game.player == msg.sender);
        require(!game.closed);
        require(now < game.expireTime);
        require(checkChoice(choice));

        game.player = msg.sender;
        game.playerChoice = choice;
        game.playerValue = msg.value;
        game.expireTime = expireTimeLimit + now;

        gamesOwner[msg.sender].push(gameid);

        emit JoinGame(gameid, game.player, game.playerValue);

        return gameid;
    }

    function close(uint gameid) public returns(bool) {
        GameData storage game = games[gameid];

        require(!game.closed);
        require(now > game.expireTime || (game.dealerChoice != NONE && game.playerChoice != NONE));

        uint8 result = rules[game.dealerChoice][game.playerChoice];

        if(result == DEALERWIN) {
            game.dealer.transfer(amountAfterComm(SafeMath.add(game.dealerValue, game.playerValue)));
        }else if(result == PLAYERWIN) {            
            game.dealer.transfer(amountAfterComm(SafeMath.add(game.dealerValue, game.playerValue)));
        }else if(result == DRAW) {
            game.dealer.transfer(game.dealerValue);
            game.player.transfer(game.playerValue);
        }

        game.closed = true;
        game.result = result;

        emit CloseGame(gameid, game.dealer, game.player, result);

        return game.closed;
    }    

    function reveal(uint gameid, uint8 choice, bytes32 randomSecret) public returns (bool) {
        GameData storage game = games[gameid];
        bytes32 proof = getProof(msg.sender, choice, randomSecret);

        require(!game.closed);
        require(now < game.expireTime);
        require(game.dealerHash != 0x0);
        require(checkChoice(choice));
        require(checkChoice(game.playerChoice));
        require(game.dealer == msg.sender && proof == game.dealerHash );

        game.dealerChoice = choice;

        emit Reveal(gameid, msg.sender, choice);

        close(gameid);

        return true;
    }    
} 