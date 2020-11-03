# How to use the external chaincode launcher - CC as a Service

## Install Pack

```bash
# install pack

(curl -sSL "https://github.com/buildpacks/pack/releases/download/v0.14.2/pack-v0.14.2-linux.tgz" | sudo tar -C /usr/local/bin/ --no-same-owner -xzv pack)

# modify .bashrc and reload it
. $(pack completion)

# install go packages
go get -u github.com/buildpacks/pack  
```

## First try - buildpacks
read more https://github.com/GoogleCloudPlatform/buildpacks

```bash
git clone https://github.com/GoogleCloudPlatform/buildpack-samples.git
cd buildpack-samples/sample-go
pack suggest-builders

pack build --builder heroku/buildpacks:18 hello-roland
pack build --builder gcr.io/buildpacks/builder:v1 hello-roland

docker run --rm -p 4000:8080 hello-roland
curl localhost 4000

# node.js example
cd buildpack-samples/sample-node
pack build --builder gcr.io/buildpacks/builder:v1 web:1
docker run --rm -p 3000:3000 web

```

# External chancode lancher with TLS

Edit config/core.yaml file

```bash 
vi config.core.yaml

externalBuilders: 
  - path: /opt/gopath/src/github.com/hyperledger/fabric-samples/asset-transfer-basic/chaincode-external/sampleBuilder
    name: external-sample-builder
    propagateEnvironment:
    - CORE_PEER_TLS_ROOTCERT_FILE
    - CORE_PEER_TLS_CERT_FILE
    - CORE_PEER_TLS_KEY_FILE
```

Prepare a organization switch file for both organizations.
```bash 
#  create a new env file and fill in the following env vars
vi org1.env

export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# execute the env file
source org1.env
```

```bash 
#  create a new env file and fill in the following env vars
vi org2.env

export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

# execute the env file
source org2.env
```

```bash
# start the network and compose the crypto artefacts
./network.sh up createChannel -c channel1

#./monitordocker.sh net_test
# start logging
docker-compose -f docker/docker-compose-test-net.yaml logs -f -t

# switch to target chaincode folder
cd fabric-samples/asset-transfer-basic/chaincode-external

# adjust connection.json und add the following
{
  "address": "asset-transfer-basic.org1.example.com:9999",
  "dial_timeout": "10s",
  "tls_required": true,
  "client_auth_required": true,
  "client_key": "CORE_PEER_TLS_KEY_FILE",
  "client_cert": "CORE_PEER_TLS_CERT_FILE",
  "root_cert": "CORE_PEER_TLS_ROOTCERT_FILE"
}

tar cfz code.tar.gz connection.json && tar cfz asset-transfer-basic-external_org1.tgz metadata.json code.tar.gz

# change the address in connection.json from "address": "asset-transfer-basic.org1.example.com:9999", 
# to "address": "asset-transfer-basic.org2.example.com:9998",

tar cfz code.tar.gz connection.json && tar cfz asset-transfer-basic-external_org2.tgz metadata.json code.tar.gz

# edit to the sampleBuilder/bin/release file and add the following
# on top a function
function one_line_pem {
   echo "`awk 'NF {sub(/\\n/, ""); printf "%s\\\\\\\n",$0;}' $1`"
}

# and this to replace pem content
#if tls_required is true, copy TLS files (using above example, the fully qualified path for these fils would be "$RELEASE"/chaincode/server/tls)
   
CORE_PEER_TLS_KEY_FILE=$(one_line_pem $CORE_PEER_TLS_KEY_FILE)
CORE_PEER_TLS_CERT_FILE=$(one_line_pem $CORE_PEER_TLS_CERT_FILE)
CORE_PEER_TLS_ROOTCERT_FILE=$(one_line_pem $CORE_PEER_TLS_ROOTCERT_FILE)

sed -i "s|CORE_PEER_TLS_KEY_FILE|$CORE_PEER_TLS_KEY_FILE|g" "$RELEASE"/chaincode/server/connection.json
sed -i "s|CORE_PEER_TLS_CERT_FILE|$CORE_PEER_TLS_CERT_FILE|g" "$RELEASE"/chaincode/server/connection.json
sed -i "s|CORE_PEER_TLS_ROOTCERT_FILE|$CORE_PEER_TLS_ROOTCERT_FILE|g" "$RELEASE"/chaincode/server/connection.json
#--------------------------------------------


# install chaincode on peer0 in org1
source org1.env
peer lifecycle chaincode install ../asset-transfer-basic/chaincode-external/asset-transfer-basic-external_org1.tgz

# install chaincode on peer0 in org2
source org2.env
peer lifecycle chaincode install ../asset-transfer-basic/chaincode-external/asset-transfer-basic-external_org2.tgz
```

