import { ethers, utils } from "ethers";

const sigKeyPrefix = "signingKey_";
const cyberApiUrl = 'https://api.cybertino.io/connect/'
const INDEX_NAME = "easyCyberConnect"
const STORE_NAME = "store"

var iDBHandler = function() {
    "use strict";
    if (iDBHandler._instance) {
        return iDBHandler._instance;
    }
    iDBHandler._instance = this;
    this.db = createObjectStore(INDEX_NAME, STORE_NAME);
};

iDBHandler.getInstance = function () {
    "use strict";
    return iDBHandler._instance || new iDBHandler();
}

function arrayBuffer2Hex(e)
{
    return "0x" + Array.prototype.map.call(new Uint8Array(e), (function(e) {
                return ("00" + e.toString(16)).slice(-2)
            })).join("")
}

async function generateKeyPair()
{
    let algorithm = {
       name: "ECDSA",
       namedCurve: "P-256"
    };
    let extractable = true;
    let keyUsages = ["sign", "verify"];
    return await window.crypto.subtle.generateKey(algorithm, extractable, keyUsages);
}

function createObjectStore(dbName, storeName) {
    console.log("enter CreateObjectStore")
    return new Promise((resolve, reject) => {
        var request = window.indexedDB.open(dbName);
        request.onsuccess = function (e){
            console.log("open the first db in createObjectStore")
            var database = e.target.result;
            console.log("ttttttt")
            var version =  parseInt(database.version);
            console.log("current version of the db in CreateObjectStore", version)
            database.close();
            var secondRequest = indexedDB.open(dbName, version+1);
            secondRequest.onupgradeneeded = function (e) {
                var database = e.target.result;
                if (!database.objectStoreNames.contains(storeName)) {
                  console.log(`there is no object store named: ${storeName}, create ${storeName}`)
                  database.createObjectStore(storeName);
                } else {
                    console.log(`there is object store named: ${storeName}`)
                }
            };
            secondRequest.onsuccess = function (e) {
                resolve(e.target.result)
            }
            secondRequest.onerror = function (e) {
                console.log("open db fail in createObjectStore`", e)
                e.target.result.close();
                resolve(e)
            }
            console.log("terminate all operations")
        }
        request.onerror = function(e) {
          console.log("Fail to open in createObjectStore")
          reject(e)
        }
    })
}

function getKeyPairFromIndexedDB(dbHandler, dbName, storeName, key) {
    console.log("enter getKeyPairFromIndexedDB")
    return new Promise((resolve, reject) => {
      let r = dbHandler.transaction([storeName], 'readwrite').objectStore(storeName).get(key)
      r.onsuccess = function (e) {
        console.log("success to fetch data")
        console.log(e.target.result)
        resolve(e.target.result)   
    }})
}

function putDataToIndexedDB(dbHandler, dbName, storeName, key, value) {
    return new Promise((resolve, reject) => {
        var request = dbHandler.transaction([storeName], 'readwrite')
              .objectStore(storeName).put(value, key);
      
        request.onsuccess = function (event) {
              console.log('数据写入成功');
              resolve(event);
        };
      
        request.onerror = function (event) {
              console.log('数据写入失败');
              reject(event);
        }
    })
}

export async function sigData(message) {
    if (!window.ethereum) {
        throw new Error("No new crypto wallet found")
    }
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const signature = await signer.signMessage(message);
    const address = await signer.getAddress();
    console.log(message, signature, address);
    return address, signature
}

async function registerKey(publicKey, signature, key) {
    let postBody = {
      "operationName": "registerKey",
      "query": "mutation registerKey($input: RegisterKeyInput!) {\n      registerKey(input: $input) {\n        result\n      }\n    }",
      "variables": {
          "input": {
              "address": publicKey.toLowerCase(),
              "message": "I authorize CyberConnect from this device using signing key:\n" + key,
              "signature": signature,
              "network": "ETH"
          }
      }
    }
    console.log('registerKey postBody: ', postBody)
    const requestOptions = {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
        // 'Refer': 'https://galaxy.eco/',
        'Origin': 'https://galaxy.eco'
      }),
      body: JSON.stringify(postBody)
    };
  
    let res = await fetch(cyberApiUrl, requestOptions);
    return await res.json();
}

