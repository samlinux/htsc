# Comparison between Go and Node.js Chaincode

## Chaincode DevMode - Node.js

### Terminal 1 - Start the network

```bash 
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

# generate the genesis block for the ordering service
configtxgen -profile SampleDevModeSolo -channelID syschannel -outputBlock genesisblock -configPath $FABRIC_CFG_PATH -outputBlock $(pwd)/artifacts/genesis.block

#create channel creattion transaction
configtxgen -channelID ch1 -outputCreateChannelTx $(pwd)/artifacts/ch1.tx -profile SampleSingleMSPChannel -configPath $FABRIC_CFG_PATH

# start the network
docker-compose up
```

### Terminal 2 - create and join the channel

```bash 
# create a new channel
peer channel create -o 127.0.0.1:7050 --outputBlock $(pwd)/artifacts/ch1.block -c ch1 -f $(pwd)/artifacts/ch1.tx

# dev peer joins the channel
peer channel join -b $(pwd)/artifacts/ch1.block

# package the node.js chaincode
peer lifecycle chaincode package assetTransfer.tar.gz --path chaincode/nodejs/atb --lang node --label mycc

# install the node.js chaincode
peer lifecycle chaincode install assetTransfer.tar.gz --peerAddresses localhost:7051

# check if chaincode is installed
peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051

# remember the package Id
export PK_ID=mycc:3a6574368cfe1a59a9177abd17d36986b45d62b18bdb956dc9bd1415cb849634

#### Start the node.js Chaincode ####
CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_ADDRESS=127.0.0.1:7052 CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=$PK_ID ./node_modules/.bin/fabric-chaincode-node start --peer.address 127.0.0.1:7052

```

### Terminal 3 - Approve and using the chaincode

```bash 
# remember the package Id
export PK_ID=mycc:3a6574368cfe1a59a9177abd17d36986b45d62b18bdb956dc9bd1415cb849634

# approve the chaincode 
peer lifecycle chaincode approveformyorg  -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --package-id $PK_ID

peer lifecycle chaincode checkcommitreadiness -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')"

peer lifecycle chaincode commit -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --peerAddresses 127.0.0.1:7051
```

### Using the chaincode
```bash 
# init the chaoncode
peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["InitLedger"]}' --isInit

# query the chaincode
peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["GetAllAssets"]}'


```


## Overview different APIs

We have two APIs to communicate with he ledger.

- fabric-contract-api **(contract interface)**
  - provides the contract interface. A high level API for application developers to implement Smart Contracts)
- fabric-shim **(chaincode interface)**
  - provides the chaincode interface. A lower level API for implementing Smart Contracts.  It also provides the implementation to support communication with Hyperledger Fabric peers for Smart Contracts written using the fabric-contract-api together with the fabric-chaincode-node cli to launch Chaincode or Smart Contracts.

### How to use it

```bash
cd fabric/fabric-samples/dev-network/chaincode/nodejs
mkdir test1 && cd test1

npm init
npm install --save fabric-contract-api

# we need this also for the chaincode start command fabric-chaincode-node under ./node_modules/.bin/
npm install --save fabric-shim

touch index.html
mkdir lib
touch lib/note.js


```
If the chaincode is ready

```bash 
# package the node.js chaincode
cd $HOME/fabric/fabric-samples/dev-network
peer lifecycle chaincode package noteContract.tar.gz --path chaincode/nodejs/note1 --lang node --label noteCC

# install the node.js chaincode
peer lifecycle chaincode install noteContract.tar.gz --peerAddresses localhost:7051

# check if chaincode is installed
peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051

# remember the package Id
export PK_ID=noteCC:42c541a449216c91dbfaf84f0e358790d0603df1841d73c01cef1b59257f139e

#### Start the node.js Chaincode ####
cd chaincode/nodejs/note1
CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_ADDRESS=127.0.0.1:7052 CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=$PK_ID ./node_modules/.bin/fabric-chaincode-node start --peer.address 127.0.0.1:7052


```

In terminal 3

```bash
# remember the package Id
export PK_ID=noteCC:42c541a449216c91dbfaf84f0e358790d0603df1841d73c01cef1b59257f139e

# approve the chaincode 
peer lifecycle chaincode approveformyorg  -o 127.0.0.1:7050 --channelID ch1 --name noteCC --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --package-id $PK_ID

peer lifecycle chaincode checkcommitreadiness -o 127.0.0.1:7050 --channelID ch1 --name noteCC --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')"

peer lifecycle chaincode commit -o 127.0.0.1:7050 --channelID ch1 --name noteCC --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --peerAddresses 127.0.0.1:7051
```

### Testing the chaincode
```bash 
# init the chaincode for the first time
peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n noteCC -c '{"Args":["storeNote","n1","hallo Cortina"]}' --isInit

# query the chaincode
peer chaincode query -o 127.0.0.1:7050 -C ch1 -n noteCC -c '{"Args":["getNote","n1"]}' | jq .

# init the chaincode for the first time
peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n noteCC -c '{"Args":["storeNote","n2","this is super, Cortina 2021"]}' 

```
### Install the Chaincode onto the test-network
```bash
cd $HOME/fabric/fabric-samples/test-network 

export FABRIC_CFG_PATH=../config

peer lifecycle chaincode package noteContract.tar.gz --path ../dev-network/chaincode/nodejs/note1 --lang node --label noteCC

# start the network with channel1
./network.sh createChannel -c channel1 

# Install the chaoncode
./network.sh createChannel -c channel1 && ./network.sh deployCC -c channel1 -ccn noteCC -ccl javascript -ccv 1 -ccs 1 -ccp ../dev-network/chaincode/nodejs/note1

docker-compose -f docker/docker-compose-test-net.yaml logs -f

# in terminal 2
. ./scripts/envVar.sh
setGlobals 1

peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com  --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C channel1 -n noteCC --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"Args":["storeNote","n2","this is super, Cortina 2021"]}'


peer chaincode query -o 127.0.0.1:7050 -C channel1 -n noteCC -c '{"Args":["getNote","n1"]}' | jq .

```