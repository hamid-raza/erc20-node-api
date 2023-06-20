let axios = require('axios')
const TronWeb = require("tronweb");

const HttpProvider = TronWeb.providers.HttpProvider; // This provider is optional, you can just use a url for the nodes instead
const fullNode = new HttpProvider("https://api.shasta.trongrid.io/"); // Full node http endpoint
const solidityNode = new HttpProvider("https://api.shasta.trongrid.io/"); // Solidity node http endpoint
const eventServer = "https://api.shasta.trongrid.io/"; // Contract events http endpoint


let tronWeb = new TronWeb(fullNode, solidityNode, eventServer, "20591ae47a43efbcbc025988994ad65fc5ac291606cc309bbf7ce791cf098054");

function getLevelPrice(level) {
    let levelPrice = 0
    if (level == '1')
        levelPrice = 100
    else if (level == '2')
        levelPrice = 200
    else if (level == '3')
        levelPrice = 400
    else if (level == '4')
        levelPrice = 800
    else if (level == '5')
        levelPrice = 1600
    else if (level == '6')
        levelPrice = 3200
    else if (level == '7')
        levelPrice = 6400
    else if (level == '8')
        levelPrice = 12800
    else if (level == '9')
        levelPrice = 25600
    else if (level == '10')
        levelPrice = 51200
    else if (level == '11')
        levelPrice = 102400
    else if (level == '12')
        levelPrice = 204800
    else if (level == '13')
        levelPrice = 409600
    else if (level == '14')
        levelPrice = 819200

    return levelPrice
}
async function testData() {
    try {

        let result = await axios.get(`https://api.shasta.trongrid.io/event/contract/TPbDXiEvEEjpyqXFo3RnthERTuZW7xcxvG?since=0&sort=-block_timestamp`)
        result.data.map(events => {
            if (events.event_name == "NewUserPlace" || events.event_name == "Upgrade") {
                let objectS3, objectS4, objectS5
                
                if (events.result.matrix == '1') {
                    objectS3 = {
                        sender: tronWeb.address.fromHex(events.result.user),
                        reciever: tronWeb.address.fromHex(events.result.referrer),
                        matrix: events.result.matrix,
                        trxAmount: getLevelPrice(events.result.level),
                        level: events.result.level
                    }
                } else if (events.result.matrix == '2') {
                    objectS4 = {
                        sender: tronWeb.address.fromHex(events.result.user),
                        reciever: tronWeb.address.fromHex(events.result.referrer),
                        matrix: events.result.matrix,
                        trxAmount: getLevelPrice(events.result.level),
                        level: events.result.level
                    }
                } else if (events.result.matrix == '3') {
                    objectS5 = {
                        sender: tronWeb.address.fromHex(events.result.user),
                        reciever: tronWeb.address.fromHex(events.result.referrer),
                        matrix: events.result.matrix,
                        trxAmount: getLevelPrice(events.result.level),
                        level: events.result.level
                    }
                }
                if (objectS3 !== undefined) {
                    // can perform db insertion for S3 object
                    console.log("S3 --- ", objectS3)
                }
                if (objectS4 !== undefined) {
                    // can perform db insertion for S4 object

                    console.log("S4 --- ", objectS4)
                }
                if (objectS5 !== undefined) {
                    // can perform db insertion for S5 object

                    console.log("S5 --- ", objectS5)
                }

            }
        })
    } catch (e) {
        console.log(e)
    }
}

testData()
// setInterval(10000, testData())