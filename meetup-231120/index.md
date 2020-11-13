# Channels, all about channels

## System Channel
- Is the first channel that is created in a Fabric network.
- There is only one system channel.
- It defines the set of ordering nodes that form the ordering service.
- It defines the set of organizations that serve as ordering service administrators.
- It defines the organizations that are members of blockchain consortium.
- The consortium is a set of peer organizations that belong to the system channel, but are not administrators of the ordering service. Consortium members have the ability to create new channels and include other consortium organizations as channel members.
- The genesis block of the system channel is required to deploy a new ordering service. 
- There is a genesis block for the ledger.

### Prepare mynetwork.sh

```bash
cp network.sh myNetwork.sh
chmod 755 myNetwork.sh
```

Edit function networkUp. Comment function createConsortium and docker-compose command.

### Create only crypto material
```bash
./myNetwork.sh up

# check folder organizations
tree -L 2 organizations/ 
```

### Create System channel
```bash
configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block -configPath ./configtx
``` 

### Start the network
```bash 
docker-compose -f docker/docker-compose-test-net.yaml up -d

docker ps

```

## Application Channel A
- A Channel is a private “subnet” of communication between two or more specific network members, for the purpose of conducting private and confidential transactions.
- You can have as many as possible application channels.
- A channel is defined by 
   - members/organizations of the consortium,
   - anchor peers per member
   - the shared ledger (there is one ledger per channel)
   - a chaincode
   - the ordering service nodes.
-  Each transaction on the network is executed on a channel, where each party must be authenticated and authorized to transact on that channel. 
- Each peer that joins a channel, has its own identity given by a membership services provider (MSP), which authenticates each peer to its channel peers and services.
- There is a genesis block for the channel.


```bash
export CHANNEL_NAME=mychannel
export ORDERER_CA=organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem

# create channel transaction
configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID $CHANNEL_NAME -configPath ./configtx/

# create anchor peer transaction
# for Org1 and Org2
configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org1MSP -configPath ./configtx/

configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org2MSP -configPath ./configtx/

# create createChannel
. ./scripts/envVar.sh
setGlobals 1

peer channel create -o localhost:7050 -c $CHANNEL_NAME --ordererTLSHostnameOverride orderer.example.com -f ./channel-artifacts/${CHANNEL_NAME}.tx --outputBlock ./channel-artifacts/${CHANNEL_NAME}.block --tls --cafile $ORDERER_CA 

## join the channel
# join peer0.org1.example.co
peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block 

# check if peer has joined the channel
peer channel list -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com  --tls --cafile $ORDERER_CA 

setGlobals 2
peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block

setGlobals 1

## update the updateAnchorPeers
peer channel update -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME -f ./channel-artifacts/Org1MSPanchors.tx --tls --cafile $ORDERER_CA

setGlobals 2
peer channel update -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME -f ./channel-artifacts/Org2MSPanchors.tx --tls --cafile $ORDERER_CA

```

## Install chaincode abstore on mychannel

```bash
cd ../chaincode/abstore/go/
GO111MODULE=on go mod vendor

cd ../../../test-network/
peer lifecycle chaincode package abstore.tar.gz --path ../chaincode/abstore/go/ --lang golang --label abstore_1

# install one peer0 Org1
setGlobals 1
peer lifecycle chaincode install abstore.tar.gz

# install one peer0 Org2
setGlobals 2
peer lifecycle chaincode install abstore.tar.gz

# check installed chaincode and get PKID
setGlobals 1
peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051 --tlsRootCertFiles organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

#Installed chaincodes on peer:
#Package ID: abstore_1:3918d0438fd2ebe48ed1bde01533513a14f788846fd2d72ef054482760e73409, Label: abstore_1

export PKGID=abstore_1:3918d0438fd2ebe48ed1bde01533513a14f788846fd2d72ef054482760e73409

# approve for Org1
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name abstore --version 1 --package-id $PKGID --sequence 1

# approve for Org2
setGlobals 2
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name abstore --version 1 --package-id $PKGID --sequence 1

# commit the CC
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name abstore --peerAddresses localhost:7051 --tlsRootCertFiles $PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --version 1 --sequence 1
```

### Use the internal CC

```bash
# call the invoke

peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n abstore --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"Init","Args":["account1","1000","account2","10"]}'

# query the CC
peer chaincode query -C mychannel -n abstore -c '{"function":"Query","Args":["account1"]}'
peer chaincode query -C mychannel -n abstore -c '{"function":"Query","Args":["account2"]}'

# invoke the CC
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com  --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n abstore --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"Invoke","Args":["account1","account2","100"]}'
```

## Application Channel B
Edit test-network/configtx/configtx.yaml and add the following to the Profiles section.

