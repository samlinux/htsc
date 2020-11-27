## Peer channel

```bash 
# get new newset block on this leader
peer channel fetch newest newest_mychannel.block -c mychannel -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# result could be something like
# 2020-11-13 08:50:17.344 CET [channelCmd] InitCmdFactory -> INFO 001 Endorser and orderer connections initialized
# 2020-11-13 08:50:17.346 CET [cli.common] readBlock -> INFO 002 Received block: 9

# block number 9 is the latest block in the chain

configtxlator proto_decode --type=common.Block --input=newest_mychannel.block | jq . 
```