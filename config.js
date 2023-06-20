module.exports = {
    mongodb: 'mongodb+srv://hamidraza:Fop102025@cluster0.dem8p.mongodb.net/Cluster0?retryWrites=true&w=majority', 
    daemons: {
        eth: {
            chainId: 1,
            network: 'mainnet',
            provider: "https://ethereum.publicnode.com",
            chains: { mainnet: 11155111, ropsten: 3, rinkeby: 4, goerly: 5, kovan: 42,}
        },
        test_eth: {
            chainId: 11155111,
            network: 'testnet',
            provider: "https://rpc2.sepolia.org",
            chains: { mainnet: 1, ropsten: 11155111, rinkeby: 4, goerly: 5, kovan: 42,}
        },
        fantom: {
            chainId: 1,
            network: 'mainnet',
            provider: "https://ftm.getblock.io/mainnet/?api_key=1b06c2c0-4767-4611-b07d-6181e00f7806",
            chains: { mainnet: 1, ropsten: 3, rinkeby: 4, goerly: 5, kovan: 42,}
        },
        polygon: {
            chainId: 80001,
            network: 'mainnet',
            provider: "https://polygon-testnet.public.blastapi.io",
            chains: { mainnet: 80001, ropsten: 3, rinkeby: 4, goerly: 5, kovan: 42,}
        },
        bsc: {
            chainId: 97,
            network: 'mainnet',
            provider: "https://data-seed-prebsc-1-s2.binance.org:8545",
            chains: { mainnet: 97, ropsten: 3, rinkeby: 4, goerly: 5, kovan: 42,}
        },
        avax: {
            chainId: 1,
            network: 'mainnet',
            provider: "https://avax.getblock.io/testnet/ext/bc/C/rpc?api_key=1b06c2c0-4767-4611-b07d-6181e00f7806",
            chains: { mainnet: 1, ropsten: 3, rinkeby: 4, goerly: 5, kovan: 42,}
        },
        cronos: {
            chainId: 1,
            network: 'mainnet',
            provider: "https://atom.getblock.io/mainnet/ext/bc/C/rpc?api_key=1b06c2c0-4767-4611-b07d-6181e00f7806",
            chains: { mainnet: 1, ropsten: 3, rinkeby: 4, goerly: 5, kovan: 42,}
        },
        btc: {
            host: '127.0.0.1',
            port: 4000,
            username: 'Lwg7hJay71ku',
            password: 'Hk7eSZ1WUUl8GGWfn1jn',
            path: "/root/.bitcoin",
        },
    },

    db: {
        host: '127.0.0.1',
        dbname: 'cryptoapis',
        dbport: 27017,
    },
    
    admin: {
        auth_key: "onewordseeker",
        auth_password: "Fop1020-25"
    },

    port: 4000,
}
