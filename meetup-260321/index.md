# Meetup Support Material

This lesson continues the priviouse session from 29.01.2021. Watch this session [Fabric 2.2 Chaincode Devmode Environment - Binary Edition](fabric2DevMode.md) to be prepared.

In this session I want to answer the following question: "How can we use the Node.js SDK to interact with the development environment and test chaincode?"

This is session can be divided into two parts.

1. Preparation of the chaincode development environment (our starting point)  
2. Usage of the Node.js SDK to get access to the development environment

## Preparation
See the section "Set up the development environment" in the preparation session [Fabric 2.2 Chaincode Devmode Environment - Binary Edition](fabric2DevMode.md) to setup you system. 

Follow the following steps from the preparation guide:
- Set up the development environment then follow the instructions below
- Hauskeeping


### Start the network (start orderer and peer)
```bash

tmux new -s fabric
export PATH=$(pwd)/fabric/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/fabric/sampleconfig

# generate the genesis block for the ordering service
configtxgen -profile SampleDevModeSolo -channelID syschannel -outputBlock genesisblock -configPath $FABRIC_CFG_PATH -outputBlock $(pwd)/artifacts/genesis.block

# run the commands in the background and redirect the outputs
# >/dev/null 2>&1 means redirect stdout to /dev/null and stderr to stdout 

# start the orderer
ORDERER_GENERAL_GENESISFILE=$(pwd)/artifacts/genesis.block ORDERER_FILELEDGER_LOCATION=$(pwd)/data/orderer ORDERER_GENERAL_GENESISPROFILE=SampleDevModeSolo orderer > /dev/null 2>&1 &  

# start the peer
CORE_OPERATIONS_LISTENADDRESS=0.0.0.0:10443 CORE_PEER_FILESYSTEMPATH=$(pwd)/data/ FABRIC_LOGGING_SPEC=chaincode=debug CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:7052 peer node start --peer-chaincodedev=true > /dev/null 2>&1 & 

# display all running jobs
jobs -r
```

### Create and join the channel
```bash

configtxgen -channelID ch1 -outputCreateChannelTx $(pwd)/artifacts/ch1.tx -profile SampleSingleMSPChannel -configPath $FABRIC_CFG_PATH

peer channel create -o 127.0.0.1:7050 --outputBlock $(pwd)/artifacts/ch1.block -c ch1 -f $(pwd)/artifacts/ch1.tx

# Join the channel
peer channel join -b $(pwd)/artifacts/ch1.block
```

### Install the chaincode
We use the predefined asset-transfer-basic node.js Chaincode in this example.

```bash
# set some environment vars
export FABRIC_CFG_PATH=$(pwd)/fabric/sampleconfig
export PATH=$(pwd)/fabric/build/bin:$PATH

# package the node.js chaincode
peer lifecycle chaincode package atb.tar.gz --path chaincode/nodejs/atb --lang node --label mycc

# install the node.js chaincode
peer lifecycle chaincode install atb.tar.gz --peerAddresses localhost:7051

# check if chaincode is installed
peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051

# remember the package Id
export PK_ID=mycc:8529fe2f669c176da65364d0d694ddc7f328d846718d8c54a0121c500652e446
```
### Start/Stop the chaincode

```bash
cd chaincode/nodejs/atb
CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_ADDRESS=127.0.0.1:7052 CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=$PK_ID ./node_modules/.bin/fabric-chaincode-node start --peer.address 127.0.0.1:7052
```

### Approve the chaincode

```bash
# open a new tmux panel
CTRL b + \" 

cd fabricDev/
export FABRIC_CFG_PATH=$(pwd)/fabric/sampleconfig
export PATH=$(pwd)/fabric/build/bin:$PATH

# remember the package Id
export PK_ID=mycc:8529fe2f669c176da65364d0d694ddc7f328d846718d8c54a0121c500652e446

# approve the chaincode 
peer lifecycle chaincode approveformyorg  -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --package-id $PK_ID

peer lifecycle chaincode commit -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --peerAddresses 127.0.0.1:7051

```

### Testing the chaincode
Test the chaincode with your CLI commands.

```bash
# call the --isInit option only for the first time
peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["InitLedger"]}' --isInit

peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["ReadAsset","asset1"]}'
peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["CreateAsset","A1", "red", "10", "rbole", "100"]}'
peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["ReadAsset","A1"]}' | jq .
peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["UpdateAsset","A1", "red", "10", "rbole", "1200.23"]}'

peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["GetAllAssets"}' | jq .

```

### Watch your system

```bash
# try htop and filter to node peer OR orderer
htop

# try jobs -r
jobs -r

```

## Use the Node.js SDK to get access
In this section we are going to compose a CLI application the interact with the network. The following steps are to be done:

- Create the connection profile as json file. See ccp.json
- Convert an existing identity and put it into the local wallet. See addtowallet.js
- Create an CLI program to interact with the network. See index.js

To create an identity we need the MSP folder from the fabric sampleconfig folder. You can find this sampleconfig files under the cloned fabric folder. We need this sampleconfig folder also for creating the genesis block and the channel transaction. 

Command to inspect the .pem file.
```bash
openssl x509 -in ../fabric/sampleconfig/msp/admincerts/admincert.pem -text
```

```bash
# we create a client folder 
mkdir client && cd client

# place to store the identitities
mkdir wallet

# init a npm project
npm init 

# install the fabric dependicies
npm install fabric-network --save

# create addtowallet.js file

# usage of addtowallet.js
node addtowallet.js

# create index.js

# usage index.js
node index.js GetAllAssets
```

### Logging

There are four levels of logging available within the SDK:

- info
- warn
- error
- debug

```bash
# set logging level to the console
export HFC_LOGGING='{"info":"console"}'

# set logging to a file
export HFC_LOGGING='{"error":"./error.log"}'

# unset logging level
export HFC_LOGGING=''
```