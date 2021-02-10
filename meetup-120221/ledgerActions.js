/**
 * Ledger - Actions
 */

// node.js includes
const helper = require('./helper')
const path = require('path')

// fabric includes
const { Gateway, Wallets } = require('fabric-network');
const walletPath = path.join(__dirname, 'wallet');

// some vars
const org1UserId = 'sabine';
const channelName = 'channel1';
const chaincodeName = 'basic';

async function main () {
  try {
    // build CCP
    const ccp = helper.buildCCPOrg1();
    
    // setup the wallet to hold the credentials of the application user
    const wallet = await helper.buildWallet(Wallets, walletPath);

    // Create a new gateway instance for interacting with the fabric network.
    // In a real application this would be done as the backend server session is setup for
    // a user that has been verified.
    const gateway = new Gateway();
      
    // setup the gateway instance
    // The user will now be able to create connections to the fabric network and be able to
    // submit transactions and query. All transactions submitted by this gateway will be
    // signed by this user using the credentials stored in the wallet.
    await gateway.connect(ccp, {
      wallet,
      identity: org1UserId,
      discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
    });

    // Build a network instance based on the channel where the smart contract is deployed
    const network = await gateway.getNetwork(channelName);

    // Get the contract from the network.
    const contract = network.getContract(chaincodeName);

    let args = process.argv  
    if(args[2] === 'GetAllAssets'){
      let result = await contract.evaluateTransaction('GetAllAssets');
      console.log(`${helper.prettyJSONString(result.toString())}`);
    } 
    else if(args[2] === 'ReadAsset'){
      let asset = args[3]
      result = await contract.evaluateTransaction('ReadAsset', asset);
      console.log(`${helper.prettyJSONString(result.toString())}`);
    }
    else if(args[2] === 'CreateAsset'){
      let r = await contract.submitTransaction('CreateAsset', 'asset14', 'yellow', '5', 'Snorre3', '1300');
      console.log('*** Result: committed', r.toString());
    }
    else {
      console.log('...')
    }
    // disconnect form the network
    gateway.disconnect();
  }
  catch(e){
    throw new Error(e)
  }   
}

main()
