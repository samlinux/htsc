/**
 * helper functions
 */

const path = require('path')
const fs = require('fs')

/**
 * loads the existing CCP for Org1
 */
exports.buildCCPOrg1 = function() {
	// load the common connection configuration file
	const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
	const fileExists = fs.existsSync(ccpPath);
	if (!fileExists) {
		throw new Error(`no such file or directory: ${ccpPath}`);
	}
	const contents = fs.readFileSync(ccpPath, 'utf8');

	// build a JSON object from the file contents
	const ccp = JSON.parse(contents);

	console.log(`Loaded the network configuration located at ${ccpPath}`);
	return ccp;
};

/**
 * Create a new  wallet : Note that wallet is for managing identities.
 * @param {*} Wallets 
 * @param {*} walletPath 
 */
exports.buildWallet = async function (Wallets, walletPath) {
	let wallet;
	if (walletPath) {
		wallet = await Wallets.newFileSystemWallet(walletPath);
		console.log(`Built a file system wallet at ${walletPath}`);
	} else {
		wallet = await Wallets.newInMemoryWallet();
		console.log('Built an in memory wallet');
	}

	return wallet;
};

/**
 * create a json string
 * @param {*} inputString 
 */
exports.prettyJSONString = function(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}