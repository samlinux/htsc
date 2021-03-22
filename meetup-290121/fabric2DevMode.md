# Fabric 2.2 Chaincode Devmode Environment - Binary Edition
In this tutorial you will learn how you can enable the so called **peer devmode** for chaincode development. The devmode is running with binaries and **without** docker containers.

# Contents
- [Set up the Development Environment](#Set-up-the-development-environment)
- [Start the Orderer](#Start-the-orderer)
- [Start the peer in DevMode](#Start-the-peer-in-DevMode)
- [Create the Channel](#Create-the-channel-ch1)
- [Join the Channel](#Join-the-channel)
- [Build the Chaincode](#Build-the-chaincode)
- [Start the Chaincode](#Start-the-Chaincode)
- [Approve and commit the Chaincode](#Approve-and-commit-the-Chaincode)
- [Test your Chaincode](#Test-your-Chaincode)
- [Modify your Chaincode](#Modify-your-Chaincode)
- [Helpful tmux operations](#Helpful-tmux-operations)
- [Stop the network](#Stop-the-network)
- [Start the network again](#Start-the-network-again)
- [Housekeepting](#Housekeepting)

For the next steps we need four terminals. You can use four different ssh terminals or one tmux terminal with four panels as well. 

# Housekeepting
To clean up the system we have to delete the content of the data folder (leader data) and the content of the artifacts folder.

```bash
rm -R $(pwd)/data/*
rm $(pwd)/artifacts/*
```

# Set up the development environment

```bash
mkdir fabricDev
cd fabricDev
# clone the latest fabric repro
git clone https://github.com/hyperledger/fabric.git

# switch onto this folder
cd fabric

# create a place to store the artifacts
mkdir artifacts

# create a place to store our chaincodes
mkdir chaincode
```
At this time you should have a folder structure like the following:

```bash
root@fabric-04:~/fabricDev# tree -L 1 .
.
├── artifacts
├── chaincode
└── fabric
```

```bash
# as a next step you have to build the binaries
# run the following commands to build the binaries for orderer, peer, and configtxgen
## we switch into the fabric-folder
cd fabric

## build (make sure you have installed gcc and make), Building build/bin/
make orderer peer configtxgen

## if you are ready then go back
cd ../

# set the PATH environment variable to include orderer and peer binaries
export PATH=$(pwd)/fabric/build/bin:$PATH

# set the FABRIC_CFG_PATH environment variable to point to the sampleconfig folder and MSP
export FABRIC_CFG_PATH=$(pwd)/fabric/sampleconfig

# generate the genesis block for the ordering service
configtxgen -profile SampleDevModeSolo -channelID syschannel -outputBlock genesisblock -configPath $FABRIC_CFG_PATH -outputBlock $(pwd)/artifacts/genesis.block
```

# Start the orderer
```bash
# in terminal 0
export PATH=$(pwd)/fabric/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/fabric/sampleconfig

## version with environment variables
export ORDERER_GENERAL_GENESISFILE=$(pwd)/artifacts/genesis.block
export ORDERER_FILELEDGER_LOCATION=$(pwd)/data/orderer
export ORDERER_GENERAL_GENESISPROFILE=SampleDevModeSolo 
orderer

## version in a single command
ORDERER_GENERAL_GENESISFILE=$(pwd)/artifacts/genesis.block ORDERER_FILELEDGER_LOCATION=$(pwd)/data/orderer ORDERER_GENERAL_GENESISPROFILE=SampleDevModeSolo orderer
```

# Start the peer in DevMode
```bash
# in terminal 1
# Open another terminal window and set the required environment variables to override the peer configuration and start the peer node. Starting the peer with the --peer-chaincodedev=true flag puts the peer into DevMode.

export PATH=$(pwd)/fabric/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/fabric/sampleconfig

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
# Create the channel
```bash
# in terminal 2
export PATH=$(pwd)/fabric/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/fabric/sampleconfig

configtxgen -channelID ch1 -outputCreateChannelTx $(pwd)/artifacts/ch1.tx -profile SampleSingleMSPChannel -configPath $FABRIC_CFG_PATH

peer channel create -o 127.0.0.1:7050 --outputBlock $(pwd)/artifacts/ch1.block -c ch1 -f $(pwd)/artifacts/ch1.tx

# we can fetch the newest block as well
# peer channel fetch newest $(pwd)/artifacts/ch1.block -c ch1 -o 127.0.0.1:7050
```

# Join the channel
```bash 
peer channel join -b $(pwd)/artifacts/ch1.block
```

# Build the chaincode
Now it is time to use your chaincode.

```bash 
# We use the simple chaincode from the fabric/integration/chaincode directory to demonstrate how to run a chaincode package in DevMode. 
cp -R ../fabric/fabric-samples/chaincode/sacc/ chaincode
cd chaincode/sacc

#go mod init chaincode
G111MODULE=on go mod vendor 
go build -o simpleChaincode 
```

# Start the Chaincode
```bash 

export DEVMODE_ENABLED=true

# in terminal 3
CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=mycc:1.0 ./simpleChaincode -peer.address 127.0.0.1:7052

```

# Approve and commit the Chaincode

```bash 
# in terminal 4

export PATH=$(pwd)/fabric/build/bin:$PATH
export FABRIC_CFG_PATH=$(pwd)/fabric/sampleconfig

peer lifecycle chaincode approveformyorg  -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --package-id mycc:1.0

peer lifecycle chaincode checkcommitreadiness -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')"

peer lifecycle chaincode commit -o 127.0.0.1:7050 --channelID ch1 --name mycc --version 1.0 --sequence 1 --init-required --signature-policy "OR ('SampleOrg.member')" --peerAddresses 127.0.0.1:7051
```

# Test your Chaincode

```bash
# in terminal 4
## calls the init function
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["msg","Hello"]}'  --isInit

# querys the key
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["","msg"]}'

# set new value
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["set","msg2","Hello2"]}'  

```

# Modify your Chaincode
Stop the chaincode in terminal 2.
```bash 
CTRL + c
```

Modify the chaincode e.g. add some debug values. Add the following snippet into the get function (befor the return command).
```
if os.Getenv("DEVMODE_ENABLED") != "" {
  fmt.Printf("Asset: %s\n",args[0])
}

# add the os package to the import statement
"os"
```

Build your chaincode again.
```bash
go build -o simpleChaincode
```

Start your chaincode again.
```bash
CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=mycc:1.0 ./simpleChaincode -peer.address 127.0.0.1:7052

DEVMODE_ENABLED=test CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=mycc:1.0 ./simpleChaincode -peer.address 127.0.0.1:7052

DEVMODE_ENABLED= CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=mycc:1.0 ./simpleChaincode -peer.address 127.0.0.1:7052

```

# Helpful tmux operations
```bash 
# start a new tmux session
tmux new -s mysession

# split your screen
## split pane horizontally
CTRL + b \" (do it without the backslash)

## split pane vertically
CTRL + b %   

# switch between panels
CTRL + q 1 (the number of the panel)

# leave the running tmux session
CTRL + b d

# show all running tmux session
tmux ls

# attach a running tmux session
tmux att -t fabricDev

# enable scrolling mode
CTRL + b fn + up

# leave scrolling mode
ESC

# remove a panel
CTRL + b x

```

# Stop the network
```bash
# kill the chaincode
pkill -9 simpleChaincode

# kill the peer
pkill -9 peer

# kill the orderer
pkill -9 orderer

# or use a bash script
```

# Start the network again
```bash 
# start the orderer in terminal 0

# start the peer in terminal 1

# start the chaincode in terminal 2

# do your CLI calls from terminal 3
```
