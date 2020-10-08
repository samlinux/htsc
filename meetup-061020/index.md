# Setup
These steps describes a HLF 2.2.x installation on a DigitalOcean Droplet.

## Droplet 
Digital Ocean Droplet, 1 CPU, 2 GB, 50 GB SSD  
OS, Ubuntu 20.04 (LTS) x64

## Access via ssh
ssh root@ssh root@xx

## Perparations
The following steps are required to prepare the Droplet.
```bash
# update the OS
apt update && apt upgrade

# install some useful helpers
apt install tree jq

# it's always good the use the right time
# so setup the correct timezone
timedatectl set-timezone Europe/Vienna

# check the time
date
```

## Install Docker
The following steps are required to install docker on the Droplet. Reference: https://docs.docker.com/engine/install/ubuntu/

```bash
# set up the repository
sudo apt-get install \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg-agent \
  software-properties-common

# add Docker’s official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -


# set up the stable repository
sudo add-apt-repository \
  "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) \
  stable"

# install docker engine
apt-get update
apt-get install docker-ce docker-ce-cli containerd.io

# check the docker version
docker --version
```

## Install Docker-Compose

Reference https://docs.docker.com/compose/install/

```bash
# install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.26.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# apply executable permissions to the binary
sudo chmod +x /usr/local/bin/docker-compose

# check the docker-compose version
docker-compose --version
```

## Install Go Programming Language
Hyperledger Fabric uses the Go Programming Language for many of its components. Go version 1.14.x is required.

```bash 
# download and extract go
# latest version 04.10.20 1.14.9
sudo wget -c https://dl.google.com/go/go1.14.9.linux-amd64.tar.gz -O - | tar -xz -C /usr/local

# add the go binary to the path
vi $HOME/.profile
export PATH="$PATH:/usr/local/go/bin:/root/fabric/fabric-samples/bin"

# point the GOPATH env var to the base fabric workspace folder
export GOPATH=$HOME/fabric

# reload the profile
source $HOME/.profile

# check the go version
go version

# check the vars
printenv | grep PATH
```

## Install node.js

```bash
# add PPA from NodeSource
# curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh 
curl -sL https://deb.nodesource.com/setup_12.x -o nodesource_setup.sh

# call the install script
sudo bash nodesource_setup.sh

# install node.js
sudo apt-get install -y nodejs

# check the version
node -v
```

## Install Samples, Binaries and Docker Images

```bash
mkdir fabric
cd fabric

# install the latest production release from the 1.4.x branch
# curl -sSL http://bit.ly/2ysbOFE | bash -s -- <fabric_version> <fabric-ca_version> <thirdparty_version>

# curl -sSL http://bit.ly/2ysbOFE | bash -s -- 1.4.6 1.4.6 0.4.18
# curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.2.1 1.4.9

# latest production ready release, omit all version identifiers.
curl -sSL https://bit.ly/2ysbOFE | bash -s

# check downloaded images
docker images

# check the bin cmd
peer version

```

## Try the installation
The fabric-samples provisions a sample Hyperledger Fabric test-network consisting of two organizations, each maintaining one peer nodes. It also will deploy a single RAFT ordering service by default. 

To test your installationen we can start interacting with the network.

```bash
# switch to the base folder
cd fabric-samples/test-network

# print some help
./network.sh --help

# bring up the network
./network.sh up createChannel -c channel1

# install default CC - asset-transfer (basic) chaincode
./network.sh deployCC -c channel1

# show if some containers are running
docker ps
docker-compose -f docker/docker-compose-test-net.yaml ps
```

## Interacting with the network

tmux control
```bash
# start a new tmux session
tmux new -s fabric

# attach to existing session
tmux add -t fabric

# show all logs
docker-compose -f docker/docker-compose-test-net.yaml logs -f -t

# open a new panel
CTRL + b \" 

# jump between panels
CTRL + b + q 1

# detach from session
CTRL + b + d

```

### Environment variables for peer Org1

```bash
# create an env file
vi org1.sh

export FABRIC_CFG_PATH=$HOME/fabric/fabric-samples/config/
export CHANNEL_NAME="channel1"

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# execute the env file
source ./org1.sh

# check env vars
printenv | grep CORE
```

#### Initialize the leder (sample data)
Run the following command to initialize the ledger with assets:
```bash

# for explanation
peer chaincode invoke 
  -o localhost:7050 
  --ordererTLSHostnameOverride orderer.example.com 
  --tls 
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem 
  -C $CHANNEL_NAME 
  -n basic 
  --peerAddresses localhost:7051 
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt 
  --peerAddresses localhost:9051 
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt 
  -c '{"function":"InitLedger","Args":[]}'


# for copy and paste
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C $CHANNEL_NAME -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"InitLedger","Args":[]}'
```

#### Query the leder

```bash
# Read the last state of all assets
peer chaincode query -C $CHANNEL_NAME -n basic -c '{"Args":["GetAllAssets"]}' | jq .

# Read an asset 
peer chaincode query -C $CHANNEL_NAME -n basic -c '{"Args":["ReadAsset","asset1"]}' | jq .
```

#### Create an asset
```bash

peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C $CHANNEL_NAME -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"CreateAsset","Args":["asset7","green","10","Roland","500"]}'
```

#### Update an asset
```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C $CHANNEL_NAME -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"UpdateAsset","Args":["asset7","green","10","Roland","600"]}'
```

#### Transfer an asset
```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C $CHANNEL_NAME -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"TransferAsset","Args":["asset7","Joana"]}'
```

#### Delete an asset
```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C $CHANNEL_NAME -n basic --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"DeleteAsset","Args":["asset1"]}'
```

### Switch to peer Org2
We can switch to work with peer Org2 peer0.org2.example.com with changeing the following evironment variables. 
```bash 

# create an env file
vi org2.sh

# Environment variables for Org2
export FABRIC_CFG_PATH=$HOME/fabric/fabric-samples/config/
export CHANNEL_NAME="channel1"

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

# execute the env file
source ./org2.sh
```

## Bring down the network
```bash
./network.sh down
```