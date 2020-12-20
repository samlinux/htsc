# DRAFT

# Fabric 2.2 chaincode devmode environment
In this tutorial you will learn how you can enable the so called devmode for chaincode development. The devmode is running with binaries **without** docker containers.

## Set up environment
```bash
mkdir fabricDev
cd fabricDev
git clone https://github.com/hyperledger/fabric.git

cd fabric

# run the following commands to build the binaries for orderer, peer, and configtxgen
make orderer peer configtxgen

# set the PATH environment variable to include orderer and peer binaries:
export PATH=$(pwd)/build/bin:$PATH

# set the FABRIC_CFG_PATH environment variable to point to the sampleconfig folder
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

# generate the genesis block for the ordering service
configtxgen -profile SampleDevModeSolo -channelID syschannel -outputBlock genesisblock -configPath $FABRIC_CFG_PATH -outputBlock $(pwd)/sampleconfig/genesisblock
```

## Start the orderer
```bash
# in terminal 1
ORDERER_GENERAL_GENESISPROFILE=SampleDevModeSolo orderer
```

## Start the peer in DevMode
```bash
# in terminal 2
# Open another terminal window and set the required environment variables to override the peer configuration and start the peer node. Starting the peer with the --peer-chaincodedev=true flag puts the peer into DevMode.

# we have to modify core.yaml and change the port to 10443, because 9443 is double used between the orderer and the peer
operations:
  # host and port for the operations server
  listenAddress: 127.0.0.1:10443

export PATH=$(pwd)/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/sampleconfig
FABRIC_LOGGING_SPEC=chaincode=debug CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:7052 peer node start --peer-chaincodedev=true

```
## Create the channel ch1
```bash
export PATH=$(pwd)/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/sampleconfig
configtxgen -channelID ch1 -outputCreateChannelTx ch1.tx -profile SampleSingleMSPChannel -configPath $FABRIC_CFG_PATH

peer channel create -o 127.0.0.1:7050 -c ch1 -f ch1.tx
```

## Join the channel
```bash 
peer channel join -b ch1.block
```

## Build the chaincode
```bash 
# We use the simple chaincode from the fabric/integration/chaincode directory to demonstrate how to run a chaincode package in DevMode. 

go build -o simpleChaincode ./integration/chaincode/simple/cmd
```

## Start the chaincode
```bash 
# in terminal 3
CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=mycc:1.0 ./simpleChaincode -peer.address 127.0.0.1:7052
```

## Approve and commit the chaincode definition

```bash 
# in terminal 4

export PATH=$(pwd)/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/sampleconfig

peer lifecycle chaincode approveformyorg  -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --package-id mycc:1.0

peer lifecycle chaincode checkcommitreadiness -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')"

peer lifecycle chaincode commit -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --peerAddresses 127.0.0.1:7051
```

## Test the chaincode

```bash
# in terminal 4
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["init","a","100","b","200"]}' --isInit
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["invoke","a","b","10"]}'
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["query","a"]}'
```
