# Fabric 2.2 Chaincode Devmode Environment - Docker Edition
In this tutorial we are going to compose a docker based network for chaincode development.

## Preparation

```bash
mkdir dev-network && cd dev-network

# make sure you have cloned the fabric git repro to some place you know
# git clone https://github.com/hyperledger/fabric.git

cp -R ../../../fabricDev/fabric/sampleconfig ./
cp ../test-network/.env ./
cp ../test-network/docker/docker-compose-test-net.yaml docker-compose.yaml

# home for our chaincodes
mkdir chaincode

# persistent ledger data
mkdir lederData

# artifacts
mkdir artifacts
```
## Customize .env 
Adjust the COMPOSE_PROJECT_NAME to dev-network.

## Customize docker-compose.yaml
We need only the orderer and peer services.

## Customize configtx.yaml
We have to change the OrdererEndpoints from 127.0.0.1:7050 to orderer.example.com:7050.

```bash
OrdererEndpoints:
  - "orderer.example.com:7050"
```
We are ready with the preparations.

## Create artifacts

```bash 
# in terminal 0
# set the FABRIC_CFG_PATH environment variable to point to the sampleconfig folder
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

# generate the genesis block for the ordering service
configtxgen -profile SampleDevModeSolo -channelID syschannel -outputBlock genesisblock -configPath $FABRIC_CFG_PATH -outputBlock $(pwd)/artifacts/genesis.block

#create channel creattion transaction
configtxgen -channelID ch1 -outputCreateChannelTx $(pwd)/artifacts/ch1.tx -profile SampleSingleMSPChannel -configPath $FABRIC_CFG_PATH
```

## Start the network
```bash
# in terminal 0
docker-compose up
```

## Create and join Channel ch1

```bash
# in terminal 1
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

# create the channel ch1
peer channel create -o 127.0.0.1:7050 --outputBlock $(pwd)/artifacts/ch1.block -c ch1 -f $(pwd)/artifacts/ch1.tx

# we can fetch the newest block as well
peer channel fetch newest $(pwd)/artifacts/ch1.block -c ch1 -o 127.0.0.1:7050

# join the peer to the channel ch1
peer channel join -b $(pwd)/artifacts/ch1.block
```

## Build and start the chaincode
At this time we should have our chaincode onto the folder chaincode e.g. chaincode/saac

**This step is also the step which you have to repeat every time if your chaincode is changing.**

```bash
cd chaincode

## Build the chaincode
# We use the simple chaincode from the fabric/integration/chaincode directory to demonstrate how to run a chaincode package in DevMode. 
# GO111MODULE=on go mod vendor 
go build -o saac ./

# Start the chaincode
# in terminal 1
CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=mycc:1.0 ./sacc -peer.address 127.0.0.1:7052
CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=mycc:1.0 ./atbcc -peer.address 127.0.0.1:7052
```

## Approve the Chaincode
This step has to be done only once.

```bash
# in terminal 2
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

peer lifecycle chaincode approveformyorg  -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --package-id mycc:1.0

peer lifecycle chaincode checkcommitreadiness -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')"

peer lifecycle chaincode commit -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --peerAddresses 127.0.0.1:7051
```

## Test your Chaincode
### Version one sacc (simple asset chaincode)
By the way this chaincode is based on old shim api implementation.

```bash
# in terminal 2
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["k1","roland"]}' --isInit
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["","k1"]}'
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["set","k1","Roland"]}'
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["set","k2","Snorre"]}'
```

### Version two atbcc (asset-transfer-basic chaincode)
By the way this chaincode is based on the chaincode-api.

```bash
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["InitLedger"]}' --isInit
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["ReadAsset","asset1"]}' | jq .
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["GetAllAssets"]}' | jq .
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["TransferAsset","asset1","Roland"]}'
```

## Stop the Network
Notice you network is persistent. We can stop and start the network at any time we want.

```bash
# in terminal 2
docker-compose down
```

## Continue your Chaincode work
```bash
# ----------------------------------------------
# in terminal 0 - start the network
# ----------------------------------------------
docker-compose up 

## OR in the background with logs
docker-compose up -d && docker-compose logs -f -t

# ----------------------------------------------
# in terminal 1 - bind and start the chaincode
# ----------------------------------------------
# make sure you are in your chaincode folder
# $(PWD) => chaincode/saac

CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=mycc:1.0 ./sacc -peer.address 127.0.0.1:7052

# ----------------------------------------------
# in terminal 2 - test your chaincode
# ----------------------------------------------
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["","k1"]}'
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["","k2"]}'
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["set","k1","Roland - xxx"]}'
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["set","k2","Snorre - now"]}'
```

## Clean up the network

```bash
rm -R ledgerData/* && rm -R artifacts/*
```