## Running the asset-transfer-basic external service

```bash
# switch to target folder
cd fabric-samples/asset-transfer-basic/chaincode-external

# build the chaoncode container
docker build -t hyperledger/asset-transfer-basic .

# start external service
# docker run -it --rm --name asset-transfer-basic.org1.example.com --hostname asset-transfer-basic.org1.example.com --env-file chaincode.env --network=net_test hyperledger/asset-transfer-basic

vi chaincode_org1.env
# add the following

  # CHAINCODE_SERVER_ADDRESS must be set to the host and port where the peer can
  # connect to the chaincode server
  CHAINCODE_SERVER_ADDRESS=asset-transfer-basic.org1.example.com:9999

  # CHAINCODE_ID must be set to the Package ID that is assigned to the chaincode
  # on install. The `peer lifecycle chaincode queryinstalled` command can be
  # used to get the ID after install if required
  CHAINCODE_ID=basic:b6ea7a5a8ff256d4bc55e743c3861b9c8e2f8bc36643603b37ac23ab5cbc5efe

  CORE_PEER_TLS_KEY_FILE=/tls/server.key
  CORE_PEER_TLS_CERT_FILE=/tls/server.crt
  CORE_PEER_TLS_ROOTCERT_FILE=/tls/ca.crt
# ---------------------------

vi chaincode_org2.env
# add the following

  # CHAINCODE_SERVER_ADDRESS must be set to the host and port where the peer can
  # connect to the chaincode server
  CHAINCODE_SERVER_ADDRESS=asset-transfer-basic.org2.example.com:9998

  # CHAINCODE_ID must be set to the Package ID that is assigned to the chaincode
  # on install. The `peer lifecycle chaincode queryinstalled` command can be
  # used to get the ID after install if required
  CHAINCODE_ID=basic:693b69a4b1d666a03efc3755c14aa91fff440f73445c143ca63c5214ebc89b20

  CORE_PEER_TLS_KEY_FILE=/tls/server.key
  CORE_PEER_TLS_CERT_FILE=/tls/server.crt
  CORE_PEER_TLS_ROOTCERT_FILE=/tls/ca.crt
# ---------------------------

# start external service org1
docker run -it --rm --name asset-transfer-basic.org1.example.com --hostname asset-transfer-basic.org1.example.com --env-file chaincode_org1.env --network=net_test -v /root/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/:/tls -p 9999:9999 hyperledger/asset-transfer-basic

# start external service org2
docker run -it --rm --name asset-transfer-basic.org2.example.com --hostname asset-transfer-basic.org2.example.com --env-file chaincode_org2.env --network=net_test -v /root/fabric/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/:/tls -p 9998:9999 hyperledger/asset-transfer-basic

```

## Finish deploying the asset-transfer-basic external chaincode

### Approve org1
```bash
source org1.env
peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051 --tlsRootCertFiles organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

export CCID=basic:b6ea7a5a8ff256d4bc55e743c3861b9c8e2f8bc36643603b37ac23ab5cbc5efe

source org1.env
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --version 1 --package-id $CCID --sequence 1
```

### Approve org2
```bash
source org2.env
peer lifecycle chaincode queryinstalled --peerAddresses localhost:9051 --tlsRootCertFiles organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

export CCID=basic:693b69a4b1d666a03efc3755c14aa91fff440f73445c143ca63c5214ebc89b20

peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --version 1 --package-id $CCID --sequence 1

```

### Check the approve progress
```bash
# command to copy
peer lifecycle chaincode checkcommitreadiness --channelID channel1 --name basic --version 1 --sequence 1 --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --output json
```


### Commit the chaincode
```bash
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --peerAddresses localhost:7051 --tlsRootCertFiles $PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --version 1 --sequence 1
```

## Using the asset-transfer-basic external chaincode

```bash
# Init the chaincode
source org1.env

peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"InitLedger","Args":[]}'


peer chaincode query -C mychannel -n basic -c '{"function":"ReadAsset","Args":["asset1"]}'
```

### Some helper
```bash
awk 'NF {sub(/\r/, ""); printf "%s",$0;}' organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/server.key

# inspect the peer for the connection.json
docker exec -it  peer0.org1.example.com sh
cd /var/hyperledger/production/externalbuilder/builds/
``` 
