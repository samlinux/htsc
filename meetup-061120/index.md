# Support Material - external vs internal chaincode (CC)

## External CC
### Package the external CC
```bash 
cd fabric/fabric-samples/asset-transfer-basic/chaincode-external/

# Inspect the connection.json file
# Inspect the chaincode.env file

tar cfz code.tar.gz connection.json
tar cfz asset-transfer-basic-external.tgz metadata.json code.tar.gz

# for later useage
cp chaincode.env ../../test-network/
```

### Start the network
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

export PKGID=basic:524d01db7699b85fa9ba802d8811d39f6b30c93c42afd788464f716ef99aa610

# edit chaincode.env and change CHAINCODE_ID value to PKID
vi chaincode.env
```

### Start the external CC container
```bash 
docker run -d -it --rm --name asset-transfer-basic.org1.example.com --hostname asset-transfer-basic.org1.example.com --env-file chaincode.env --network=net_test hyperledger/asset-transfer-basic
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
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name basic --peerAddresses localhost:7051 --tlsRootCertFiles $PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --version 1.0 --sequence 1
```

### Use the external CC

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

