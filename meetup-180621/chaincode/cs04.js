'use strict';

// SDK Library to asset with writing the logic 
const { Contract } = require('fabric-contract-api');
const ClientIdentity = require('fabric-shim').ClientIdentity;

/**
 * Chaincode Interface = dependencies of fabric-shim = old version
 * Contract Interface = dependencies of fabric-contract-api and fabric-shim will be required too = new version
 */
class Cs04Contract extends Contract {
    constructor(){
      super('Cs04Contract');
      
      // DataModel
      this.Model = {};
      this.TxId = '';
      this.Cid = {};
    }

    beforeTransaction(ctx) {
      // default implementation is do nothing
      this.TxId = ctx.stub.txId;
      console.log('---------------------------');
      console.log('transaction start');
      console.log(`TxId: ${this.TxId}`);

      // create a client identity instance
      this.Cid = new ClientIdentity(ctx.stub);
      
      // get the MSPID from the invoker
      console.log(this.Cid.getMSPID());

      // a string in the format: "x509::{subject DN}::{issuer DN}" will be returned
      const Cert = this.splitId(this.Cid.getID());
      console.log(Cert);

      // get the value of an given attribute
      console.log('samlinux.writer',this.Cid.getAttributeValue("samlinux.writer"));
      console.log('samlinux.reader',this.Cid.getAttributeValue("samlinux.reader"));
      console.log('samlinux.auditor',this.Cid.getAttributeValue("samlinux.auditor"));

    } 

    afterTransaction(ctx, result) {
      console.log('transaction done, R: ',result);
      console.log('---------------------------');
    }

    unknownTransaction(ctx) {
      //Sending error message back to peer
      let ret = ctx.stub.getFunctionAndParameters();
      throw new Error(`CC method ${ret.fcn} not defined!`);
    }

  /**
   * Split X509 data 
   * @param {*} X509 
   * @returns 
   */
  splitId(X509){
    let a = X509.split('::'), cert = {};
    cert.typ = a[0];
    cert.subject = this.splitInfo(a[1]);
    cert.issuer = this.splitInfo(a[2]);
    return cert;
  }

  /**
   * helper to split the data
   * @param {*} data 
   * @returns 
   */
  splitInfo(data){
    let dataA = data.split('/');
    return dataA.reduce(function(result, item) {
      let i = item.split('=')
      if(i[0] !== ''){
        result[i[0]] = i[1];
      }
      
      return result;
    }, {});
  }

  /**
   * create or update an asset
   * @param {*} ctx 
   * @returns 
   */
  async set(ctx){
    // chekc the proper permissions
    if(!this.Cid.assertAttributeValue('samlinux.writer', 'true')){
      return {
        key: 'Error, you are not allowed to create or update an asset!'
      };
    }

    // create the model and get the key
    this.createModel(ctx);

    try {
      // store the key
      const assetBuffer = Buffer.from(JSON.stringify(this.Model.data));
      await ctx.stub.putState(this.Model.key, assetBuffer);

      // compose the return values
      return {
        key: this.Model.key
      };

    } catch(e){
      throw new Error(`The tx ${this.TxId} can not be stored: ${e}`);
    }
  }

  /**
   * get the latest state of a given key
   * 
   * @param {*} ctx 
   * @param {*} key 
   */
  async get(ctx, key){
    const allowedAttributes = ['samlinux.reader', 'samlinux.writer', 'samlinux.auditor'];
    const status = this.hasAttribute(allowedAttributes);

    if(!status){
      return {
        key: 'Error, you are not allowed to read an asset!'
      };
    }

    // get the asset from chaincode state
    const assetAsBuffer = await ctx.stub.getState(key); 

    // check if the asset key was found
    if (!assetAsBuffer || assetAsBuffer.length === 0) {
      throw new Error(`The asset ${key} does not exist`);
    }
    // convert the buffer to string
    return assetAsBuffer.toString('utf8');
  }
  
  // AssetExists returns true when asset with given KEY exists in world state.
  async AssetExists(ctx, key) {
    const assetJSON = await ctx.stub.getState(key);
    return assetJSON && assetJSON.length > 0;
  }

  /**
   * check if one attributes is true
   * @param {*} allowedAttributes 
   * @returns 
   */
  hasAttribute(allowedAttributes){
    let status = false;
    for (let i = 0; i < allowedAttributes.length; i++){
      if(this.Cid.getAttributeValue(allowedAttributes[i], 'true')){
        status = true;
        break;
      }
    }
    return status;
  }

  /**
   * Create Model
   * product {no, desc, amount, price}
   * @param {*} data 
   */
  createModel(ctx){
    // get passed parameters
    const ret = ctx.stub.getFunctionAndParameters();

    // convert passed parameter to JSON
    const data = JSON.parse(ret.params[0]);

    // start composing a data and key model
    this.Model.data = {};

    if(data.hasOwnProperty('no')){
      this.Model.key = data.no;
    }

    if(data.hasOwnProperty('desc')){
      this.Model.data.desc = data.desc;
    }

    if(data.hasOwnProperty('amount')){
      this.Model.data.amount = parseInt(data.amount);
    }

    if(data.hasOwnProperty('price')){
      this.Model.data.price = parseFloat(data.price);
    } 

    if(data.hasOwnProperty('type')){
      this.Model.data.type = data.type;
    } 
  }
    
};

module.exports = Cs04Contract