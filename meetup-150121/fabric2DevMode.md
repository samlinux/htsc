# Fabric 2.2 Chaincode Devmode Environment - Binary Edition
In this tutorial you will learn how you can enable the so called **peer devmode** for chaincode development. The devmode is running with binaries **without** docker containers.

## Set up environment
```bash
mkdir fabricDev
cd fabricDev
git clone https://github.com/hyperledger/fabric.git

cd fabric

# place to store the artifacts
mkdir artifacts

# make sure you have the gcc (gnu compiler collection) installed on your system, if not install it
apt install gcc

# run the following commands to build the binaries for orderer, peer, and configtxgen
make orderer peer configtxgen

# set the PATH environment variable to include orderer and peer binaries:
export PATH=$(pwd)/build/bin:$PATH

# set the FABRIC_CFG_PATH environment variable to point to the sampleconfig folder
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

# generate the genesis block for the ordering service
configtxgen -profile SampleDevModeSolo -channelID syschannel -outputBlock genesisblock -configPath $FABRIC_CFG_PATH -outputBlock $(pwd)/artifacts/genesis.block
```

## Start the orderer
```bash
# in terminal 0
export PATH=$(pwd)/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

## version with environment variables
export ORDERER_GENERAL_GENESISFILE=$(pwd)/artifacts/genesisblock
export ORDERER_FILELEDGER_LOCATION=$(pwd)/data/orderer
export ORDERER_GENERAL_GENESISPROFILE=SampleDevModeSolo 
orderer

## version in a single command
ORDERER_GENERAL_GENESISFILE=$(pwd)/artifacts/genesisblock ORDERER_FILELEDGER_LOCATION=$(pwd)/data/orderer ORDERER_GENERAL_GENESISPROFILE=SampleDevModeSolo orderer
```

## Start the peer in DevMode
```bash
# in terminal 1
# Open another terminal window and set the required environment variables to override the peer configuration and start the peer node. Starting the peer with the --peer-chaincodedev=true flag puts the peer into DevMode.

export PATH=$(pwd)/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

# we have to modify core.yaml and change the port to 10443, because 9443 is double used between the orderer and the peer (operations services)

## version with environment variables
export CORE_OPERATIONS_LISTENADDRESS=0.0.0.0:10443
export CORE_PEER_FILESYSTEMPATH=$(pwd)/data/
export FABRIC_LOGGING_SPEC=chaincode=debug 
export CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:7052 

peer node start --peer-chaincodedev=true

## version in a single command
CORE_OPERATIONS_LISTENADDRESS=0.0.0.0:10443 CORE_PEER_FILESYSTEMPATH=$(pwd)/data/ FABRIC_LOGGING_SPEC=chaincode=debug CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:7052 peer node start --peer-chaincodedev=true

```
## Create the channel ch1
```bash
# in terminal 2
export PATH=$(pwd)/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

configtxgen -channelID ch1 -outputCreateChannelTx $(pwd)/artifacts/ch1.tx -profile SampleSingleMSPChannel -configPath $FABRIC_CFG_PATH

peer channel create -o 127.0.0.1:7050 --outputBlock $(pwd)/artifacts/ch1.block -c ch1 -f $(pwd)/artifacts/ch1.tx

# we can fetch the newest block as well
peer channel fetch newest $(pwd)/artifacts/ch1.block -c ch1 -o 127.0.0.1:7050
```

## Join the channel
```bash 
peer channel join -b $(pwd)/artifacts/ch1.block
```

## Build the chaincode
```bash 
# We use the simple chaincode from the fabric/integration/chaincode directory to demonstrate how to run a chaincode package in DevMode. 
# GO111MODULE=on go mod vendor 
go build -o simpleChaincode ./integration/chaincode/simple/cmd
```

## Start the Chaincode
```bash 
# in terminal 3
CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=mycc:1.0 ./simpleChaincode -peer.address 127.0.0.1:7052

```

## Approve and commit the Chaincode

```bash 
# in terminal 4

export PATH=$(pwd)/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

peer lifecycle chaincode approveformyorg  -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --package-id mycc:1.0

peer lifecycle chaincode checkcommitreadiness -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')"

peer lifecycle chaincode commit -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --peerAddresses 127.0.0.1:7051
```

## Test your Chaincode

```bash
# in terminal 4
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["init","a","100","b","200"]}' --isInit
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["invoke","a","b","10"]}'
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["query","a"]}'
```

## Leave the running tmux session

```bash
CTRL + b d
```

## Show all running tmux session

```bash
tmux ls
```

## Attach a running tmux session

```bash
cd fabricDev
tmux att fabricDev
```

## Stop the network
```bash
# kill the chaincode
pkill -9 simpleChaincode

# kill the peer
pkill -9 peer

# kill the orderer
pkill -9 orderer

# or use a bash script

```

## Start the network again
```bash 
# start the orderer in terminal 0

# start the peer in terminal 1

# start the chaincode in terminal 2

# do your CLI calls from terminal 3

```

## Clean up the system
To clean up the system we have to delete the content of the data folder (leader data) and the content of the artifacts folder.

```bash
rm -R $(pwd)/data/*
rm $(pwd)/artifacts/*
```

