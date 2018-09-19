
var infuraApiKey = 'a19b9a56da2c4e91ae0fac4ebdb88060';

module.exports = {
    accounts: [
        {
            // Ganache Default Accounts
            // Develop 1
            address: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
            key: 'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3'
        },
        {
            // Develop 2
            address: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
            key: 'ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f'
        },
        {
            // Develop 3
            address: '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef',
            key: '0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1'
        }
    ],
    networks: {
        developmentHost: 'http://127.0.0.1:7545',
        ropstenHost: 'https://ropsten.infura.io/v3/' + infuraApiKey,
        rinkebyHost: 'https://rinkeby.infura.io/v3/' + infuraApiKey,
        kovanHost: 'https://kovan.infura.io/v3/' + infuraApiKey,
        mainnetHost: 'https://mainnet.infura.io/v3/' + infuraApiKey
    },
    build: {
        contracts: [
            'FrancisToken.sol'
        ]
    },
    settings: {
        selectedAccountIndex: 0,
        selectedHost: 'developmentHost'
    }
};