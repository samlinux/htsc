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

## Terminal 2 - create and join the channel

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
