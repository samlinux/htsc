# Reproduce the asset-transfer-basic/chaincode-external example

fabric version 2.2.1

```bash
apt install tree jq make g++
```

## Edit config/core.yaml
```bash 
externalBuilders: []
    - path: /opt/gopath/src/github.com/hyperledger/fabric-samples/asset-transfer-basic/chaincode-external/sampleBuilder
      name: external-sample-builder
```

## Edit docker-compose-test-net.yaml

Add these two volumns by both peers
```bash 
- ../..:/opt/gopath/src/github.com/hyperledger/fabric-samples
- ../../config/core.yaml:/etc/hyperledger/fabric/core.yaml
```

## Package the chaoncode

```bash 
cd ./fabric/fabric-samples/asset-transfer-basic/chaincode-external

tar cfz code.tar.gz connection.json
tar cfz asset-transfer-basic-external.tgz metadata.json code.tar.gz
```

## Start the test-network
```bash
./network.sh up createChannel -c mychannel -ca

```

## Installing the external chaincode
```bash 
export FABRIC_CFG_PATH=$HOME/fabric/fabric-samples/config/

. ./scripts/envVar.sh

# Install the asset-transfer-basic-external.tar.gz chaincode on org1:
setGlobals 1
peer lifecycle chaincode install ../asset-transfer-basic/chaincode-external/asset-transfer-basic-external.tgz


# Install the asset-transfer-basic-external.tar.gz chaincode on org2:
setGlobals 2
peer lifecycle chaincode install ../asset-transfer-basic/chaincode-external/asset-transfer-basic-external.tgz

export PKGID=basic_1.0:2555c3cc621aedc7cfe296ca50a934e1386cf853fb572f69ea115e3eb3a57edb

```

## Edit the chaincode.env file 
```bash
vi ../asset-transfer-basic/chaincode-external/chaincode.env
# edit chaoncode_id
CHAINCODE_ID=basic_1.0:2555c3cc621aedc7cfe296ca50a934e1386cf853fb572f69ea115e3eb3a57edb
```
## Running the Asset-Transfer-Basic external service
```bash
cd ../asset-transfer-basic/chaincode-external/
docker build -t hyperledger/asset-transfer-basic .

```

## Start the Asset-Transfer-Basic service:
```bash
docker run -it --rm --name asset-transfer-basic.org1.example.com --hostname asset-transfer-basic.org1.example.com --env-file chaincode.env --network=net_test hyperledger/asset-transfer-basic
```

## Finish deploying the Asset-Transfer-Basic external chaincode
```bash 
setGlobals 2
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name basic --version 1.0 --package-id $PKGID --sequence 1

setGlobals 1
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name basic --version 1.0 --package-id $PKGID --sequence 1

peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name basic --peerAddresses localhost:7051 --tlsRootCertFiles $PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --version 1.0 --sequence 1

```

## Using the Asset-Transfer-Basic external chaincode
```bash
cd ../../fabric-samples/asset-transfer-basic/application-javascript

rm -rf wallet # in case you ran this before
npm install
node app.js

```

## Use the CLI
```bash
setGlobals 1
peer chaincode query -C mychannel -n basic -c '{"function":"ReadAsset","Args":["asset1"]}'

peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"CreateAsset","Args":["roland1", "yellow", "5", "Tom", "1300"]}'

peer chaincode query -C mychannel -n basic -c '{"function":"ReadAsset","Args":["roland1"]}'
```
