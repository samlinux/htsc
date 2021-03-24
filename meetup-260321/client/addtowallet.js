'use strict';

// global nodejs modules
const fs = require('fs');
const path = require('path');

// fabric requirements
const { Wallets } = require('fabric-network');

// path correcture
const fixtures = path.resolve(__dirname, '../');

// Identity to credentials to be stored in the wallet
const credPath = path.join(fixtures, '/fabric/sampleconfig');
const certificate = fs.readFileSync(path.join(credPath, '/msp/admincerts/admincert.pem')).toString();
const privateKey = fs.readFileSync(path.join(credPath, '/msp/keystore/key.pem')).toString();

// set the identity lablel
const identityLabel = 'admin';

// main function to add an existing identity
async function init() {

  try {

    // A wallet stores a collection of identities
    const wallet = await Wallets.newFileSystemWallet('./wallet');

    // set the identity credentials
    const identity = {
        credentials: {
            certificate,
            privateKey
        },
        mspId: 'SampleOrg',
        type: 'X.509'
    }

    // Load credentials into wallet
    await wallet.put(identityLabel, identity);

  } catch (error) {
    console.log(`Error adding to wallet. ${error}`);
    console.log(error.stack);
  }
}

// start the import
init().then(() => {
    console.log(`Identity ${identityLabel} successfully added to the wallet.`);
}).catch((e) => {
    console.log(e);
    console.log(e.stack);
    process.exit(-1);
});