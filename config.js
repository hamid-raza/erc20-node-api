module.exports = {
    mongodb: 'mongodb+srv://hamidraza:Fop102025@cluster0.dem8p.mongodb.net/Cluster0?retryWrites=true&w=majority', 
    daemons: {
        eth: {
            chainId: 1,
            network: 'mainnet',
            provider: "https://mainnet.infura.io/v3/72c53bc23c234df3a80f4e2c95f72d81",
            chains: { mainnet: 1, ropsten: 3, rinkeby: 4, goerly: 5, kovan: 42,}
        },
        test_eth: {
            chainId: 42,
            network: 'testnet',
            provider: "https://kovan.infura.io/v3/72c53bc23c234df3a80f4e2c95f72d81",
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