```bash
OneOrgsChannel:
    Consortium: SampleConsortium
    <<: *ChannelDefaults
    Application:
        <<: *ApplicationDefaults
        Organizations:
            - *Org1
        Capabilities:
            <<: *ApplicationCapabilities
```

```bash
# set some environment vars
export CHANNEL_NAME=org1channel
export ORDERER_CA=../test-network/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem
export FABRIC_CFG_PATH=$PWD/../config/

# create channel transaction
configtxgen -profile OneOrgsChannel -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID $CHANNEL_NAME -configPath ./configtx/

# inspect and compare boath *.tx files
# watch the difference between the read_set and the write_set
configtxgen --inspectChannelCreateTx channel-artifacts/org1channel.tx
configtxgen --inspectChannelCreateTx channel-artifacts/mychannel.tx

configtxgen --inspectChannelCreateTx channel-artifacts/mychannel.tx | jq .payload.data.config_update.read_set

# create createChannel
. ./scripts/envVar.sh
setGlobals 1

peer channel create -o localhost:7050 -c $CHANNEL_NAME --ordererTLSHostnameOverride orderer.example.com -f ./channel-artifacts/${CHANNEL_NAME}.tx --outputBlock ./channel-artifacts/${CHANNEL_NAME}.block --tls --cafile $ORDERER_CA 

# you can inspect this ledger genesis block
configtxlator proto_decode --type=common.Block --input=channel-artifacts/org1channel.block | jq .

## join the channel
# join peer0.org1.example.co
peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block 

# check if peer has joined the channel
peer channel list -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com  --tls --cafile $ORDERER_CA 
```

## What happend with Org2
We can try to create a new channel with Org2 with the same channel.tx file, what will happen?

```bash
setGlobals 2

peer channel create -o localhost:7050 -c $CHANNEL_NAME --ordererTLSHostnameOverride orderer.example.com -f ./channel-artifacts/${CHANNEL_NAME}.tx --outputBlock ./channel-artifacts/${CHANNEL_NAME}.block --tls --cafile $ORDERER_CA 

# we should receive a message like this!

# 2020-11-13 09:38:29.382 CET [channelCmd] InitCmdFactory -> INFO 001 Endorser and orderer connections initialized
# Error: got unexpected status: FORBIDDEN -- config update for existing channel did not pass initial checks: implicit policy evaluation failed - 0 sub-policies were satisfied, but this policy requires 1 of the 'Writers' sub-policies to be satisfied: permission denied

```

### Install chaincode abstore on org1channel

```bash
# check installed chaincode and get PKID
setGlobals 1
peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051 --tlsRootCertFiles organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

#Installed chaincodes on peer:
#Package ID: abstore_1:3918d0438fd2ebe48ed1bde01533513a14f788846fd2d72ef054482760e73409, Label: abstore_1

export PKGID=abstore_1:3918d0438fd2ebe48ed1bde01533513a14f788846fd2d72ef054482760e73409

# approve for Org1
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID org1channel --name abstore --version 1 --package-id $PKGID --sequence 1

# check readyness
peer lifecycle chaincode checkcommitreadiness --channelID org1channel --name abstore --version 1 --sequence 1 --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --output json

# commit the CC
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID org1channel --name abstore --peerAddresses localhost:7051 --tlsRootCertFiles $PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt  --version 1 --sequence 1
```

### Use the CC on channel org1channel

```bash
# call the invoke

peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C org1channel -n abstore --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt  -c '{"function":"Init","Args":["account1","2000","account2","0"]}'

# query the CC
peer chaincode query -C org1channel -n abstore -c '{"function":"Query","Args":["account1"]}'
peer chaincode query -C org1channel -n abstore -c '{"function":"Query","Args":["account2"]}'

# invoke the CC
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com  --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C org1channel -n abstore --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt -c '{"function":"Invoke","Args":["account1","account2","100"]}'
```

## Optional fast track - use the network.sh script
```bash 
# switch to project folder
cd fabric/fabric-sambples/test-network

# start network an create mychannel
./network.sh up createChannel

# deplay chaoncode basic-asset-transfer
./network.sh deployCC

# show all logs
docker-compose -f docker/docker-compose-test-net.yaml logs -f -t
```

## Using the asset-transfer-basic external chaincode

```bash
# set some environment vars
export FABRIC_CFG_PATH=$PWD/../config/
. ./scripts/envVar.sh
setGlobals 1

# init ledger data
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"InitLedger","Args":[]}'

# do a query
peer chaincode query -C mychannel -n basic -c '{"function":"ReadAsset","Args":["asset1"]}'

# update an asset
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"UpdateAsset","Args":["asset1","green","10","Roland","700"]}'

```

## How many blocks are in a channel?
```bash

peer channel getinfo -c mychannel
peer channel getinfo -c org1channel

```