async function getKeyPair(publicKey) {
  let indexKey = sigKeyPrefix + publicKey;

  if (!window.indexedDB) {
    window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.")
  }
  let dbInstance = iDBHandler.getInstance()
  let dbHandler = await dbInstance.db
  if (dbHandler == null) {
      console.log("get dbhanlder instance fail")
      return
  }
  console.log("indexKey: ", indexKey)
  let value = await getKeyPairFromIndexedDB(dbHandler, INDEX_NAME, 'store', indexKey);
  console.log("current value: ", value)
  if (value == null) {
    let keyPair = await generateKeyPair();
    console.log(keyPair)
    console.log("save keypair to db");
    let sigKey = await getSigningKeyNew(keyPair)
    console.log("new signKey: ", sigKey)
    let address, signature = await sigData("I authorize CyberConnect from this device using signing key:\n" + sigKey)
    let registerKeyResult = await registerKey(publicKey, signature, sigKey)
    console.log("registerKeyResult: ", registerKeyResult)
    await putDataToIndexedDB(dbHandler, INDEX_NAME, 'store', indexKey, keyPair);
    value = keyPair;
  } else {
      console.log("there is no need to generate new keyPair")
  }
  return value;
}

async function signECDSA(privateKey, data)
{
    let algorithm = {
        name: "ECDSA",
        hash: {
            name: "SHA-256"
        }
    };
    let text = new TextEncoder;
    let encodedData = text.encode(data);
    return await window.crypto.subtle.sign(algorithm, privateKey, encodedData);
}

async function signWithSigningKey(strDict, publicKey, keyPairPromise)
{
    console.log(strDict, publicKey);
    let signaturePromise = await keyPairPromise.then(function (keyPair) {
        console.log("Generated key pair in signWithSigningKey: ", keyPair.privateKey);
        console.log(JSON.stringify(keyPair.privateKey))
        window.crypto.subtle.exportKey("jwk", keyPair.privateKey).then(r => (console.log("++++privateKey: ",r)));
        return signECDSA(keyPair.privateKey, strDict).then(async function(rawSign) {
            console.log("rawSign: ", rawSign);
            let sign = arrayBuffer2Hex(rawSign);
            console.log("sign: ", sign);
            return await sign;
        })
    })
    return await signaturePromise;
}

function getSigningKeyNew(keyPair) {
    console.log("Generated key pair in getSigningKey: ", keyPair.publicKey);
    // window.crypto.subtle.exportKey("spki", keyPair.publicKey).then(r => (console.log("----publicKey: ",r)));
    return window.crypto.subtle.exportKey("spki", keyPair.publicKey).then(async function(exportKey) {
       return await btoa(String.fromCharCode.apply(null, new Uint8Array(exportKey)));
    })
}

async function getSigningKey(keyPairPromise)
{
    // export key
    let exportKeyPromise = await keyPairPromise.then(function(keyPair) {
        return getSigningKeyNew(keyPair)
    })
    return await exportKeyPromise;
}

async function getSignAndKey(strDict, publicKey) {
    // generate signatrue
    let keyPairPromise = getKeyPair(publicKey);

    return await Promise.all([signWithSigningKey(strDict, publicKey, keyPairPromise), getSigningKey(keyPairPromise)]);
}

export async function follow(from, to) {
  let op_name = "follow";
  let namespace = "Galaxy";
  let network = "ETH";
  let alias = "";

  let d = {
    name: op_name,
    from: from,
    to: to,
    namespace: namespace,
    network: network,
    timestamp: Date.now(),
    alias: alias
  };

  let signature_signingKey = await getSignAndKey(JSON.stringify(d), from);
  let signature = signature_signingKey[0];
    let signingKey = signature_signingKey[1];
    console.log("signature: ", signature);
    console.log("signingKey: ", signingKey);

    let apiBody = {
        fromAddr: from,
        toAddr: to,
        alias: alias,
        namespace: namespace,
        signature: signature,
        signingKey: signingKey,
        operation: JSON.stringify(d),
        network: network,
        type: "FOLLOW"
     }

     console.log(JSON.stringify(apiBody));

    let postBody = {
      "operationName": "connect",
      "query": "mutation connect($input: UpdateConnectionInput!) {connect(input: $input) {result}}",
      "variables": {
        "input": apiBody
      }
    }

    const requestOptions = {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
        // 'Refer': 'https://galaxy.eco/',
        'Origin': 'https://galaxy.eco'
      }),
      body: JSON.stringify(postBody)
    };
    let res = await fetch(cyberApiUrl, requestOptions);
    return await res.json();
}

