# DRAFT
## Fabric-Ca

- create docker-compose file with CAs for every organization
- start CAs
- steps for each organization
  - create an CA admin only with enrollment, because admin is already registered
  - registration 
    - peers 
    - users (admin, user)
  - enrollment
    - peers
    - users
  - copy crypto material to the right place



## Start the network
```bash
  ./network.sh up createChannel -ca
  ./network.sh deployCC 
```


## Work with the Fabric-CA

```bash
# set an environment variable
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/

# list identities
fabric-ca-client identity list --tls.certfiles ${PWD}/organizations/fabric-ca/org1/tls-cert.pem

fabric-ca-client identity list --tls.certfiles ${PWD}/organizations/fabric-ca/org1/tls-cert.pem --id user1

# register new user
fabric-ca-client register --caname ca-org1 --id.name user5 --id.secret user2pw --id.type client --tls.certfiles ${PWD}/organizations/fabric-ca/org1/tls-cert.pem

# Generate the user msp
tree organizations/peerOrganizations/org1.example.com/users/

mkdir -p organizations/peerOrganizations/org1.example.com/users/User2@org1.example.com

fabric-ca-client enroll -u https://user5:user2pw@localhost:7054 --caname ca-org1 -M ${PWD}/organizations/peerOrganizations/org1.example.com/users/User5@org1.example.com/msp --tls.certfiles ${PWD}/organizations/fabric-ca/org1/tls-cert.pem

cp ${PWD}/organizations/peerOrganizations/org1.example.com/msp/config.yaml ${PWD}/organizations/peerOrganizations/org1.example.com/users/User2@org1.example.com/msp/config.yaml

# check the result
tree organizations/peerOrganizations/org1.example.com/users/

# inspect the cert
openssl x509 -in msp/signcerts/cert.pem -text
```

## Do a transaction with user2
```bash
. ./scripts/envVars.sh
setGlobals 1

export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp
export CHANNEL_NAME="mychannel"

# Read the last state of all assets
peer chaincode query -C $CHANNEL_NAME -n basic -c '{"Args":["GetAllAssets"]}' | jq .

# Read an asset 
peer chaincode query -C $CHANNEL_NAME -n basic -c '{"Args":["ReadAsset","asset1"]}' | jq .

# Update an asset 
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C $CHANNEL_NAME -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"UpdateAsset","Args":["asset1","green","10","Roland4","600"]}'
```


### Inspect the transaction
```bash
peer channel fetch newest info.block -c mychannel -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

configtxlator proto_decode --type=common.Block --input=info.block | jq .

copy "signature_header.creator.id_bytes" to info

base64 -d info

base64 -d info | openssl x509 -text

echo VXBkYXRlQXNzZXQ= | base64 -d; echo

```


## Remove a user

–cfg.identities.allowremove


fabric-ca-client revoke -e User --gencrl --tls.certfiles ${PWD}/organizations/fabric-ca/org1/tls-cert.pem



## Channel config update

```bash

# get the config of the channel
peer channel fetch config config_block.pb -c mychannel -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# concert the config to json
configtxlator proto_decode --input config_block.pb --type common.Block --output config_block.json

# get the relevant part of the config
jq .data.data[0].payload.data.config config_block.json > config.json

# copy the config
cp config.json modified_config.json

## Step 2: Modify the config

## Step 3: Re-encode and submit the config

# convert config.json back to proto buffer
configtxlator proto_encode --input config.json --type common.Config --output config.pb

# convert modified_config.json back to proto buffer
configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb

# compute the difference between the two files,
configtxlator compute_update --channel_id mychannel --original config.pb --updated modified_config.pb --output config_update.pb

# apply the changes to the config

configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate --output config_update.json

echo '{"payload":{"header":{"channel_header":{"channel_id":"mychannel", "type":2}},"data":{"config_update":'$(cat config_update.json)'}}}' | jq . > config_update_in_envelope.json

configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output config_update_in_envelope.pb


# Submit the config update transaction
peer channel update -f config_update_in_envelope.pb -c mychannel -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

```

# Check the content of the CRL
```bash 
# extract the serial number for the RCL
openssl x509 -in cert.pem -serial -noout | cut -d "=" -f 2

# create CRL pem file
fabric-ca-client gencrl -M ./msp  --tls.certfiles ${PWD}/../organizations/fabric-ca/org1/tls-cert.pem

# inspect CRL file
openssl crl -text -in /root/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/msp/crls/crl.pem
``` 

AKI (Authority Key Identifier) 

aki=$(openssl x509 -in cert.pem -text | awk '/keyid/ {gsub(/ *keyid:|:/,"",$1);print tolower($0)}')
