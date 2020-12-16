# How to create your own fabric network
In this guide you will create a **persistent** three org fabric network with a one node RAFT orderer.  

We need the following files:

- crypto-config.yaml (create identities)
- configtx.yaml (system channel and application channel config)
- docker-compose.yaml (create a docker network with some containers)

## Preparation
```bash
# here we are - base folder pwd shows
fabric-samples/

# create a new base folder into the fabric-samples folder
mkdir own-network

#  Cleaning things up 
rm -Rf organizations
rm -Rf channel-artifacts
rm -Rf channel-artifacts

# copy some file from the test-network
mkdir configtx
cp ../test-network/configtx/* configtx/
cp ../test-network/docker/docker-compose-test-net.yaml ./docker-compose.yaml
```
## Create crypto-config.yaml file
Create a crypto-config.yaml file for the cryptogen tool.

```bash
vi crypto-config.yaml
cat ../test-network/organizations/cryptogen/crypto-config-orderer.yaml >> crypto-config.yaml
cat ../test-network/organizations/cryptogen/crypto-config-org1.yaml >> crypto-config.yaml

# extend org2 + org3
```
## Prepare the configtx.yaml
Modify the configtx.yaml file.

Section Organizations; add Org3    
Section Profile; add ThreeOrgsOrdererGenesis, ThreeOrgsChannel profile


## Generate artifacts

```bash
# tell the configtxgen tool where to look for the configtx.yaml file
export FABRIC_CFG_PATH=$PWD/configtx

# the name of the channel
export CHANNEL_NAME=channel1 
export SYS_CHANNEL_NAME=sys-channel 

# Generate the artifacts (identities)
cryptogen generate --config=./crypto-config.yaml --output organizations

# create channel-artifacts and system-genesis-block folder
mkdir channel-artifacts
mkdir system-genesis-block

# create genesis block
configtxgen -profile ThreeOrgsOrdererGenesis -channelID $SYS_CHANNEL_NAME -outputBlock ./system-genesis-block/genesis.block

# create a Channel Configuration Transaction
configtxgen -profile ThreeOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel_$CHANNEL_NAME.tx -channelID $CHANNEL_NAME

# create the anchor peer transactions for each peer org
configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org1MSP

configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org2MSP

configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org3MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org3MSP

# finally check for work
tree ./organizations -L 2
tree ./channel-artifacts
tree ./system-genesis-block

```

## Start network
Modify the docker-compose-yaml file. Please note the CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE docker variable and also the .env file. 

```bash
- CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=${COMPOSE_PROJECT_NAME}_own-network

vi .env
COMPOSE_PROJECT_NAME=own-network
IMAGE_TAG=latest
SYS_CHANNEL=system-channel

# !! chnage the network name as well to own-network
networks:
  - own-network
```

```bash 
# terminal 1
# start the network as a foreground process (we work with two terminals)
docker-compose up
```

# Create Channel
```bash 
# terminal 2
cd fabric/fabric-samples/own-network

# set some env vars
export FABRIC_CFG_PATH=$PWD/../config/
export CHANNEL_NAME=channel1 
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# create env files to switch between orgs
- create org1.env
- create org2.env
- create org3.env

vi org1.env
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
export FABRIC_CFG_PATH=$PWD/../config/

# do this also for org2.env and org3.env

# switch to the org1 env
source org1.env

# create channel
peer channel create -o localhost:7050 -c $CHANNEL_NAME --ordererTLSHostnameOverride orderer.example.com -f ./channel-artifacts/channel_${CHANNEL_NAME}.tx --outputBlock ./channel-artifacts/${CHANNEL_NAME}.block --tls --cafile $ORDERER_CA 

# join org1 to channel
peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block

## check the result with  peer channel list

# join org2 to channel
source org2.env
peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block

# join org3 to channel
source org3.env
peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block

# update anchor peer per org

source org1.env
peer channel update -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME -f ./channel-artifacts/Org1MSPanchors.tx --tls --cafile $ORDERER_CA 

source org2.env
peer channel update -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME -f ./channel-artifacts/Org2MSPanchors.tx --tls --cafile $ORDERER_CA 

source org3.env
peer channel update -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME -f ./channel-artifacts/Org3MSPanchors.tx --tls --cafile $ORDERER_CA 
```

We are ready with the network and channel configuration. At this point we can start installing some chaincode.


# Install Chaincode
As a demo we are going to use the abstore chaincode example.

```bash
mkdir chaincode
cp -r ../chaincode/abstore/go/ chaincode/abstore/

# if needed
rm -r  chaincode/abstore/vendor

cd ./chaincode/abstore

# install (external) go dependencies
GO111MODULE=on go mod vendor

## fabric chaincode lifecycle
# step 1 - package the chaincode
cd ../../
peer lifecycle chaincode package basic.tar.gz --path ./chaincode/abstore/ --lang golang --label basic_1

# check the content 
tar -tvf basic.tar.gz

# install CC on peer0 Org1
source org1.env
peer lifecycle chaincode install basic.tar.gz

# basic_1:d44a118ea789f00646aec920719320c9c177a68c59150195ec479f3b42e1a672

# install CC on peer0 Org2
source org2.env
peer lifecycle chaincode install basic.tar.gz

# install CC on peer0 Org3
source org3.env
peer lifecycle chaincode install basic.tar.gz

# we switch back to org1
source org1.env
export PKGID=basic_1:d44a118ea789f00646aec920719320c9c177a68c59150195ec479f3b42e1a672

# approve CC for Org1
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name basic --version 1 --package-id $PKGID --sequence 1

# approve CC for Org2
source org2.env
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name basic --version 1 --package-id $PKGID --sequence 1

# check readyness
peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name basic --version 1 --sequence 1 --tls --cafile $ORDERER_CA --output json

# approve CC for Org3
source org3.env
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name basic --version 1 --package-id $PKGID --sequence 1


# commit the CC
source org1.env

# note it is important to send the commit statement to at least 2 orgs, because of the chaincode endorsement lifecyle rule: MAJORITY

peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID $CHANNEL_NAME --name basic --version 1 --sequence 1 --tls --cafile $ORDERER_CA --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --peerAddresses localhost:10051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt

# check the result
peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name basic --cafile $ORDERER_CA

```

# Use the chaincode
Finally we can use the chaincode.

```bash 
# first init the chaincode
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA -C $CHANNEL_NAME -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt  --peerAddresses localhost:10051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt -c '{"function":"Init","Args":["account1","1000","account2","10"]}'

# query the chaincode
peer chaincode query -C $CHANNEL_NAME -n basic -c '{"function":"Query","Args":["account1"]}'

# invoke the chaincode from org3
source org3.env

peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA -C $CHANNEL_NAME -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt  --peerAddresses localhost:10051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt -c '{"function":"Invoke","Args":["account1","account2","100"]}'

```

# A persistent network
```bash
# stop the network
docker-compose down 

# start the network in the background
docker-compose up -d

# show the logs
docker-compose logs -f -t

# Notice that your system is persistent and you can start the network as long as you not clean up the docker volumes.
docker volume ls
docker volume prune

# check your containers
## to see the network
docker-compose ps

## to see the chaincode-container as well
docker ps

````
