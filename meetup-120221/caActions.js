/**
 * Certificate Authority - Actions
 */

// node.js includes
const path = require('path')

// own helper functions
const helper = require('./helper')

// fabric includes
const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');

// CA admin credentions based on test-network
const adminUserId = 'admin';
const adminUserPasswd = 'adminpw';

// wallet path
const walletPath = path.join(__dirname, 'wallet');

/**
 * Create a new CA client for interacting with the CA
 * @param {*} FabricCAServices 
 * @param {*} ccp 
 * @param {*} caHostName 
 */
function buildCAClient (FabricCAServices, ccp, caHostName) {
	//lookup CA details from config
	const caInfo = ccp.certificateAuthorities[caHostName]; 
	const caTLSCACerts = caInfo.tlsCACerts.pem;
	const caClient = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

	console.log(`Built a CA Client named ${caInfo.caName}`);
	return caClient;
};

/**
 * Enroll an Admin user
 * @param {*} caClient 
 * @param {*} wallet 
 * @param {*} orgMspId 
 */
async function enrollAdmin (caClient, wallet, orgMspId){
	try {
		// Check to see if we've already enrolled the admin user.
		const identity = await wallet.get(adminUserId);
		if (identity) {
			console.log('An identity for the admin user already exists in the wallet');
			return;
		}

		// Enroll the admin user, and import the new identity into the wallet.
		const enrollment = await caClient.enroll({ enrollmentID: adminUserId, enrollmentSecret: adminUserPasswd });
		const x509Identity = {
			credentials: {
				certificate: enrollment.certificate,
				privateKey: enrollment.key.toBytes(),
			},
			mspId: orgMspId,
			type: 'X.509',
		};
		await wallet.put(adminUserId, x509Identity);
		console.log('Successfully enrolled admin user and imported it into the wallet');
	} catch (error) {
		console.error(`Failed to enroll admin user : ${error}`);
	}
};

/**
 * Register and enroll an application user
 * @param {*} caClient 
 * @param {*} wallet 
 * @param {*} orgMspId 
 * @param {*} userId 
 * @param {*} affiliation 
 */
async function registerAndEnrollUser (caClient, wallet, orgMspId, userId, affiliation){
	try {
		// Check to see if we've already enrolled the user
		const userIdentity = await wallet.get(userId);
		if (userIdentity) {
			console.log(`An identity for the user ${userId} already exists in the wallet`);
			return;
		}

		// Must use an admin to register a new user
		const adminIdentity = await wallet.get(adminUserId);
		if (!adminIdentity) {
			console.log('An identity for the admin user does not exist in the wallet');
			console.log('Enroll the admin user before retrying');
			return;
		}

		// build a user object for authenticating with the CA
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, adminUserId);

		// Register the user, enroll the user, and import the new identity into the wallet.
		// if affiliation is specified by client, the affiliation value must be configured in CA
		const secret = await caClient.register({
			affiliation: affiliation,
			enrollmentID: userId,
			role: 'client'
		}, adminUser);
		const enrollment = await caClient.enroll({
			enrollmentID: userId,
			enrollmentSecret: secret
		});
		const x509Identity = {
			credentials: {
				certificate: enrollment.certificate,
				privateKey: enrollment.key.toBytes(),
			},
			mspId: orgMspId,
			type: 'X.509',
		};
		console.log(x509Identity)
		await wallet.put(userId, x509Identity);
		console.log(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
	} catch (error) {
		console.error(`Failed to register user : ${error}`);
	}
};

/**
 * Enroll an admin user for Org1
 */
async function getAdmin(){
  let ccp = buildCCPOrg1()

  // build an instance of the fabric ca services client based on
  // the information in the network configuration
  const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
      
  // setup the wallet to hold the credentials of the application user
  const wallet = await buildWallet(Wallets, walletPath);  

  // in a real application this would be done on an administrative flow, and only once
  await enrollAdmin(caClient, wallet, 'Org1MSP');
}

/**
 * Register and enroll an application user for Org1
 * @param {*} org1UserId 
 */
async function getUser(org1UserId){
  let ccp = helper.buildCCPOrg1()

  // build an instance of the fabric ca services client based on
  // the information in the network configuration
  const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
      
  // setup the wallet to hold the credentials of the application user
  const wallet = await helper.buildWallet(Wallets, walletPath);  

	await registerAndEnrollUser(caClient, wallet, 'Org1MSP', org1UserId, 'org1.department1');
}


let args = process.argv

if(args[2] === 'admin'){
	// node caActions.js admin
  getAdmin()
} else if(args[2] === 'user'){
	// node caActions.js user peter
  let org1UserId = args[3]
  getUser(org1UserId)
} else {
  console.log('...')
}


