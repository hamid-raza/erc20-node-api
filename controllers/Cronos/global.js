function getEtherscanApiUrl(chainId) {
    // { mainnet: 1, ropsten: 3, rinkeby: 4, goerly: 5, kovan: 42,}
    switch (chainId) {
        case 1:
            return 'https://api.cronoscan.com';
        case 3:
            return 'https://api-testnet.cronoscan.com';
        case 4:
            return 'https://api-rinkeby.etherscan.io';
        case 5:
            return 'https://api-goerly.etherscan.io';
        case 42:
            return 'https://api-kovan.etherscan.io';
    }
}

module.exports = {getEtherscanApiUrl};