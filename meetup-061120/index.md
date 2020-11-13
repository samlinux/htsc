# Support Material - external vs internal chaincode (CC)

## External CC
### Package the external CC
```bash 
cd fabric/fabric-samples/asset-transfer-basic/chaincode-external/

# Inspect the connection.json file
# Inspect the chaincode.env file
# Inspect the metadata.json file

tar cfz code.tar.gz connection.json
tar cfz asset-transfer-basic-external.tgz metadata.json code.tar.gz

# for later useage
cp chaincode.env ../../test-network/
```

### Start the network

Modify the config.core.yaml file (config/core.yaml).

#### Edit config/core.yaml
```bash 
externalBuilders:
    - path: /opt/gopath/src/github.com/hyperledger/fabric-samples/asset-transfer-basic/chaincode-external/sampleBuilder
      name: external-sample-builder
```

Modify the docker-compose.yaml file (docker/docker-compose-test-net.yaml).

#### Edit docker-compose-test-net.yaml

Add these two volumns by both peers
```bash 
- ../..:/opt/gopath/src/github.com/hyperledger/fabric-samples
- ../../config/core.yaml:/etc/hyperledger/fabric/core.yaml
```


```bash
# switch to the target folder
cd ../../test-network

# start the network
./network.sh up createChannel -c mychannel

# load some helper scripts from the samples
. scripts/envVar.sh

export FABRIC_CFG_PATH=$PWD/../config/
```

### Install external CC
```bash
# install one peer0 Org1
setGlobals 1
peer lifecycle chaincode install ../asset-transfer-basic/chaincode-external/asset-transfer-basic-external.tgz

# install one peer0 Org2
setGlobals 2
peer lifecycle chaincode install ../asset-transfer-basic/chaincode-external/asset-transfer-basic-external.tgz

# check installed chaincode and get PKID
setGlobals 1
peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051 --tlsRootCertFiles organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

export PKGID=basic:79c332c70a6a7381ae06eb892daf115afaedf7dca1515270f932072f06681a39

# edit chaincode.env and change CHAINCODE_ID value to PKID
vi chaincode.env
```

### Build a new CC container

```bash
cd ../asset-transfer-basic/chaincode-external
docker build -t hyperledger/asset-transfer-basic .
```

### Start the external CC container
```bash 
docker run -d -it --rm --name asset-transfer-basic.org1.example.com --hostname asset-transfer-basic.org1.example.com --env-file chaincode.env --network=net_test hyperledger/asset-transfer-basic
cd ../../test-network/
```

### Approve the CC
```bash
# approve for Org2
setGlobals 2
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name basic --version 1.0 --package-id $PKGID --sequence 1

# approve for Org1
setGlobals 1
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name basic --version 1.0 --package-id $PKGID --sequence 1
```

### Commit the external CC
```bash

# check 
peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name basic --version 1.0 --sequence 1 --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --output json

#commit
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name basic --peerAddresses localhost:7051 --tlsRootCertFiles $PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --version 1.0 --sequence 1
```

### Use the external CC
It is time to look into the chaincode.


```bash
# call the InitLedger function
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"InitLedger","Args":[]}'

# query an asset
peer chaincode query -C mychannel -n basic -c '{"function":"ReadAsset","Args":["asset1"]}'

# transfer an asset
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"TransferAsset","Args":["asset1","roland"]}'

# call the query again
peer chaincode query -C mychannel -n basic -c '{"function":"ReadAsset","Args":["asset1"]}'
```

## Internal CC

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
#Package ID: basic:524d01db7699b85fa9ba802d8811d39f6b30c93c42afd788464f716ef99aa610, Label: basic
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

## Demonstration Google Cloud buildpacks
### Install Pack

See https://buildpacks.io/docs/ 

```bash
# install pack

(curl -sSL "https://github.com/buildpacks/pack/releases/download/v0.14.2/pack-v0.14.2-linux.tgz" | sudo tar -C /usr/local/bin/ --no-same-owner -xzv pack)

# modify .bashrc and reload it
. $(pack completion)

# install go packages
go get -u github.com/buildpacks/pack  
```

### Demo buildpacks
read more https://github.com/GoogleCloudPlatform/buildpacks

```bash
# get some samples
cd
mkdir cloudbuilds 
cd cloudbuilds

git clone https://github.com/GoogleCloudPlatform/buildpack-samples.git
pack suggest-builders

# ------------------------
# node.js example
# ------------------------
cd buildpack-samples/sample-node
pack build --builder=gcr.io/buildpacks/builder sample-node
docker run -d -it -ePORT=8080 -p8080:8080 --name sample-node sample-node
curl localhost:8080

# check running containers
docker ps --format '{{ .ID }}\t{{.Status}}\t{{ .Names }}'

## rebase an image
pack rebase sample-node

# ------------------------
# Option A, golang example
# ------------------------
cd buildpack-samples/sample-go

pack build --builder heroku/buildpacks:18 hello-roland
pack build --builder gcr.io/buildpacks/builder:v1 hello-roland

docker run --rm -p 4000:8080 hello-roland
curl localhost 4000

```
