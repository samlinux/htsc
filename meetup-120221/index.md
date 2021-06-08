# How you can use Node.js as an application developer

## How to use Node.js as a chaincode
In this example we are going to use the predefined asset-basic-transfer chaincode.

```bash
# switch to the base folder
cd fabric-samples/test-network

# bring up the network
./network.sh up createChannel -c channel1 -ca

# install default CC - asset-transfer (basic) chaincode
cd ../asset-transfer-basic/chaincode-javascript
npm install 
cd ../../test-network

export FABRIC_CFG_PATH=$PWD/../config/

peer lifecycle chaincode package basic.tar.gz --path ../asset-transfer-basic/chaincode-javascript/ --lang node --label basic_1.0

# install one peer0 Org1
. ./scripts/envVar.sh

setGlobals 1
peer lifecycle chaincode install basic.tar.gz

# install one peer0 Org2
setGlobals 2
peer lifecycle chaincode install basic.tar.gz

# check installed chaincode and get PKID
setGlobals 1
peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051 --tlsRootCertFiles organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

export PKGID=basic_1.0:d2e3329812d27a187ea1f84b1a2c45cb7bf5e677a139044a3af3188e308f2c89

# approve for Org1
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --version 1 --package-id $PKGID --sequence 1

# approve for Org2
setGlobals 2
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --version 1 --package-id $PKGID --sequence 1

# commit the CC
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --peerAddresses localhost:7051 --tlsRootCertFiles $PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --version 1 --sequence 1

# check committed chaincode
peer lifecycle chaincode querycommitted --channelID channel1 --name basic --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem


# show if some containers are running
docker ps
docker-compose -f docker/docker-compose-test-net.yaml ps

```


## Use the basic (asset-transfer-basic) CC
```bash
# call the invoke

peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C channel1 -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"InitLedger","Args":[]}'

# Read the last state of all assets
peer chaincode query -C channel1 -n basic -c '{"Args":["GetAllAssets"]}' | jq .

# Read an asset 
peer chaincode query -C channel1 -n basic -c '{"Args":["ReadAsset","asset1"]}' | jq .

# Update an asset 
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C channel1 -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"UpdateAsset","Args":["asset1","green","10","Roland","600"]}'
```

## How to use Node.js to access the leder 
Create a new project folder.

```bash 
# create a folder
mkdir myapp && cd myapp

# init a project
npm init

# install fabric dependencies
npm install fabric-ca-client fabric-network
```

We use the following three files:
- helper.js
- caActions.js
- ledgerActions.js

Firstly we have to enroll an admin user.
```bash 
node caActions.js admin
```

Secondly, we have to register and enroll an application user.
```bash 
node caActions.js user roland
```

Now you should have two new identities under the folder wallet/

Start interacting with the ledger.
```bash 
# GetAllAssets
node ledgerActions.js GetAllAssets

# Get a particular asset
node.ledgerActions.js ReadAsset asset1

# Create and update an asset
node ledgerActions.js CreateAsset

```
[Index](../README.md)
