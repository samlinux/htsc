# How to use CouchDb for your Chaincode
This example is based on the session example from 26.02.2021 and extends this example with a couchDb query.

- modify the chaincode
- set index for couchDb 
- start the Docker devmode composition

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

## Some notes to usage
See the files:
- [index.js](./index.js)
- [lib/cs01.js](./lib/cs01.js)


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
peer lifecycle chaincode package cs01-2.tar.gz --path chaincode/nodejs/cs01-2 --lang node --label mycc

# install the node.js chaincode
peer lifecycle chaincode install cs01-2.tar.gz --peerAddresses localhost:7051

# check if chaincode is installed
peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051

# remember the package Id
export PK_ID=mycc:8081236aa489ea33cd5e588ba1ba54644ecd1cdbde2695c9283e2470875e4ba3
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
export PK_ID=mycc:8081236aa489ea33cd5e588ba1ba54644ecd1cdbde2695c9283e2470875e4ba3

# approve the chaincode 
peer lifecycle chaincode approveformyorg  -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --package-id $PK_ID

peer lifecycle chaincode checkcommitreadiness -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')"

peer lifecycle chaincode commit -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --peerAddresses 127.0.0.1:7051
```

## Testing the chaincode
Test the chaincode with your CLI commands.

```bash 
# call the --isInit option only for the first time
peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["storeCs","100","2021-02-21T17:15:57.928Z","reco"]}' --isInit

peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["storeCs","540.34","2021-03-01T17:15:57.928Z","reve"]}'
peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["storeCs","760","2021-03-22T17:15:57.928Z","reve"]}'

# query the chaincode
## query by year
peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["getCsByYearMonth","2021"]}' | jq .

## query by month
peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["getCsByYearMonth","2021~2"]}' | jq .

## query by full key
peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["getCsByYearMonth","2021~3~1ac634c81f3b17dce80585b3cba9ae088493f2bae999e54fbc9f9bcd54173ca6"]}' | jq .

## query by time range (date to date)
peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["getCsByTimeRange","2021-04-01T01:15:57.928Z", "2021-04-30T17:15:57.928Z"]}' | jq .

```



