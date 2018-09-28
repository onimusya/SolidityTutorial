# Solidity Tutorial

## 1. Introduction
First goal of this tutorial is to compile & deploy a mintable ERC20 token smart contract using client side signature & Web3 without truffle. The ERC20 token contract is using Open Zeppelin Framework. It also has sample code to execute smart contract function by using sendRawTransaction().

Here is the demo site for the tutorial: [Smart Contract Demo](https://tokendemo.unwallz.com "Smart Contract Demo")


## 2. Prerequisite
- Node.js v8++
- Npm v5.6++

## 3. Installation
- npm install

## 4. Test the code
All configuration settings are stored in **appconfig.js**

### 4.1 Compile Solidity Code
`node app.js --build`

### 4.2 Deploy Smart Contract
`node app.js --deploy`

### 4.3 Read Properties from Token Contract
`node app.js --contractinfo`

### 4.4 Mint Token
`node app.js --mint 10`

### 5. A Cup of Coffee
If you think this tutorial sample help you, would like to buy me a cup of coffee, you can send eth to my wallet address 0xF68B84024Ab718A79B3eb4D53cCE7Ee2254F4241 as support.
