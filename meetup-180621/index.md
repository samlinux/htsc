# Attribute-based access controll (ABAC)

In this lab we are going to implement the following scenario. One organization with two different roles: 

- one for creating and updating assets and
- one only for reading those assets.

To do so we need at least **three terminals**. I use three different tmux panes in that lab.

Start a tmux session.
```bash
tmux new -s fabric
```

First let's start the development test network. Refer to previous labs for more information on getting started with a fabric development network and with tmux panels.

```bash
./devNetwork.sh up -ca
```

Now create two more panes. One for starting the chaincode and one for interacting with your chaincode.

## Register identities with attributes

We will create the identities using the predefined Org1 CA. First we have to set the **FABRIC_CA_CLIENT_HOME** environment variable to the MSP of the Org1 CA admin:

```bash
# set the path
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/

# check the path
echo $FABRIC_CA_CLIENT_HOME
```

As a second step we can register and enroll two users: writer and reader under the prefix samlinux. Both new users are defined with an proper attribute **--id.attrs 'samlinux.writer=true:ecert'**.

```bash
# register first
## client samlinux.writer
fabric-ca-client register --id.name writer --id.secret writerpw --id.type client --id.attrs 'samlinux.writer=true:ecert' --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"

## client samlinux.reader
fabric-ca-client register --id.name reader --id.secret readerpw --id.type client --id.attrs 'samlinux.reader=true:ecert' --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"
```

```bash
# enroll second
fabric-ca-client enroll -u https://writer:writerpw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/users/writer@org1.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"

fabric-ca-client enroll -u https://reader:readerpw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/users/reader@org1.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"
```

Now that we have enrolled the identity, run the command below to copy the Node OU configuration file into the creator1 MSP folder.

```bash
cp "${PWD}/organizations/peerOrganizations/org1.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org1.example.com/users/writer@org1.example.com/msp/config.yaml"

cp "${PWD}/organizations/peerOrganizations/org1.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org1.example.com/users/reader@org1.example.com/msp/config.yaml"
```

Check your result.
```bash
# inspect the user folder from org1
tree -L 1 organizations/peerOrganizations/org1.example.com/users/

# you should see the following result
organizations/peerOrganizations/org1.example.com/users/
├── Admin@org1.example.com
├── User1@org1.example.com
├── reader@org1.example.com
└── writer@org1.example.com
```

**One note to the :ecert suffix.**

The ”:ecert” suffix means that by default the attribute and it's value will be inserted into the identity’s enrollment certificate, which can then be used to make access control decisions.

You can leave this suffix as well. But in this case you have to use the **--enrollment.attrs** option to include some attributes into the enrolled certificate. 

Let's do some experiments to get more familiar with that approach.
```bash
# register a manager
fabric-ca-client register --id.name manager --id.secret writerpw --id.type client --id.attrs 'samlinux.manager=true' --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"

# enroll the manager
fabric-ca-client enroll -u https://manager:writerpw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/users/manager@org1.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem" --enrollment.attrs 'samlinux.manager,hf.Type,hf.EnrollmentID'

# check the certificate
openssl x509 -in organizations/peerOrganizations/org1.example.com/users/manager@org1.example.com/msp/signcerts/cert.pem -text -noout
```
What is your observation?

## Inspect signing certs

Get a list of all identities.
```bash
fabric-ca-client identity list --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"
```

List one particular identity.
```bash
fabric-ca-client identity list --id reader --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"
```

Inspect the signcert form reader.
```bash
openssl x509 -in  organizations/peerOrganizations/org1.example.com/users/reader@org1.example.com/msp/signcerts/cert.pem -text -noout
```

Take some time to inspect the content of one of those created signing certs.

