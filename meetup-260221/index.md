# Comparison between Go and Node.js Chaincode
This is an ongoing work to compare chaincode written in Node.js and Golang.

## Housekeepting
To clean up the system we have to delete the content of the data folder (leader data) and the content of the artifacts folder.

```bash
rm -R $(pwd)/ledgerData/*
rm $(pwd)/artifacts/*

docker rm $(docker ps -a -f status=exited -q)
docker volume prune
```

## Chaincode DevMode - Node.js

## Overview different APIs

We have two APIs to communicate with he ledger.

- fabric-contract-api **(contract interface)**
  - provides the contract interface. A high level API for application developers to implement Smart Contracts)
- fabric-shim **(chaincode interface)**
  - provides the chaincode interface. A lower level API for implementing Smart Contracts.  It also provides the implementation to support communication with Hyperledger Fabric peers for Smart Contracts written using the fabric-contract-api together with the fabric-chaincode-node cli to launch Chaincode or Smart Contracts.

## Some notes to usage
See the files:
- [index.js](./index.js)
- [lib/cs01.js](./lib/cs01.js)
- [cs01.sh](./cs01.sh)

```bash
cd fabric/fabric-samples/dev-network/chaincode/nodejs
mkdir cs01 && cd cs01

npm init
npm install --save fabric-contract-api fabric-shim

# we need this also for the chaincode start command fabric-chaincode-node under ./node_modules/.bin/

touch index.html
mkdir lib
touch lib/cs01.js

# modify the package.json file > scripts.start section
"scripts": {
  "start": "fabric-chaincode-node start",
}

```

## Terminal 1 - Start the network
Terminal one is responsible for running the network without the chaincode container.

```bash 
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

# generate the genesis block for the ordering service
configtxgen -profile SampleDevModeSolo -channelID syschannel -outputBlock genesisblock -configPath $FABRIC_CFG_PATH -outputBlock $(pwd)/artifacts/genesis.block

# create channel creation transaction
configtxgen -channelID ch1 -outputCreateChannelTx $(pwd)/artifacts/ch1.tx -profile SampleSingleMSPChannel -configPath $FABRIC_CFG_PATH

# start the network
docker-compose up
```

## Terminal 2 - is the Chaincode terminal 

## Create and join the channel

```bash 
export FABRIC_CFG_PATH=$(pwd)/sampleconfig
# create a new channel
peer channel create -o 127.0.0.1:7050 --outputBlock $(pwd)/artifacts/ch1.block -c ch1 -f $(pwd)/artifacts/ch1.tx

# dev peer joins the channel
peer channel join -b $(pwd)/artifacts/ch1.block

```

## Install the chaincode
```bash
# package the node.js chaincode
peer lifecycle chaincode package cs01.tar.gz --path chaincode/nodejs/cs01 --lang node --label mycc

# install the node.js chaincode
peer lifecycle chaincode install cs01.tar.gz --peerAddresses localhost:7051

# check if chaincode is installed
peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051

# remember the package Id
export PK_ID=mycc:ecbc4ec15302eace477c8f2fe3645b4b7315427fcf89f7dd710d455aa130f268
```

## Start/Stop the chaincode
cd chaincode/nodejs/cs01
```bash 
#### Start the node.js Chaincode ####
CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_ADDRESS=127.0.0.1:7052 CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=$PK_ID ./node_modules/.bin/fabric-chaincode-node start --peer.address 127.0.0.1:7052

```

## Terminal 3 - Approve and using the chaincode

```bash 
cd fabric/fabric-samples/dev-network/
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

# remember the package Id
export PK_ID=mycc:ecbc4ec15302eace477c8f2fe3645b4b7315427fcf89f7dd710d455aa130f268

# approve the chaincode 
peer lifecycle chaincode approveformyorg  -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --package-id $PK_ID

peer lifecycle chaincode checkcommitreadiness -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')"

peer lifecycle chaincode commit -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --peerAddresses 127.0.0.1:7051
```

## Testing the chaincode
```bash 
# call the --isInit option only for the first time
peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["storeCs","100","2021-02-21T17:15:57.928Z","reco"]}' --isInit

# query the chaincode
peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["getCsByYearMonth","2021~1~c475e5e57cd2a2dd2a4a66eb1e94c5f1dd1aad7fe5f25d458051411b058f6795"]}' | jq .

# use the chaincode
peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["storeCs","540.34","2021-04-22T17:15:57.928Z","reve"]}' 

peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["getCsByYearMonth","2021~3~1ac634c81f3b17dce80585b3cba9ae088493f2bae999e54fbc9f9bcd54173ca6"]}' | jq .

peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["getCsByYearMonth","2021~2"]}' | jq .

```

## Use the test-network
## Install the Chaincode into the test-network
```bash
cd $HOME/fabric/fabric-samples/test-network 

export FABRIC_CFG_PATH=../config

# Start network and install the chaincode in one single line
./network.sh createChannel -c channel1 && ./network.sh deployCC -c channel1 -ccn cs01CC -ccl javascript -ccv 1 -ccs 1 -ccp ../dev-network/chaincode/nodejs/cs01

# check your logs
docker-compose -f docker/docker-compose-test-net.yaml logs -f

# in terminal 2 - make clear who you are
. ./scripts/envVar.sh
setGlobals 1

# use the script
./cs01.sh

# invoke it by hand
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com  --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C channel1 -n cs01CC --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"Args":["storeCs","6555","2021-06-21T17:15:57.928Z","reco"]}'

# do the queries
peer chaincode query -o 127.0.0.1:7050 -C channel1 -n cs01CC -c '{"Args":["getCsByYearMonth","2021~1~fda3f767386ddb137ef6b09eb722339864c05b87a0f64a10a8ccceec9c28db50"]}' | jq .
peer chaincode query -o 127.0.0.1:7050 -C channel1 -n cs01CC -c '{"Args":["getCsByYearMonth","2021~2"]}' | jq .
peer chaincode query -o 127.0.0.1:7050 -C channel1 -n cs01CC -c '{"Args":["getCsByYearMonth","2020"]}' | jq .

```
[Index](../README.md)
