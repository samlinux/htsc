# Challenge 01
Try installing the sample chaincode cs04 within the official test network of fabric 2.2 Try to use the ./network.sh script.

**Please try it yourself first and then follow the instructions!**

```bash
# switch to the base folder
cd fabric-samples/test-network

# bring up the network
./network.sh up createChannel -c channel1 -ca

# Install the chaincode
./network.sh deployCC -c channel1 -ccn cs04 -ccl javascript -ccv 1 -ccs 1 -ccp ../../sdg-dev-network/chaincode/nodejs/cs04/ 

# set env peer0 Org1
. ./scripts/envVar.sh

# show if some containers are running
docker ps --format "{{.ID}} {{.Names}}"

988f8aea5734 dev-peer0.org2.example.com-cs04_1-8bb43bb8d3c64721968bc157979cd5ef6e0098759421c2703f935676921e815f
e87e590c76c0 dev-peer0.org1.example.com-cs04_1-8bb43bb8d3c64721968bc157979cd5ef6e0098759421c2703f935676921e815f
160f5b00bdd9 cli
96be768b2027 orderer.example.com
8946a2b5b7e5 peer0.org2.example.com
6e26aa81cf71 peer0.org1.example.com
027805fe332a ca_org2
380834ba12b9 ca_orderer
816606a4c959 ca_org1

```

Try to use the chaincode example. Register and enroll the identities.

```bash
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/

fabric-ca-client register --id.name writer --id.secret writerpw --id.type client --id.attrs 'samlinux.writer=true:ecert' --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"

fabric-ca-client register --id.name reader --id.secret readerpw --id.type client --id.attrs 'samlinux.reader=true:ecert' --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"

fabric-ca-client enroll -u https://writer:writerpw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/users/writer@org1.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"

fabric-ca-client enroll -u https://reader:readerpw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/users/reader@org1.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"

cp "${PWD}/organizations/peerOrganizations/org1.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org1.example.com/users/writer@org1.example.com/msp/config.yaml"

cp "${PWD}/organizations/peerOrganizations/org1.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org1.example.com/users/reader@org1.example.com/msp/config.yaml"

tree -L 1 organizations/peerOrganizations/org1.example.com/users/
```

Try and play with the chaincode.
```bash

# use Org1 env vars
setGlobals 1

# export path to fabric config
export FABRIC_CFG_PATH=../config/

# set the CORE_PEER_MSPCONFIGPATH variable to the users MSP 
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/writer@org1.example.com/msp
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp
 
# invoke 
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C channel1 -n cs04 --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"Args":["set","{\"no\":\"a1\", \"desc\":\"Product number 1\",\"amount\":120, \"price\":\"10.50\", \"type\":\"brick\"}"]}' 

# query 
peer chaincode query -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C channel1 -n cs04 --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt -C channel1 -n cs04 -c '{"Args":["get","a1"]}'
```