```bash
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            3a:a2:f8:fd:7f:a8:c7:0e:7d:8e:7c:e5:6d:fd:5f:21:92:16:b1:77
        Signature Algorithm: ecdsa-with-SHA256
        Issuer: C = US, ST = North Carolina, O = Hyperledger, OU = Fabric, CN = fabric-ca-server
        Validity
            Not Before: Jun  4 05:46:00 2021 GMT
            Not After : Jun  4 05:51:00 2022 GMT
        Subject: C = US, ST = North Carolina, O = Hyperledger, OU = client + OU = org1, CN = reader
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (256 bit)
                pub:
                    04:71:4e:c3:f7:82:c0:d0:91:8b:4a:d6:d8:75:49:
                    c3:15:49:63:de:9e:d3:0d:35:a1:65:28:f5:6d:95:
                    8b:80:8d:59:34:2e:98:67:8c:6a:03:88:ac:be:45:
                    02:c7:b7:aa:a6:92:f7:2b:d4:d6:78:b8:56:c4:9c:
                    a1:fc:9f:1b:42
                ASN1 OID: prime256v1
                NIST CURVE: P-256
        X509v3 extensions:
            X509v3 Key Usage: critical
                Digital Signature
            X509v3 Basic Constraints: critical
                CA:FALSE
            X509v3 Subject Key Identifier:
                91:06:0C:49:07:D8:E5:25:FE:4D:88:7B:0B:84:C3:7F:48:60:15:A7
            X509v3 Authority Key Identifier:
                keyid:FB:03:89:63:09:98:A6:91:D7:72:2A:6D:D4:8C:AA:98:23:3F:1B:15

            X509v3 Subject Alternative Name:
                DNS:fabric04
            1.2.3.4.5.6.7.8.1:
                {"attrs":{"hf.Affiliation":"org1","hf.EnrollmentID":"reader","hf.Type":"client","samlinux.writer":"true"}}
    Signature Algorithm: ecdsa-with-SHA256
         30:44:02:20:6d:1f:83:68:ee:ae:be:00:c0:04:71:4a:21:c8:
         9f:12:2f:38:bc:b2:40:c9:37:3d:13:46:2b:9a:d7:f6:a2:9b:
         02:20:25:bd:da:62:9d:30:4e:cf:53:f8:55:36:e7:85:46:a1:
         3d:ba:2e:5b:2e:8e:44:68:02:e4:68:df:a6:ad:dc:51
```

## Start the chaincode

In the second panel start the chaincode.
```bash
cd chaincode/nodejs/cs04

CORE_CHAINCODE_LOGLEVEL=debug CORE_PEER_TLS_ENABLED=false CORE_CHAINCODE_ID_NAME=mycc:1.0 ./node_modules/.bin/fabric-chaincode-node start --peer.address 127.0.0.1:7052
```

## Testcalls for the chaincode
In the third panel interact with the chaincode, but first we have to set some envirpnment variables.

```bash
# set environment vars
source org1.sh
setGlobals
```

### Test it the chaincode

Use the **writer** identity first.

```bash
# set the CORE_PEER_MSPCONFIGPATH variable to the users MSP 
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/writer@org1.example.com/msp

CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["set","{\"no\":\"a1\", \"desc\":\"Product number 1\",\"amount\":120, \"price\":\"10.50\", \"type\":\"brick\"}"]}'
```

Use the **reader** identity for the same test.
```bash
# set the CORE_PEER_MSPCONFIGPATH variable to the users MSP 
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/reader@org1.example.com/msp

CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode invoke -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["set","{\"no\":\"a1\", \"desc\":\"Product number 1\",\"amount\":1000, \"price\":\"10.50\", \"type\":\"brick\"}"]}'
```

The **reader** should be allowed only reading not invoking.
```bash
CORE_PEER_ADDRESS=127.0.0.1:7051 peer chaincode query -o 127.0.0.1:7050 -C ch1 -n mycc -c '{"Args":["get","a1"]}'
```

Test with a user without any proper permissions **(User1)**. What is the result?
```bash
# set the CORE_PEER_MSPCONFIGPATH variable to the users MSP 
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp
```

## Modify identities and remove the samlinux.reader attribute

```bash
# remove samlinux.reader attribute
fabric-ca-client identity modify reader --attrs 'samlinux.reader='  --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"

# add the same attribute
fabric-ca-client identity modify reader --attrs '"samlinux.reader=true:ecert","samlinux.auditor=true:ecert"' --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"

# reenroll or enroll it again
fabric-ca-client reenroll -u https://reader:reader1pw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/users/reader@org1.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/tls-cert.pem"

# inspect the signing cert
openssl x509 -in  organizations/peerOrganizations/org1.example.com/users/reader@org1.example.com/msp/signcerts/cert.pem -text -noout
```

