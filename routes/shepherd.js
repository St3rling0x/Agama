const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const url = require('url');
const os = require('os');
const fsnode = require('fs');
const fs = require('fs-extra');
const _fs = require('graceful-fs');
const express = require('express');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const md5 = require('./md5.js');
const request = require('request');
const async = require('async');
const portscanner = require('portscanner');
const aes256 = require('nodejs-aes256');
const AdmZip = require('adm-zip');
const remoteFileSize = require('remote-file-size');
const Promise = require('bluebird');
const {shell} = require('electron');
const {execFile} = require('child_process');

const fixPath = require('fix-path');
var ps = require('ps-node');
var setconf = require('../private/setconf.js');
var nativeCoind = require('./nativeCoind.js');
var assetChainPorts = require('./ports.js');
var _appConfig = require('./appConfig.js');
var shepherd = express.Router();
var coindInstanceRegistry = {};
var guiLog = {};
var rpcConf = {};
var appRuntimeLog = [];
var lockDownAddCoin = false;

const electrumJSCore = require('./electrumjs/electrumjs.core.js');
const electrumJSNetworks = require('./electrumjs/electrumjs.networks.js');
const electrumJSTxDecoder = require('./electrumjs/electrumjs.txdecoder.js');
const electrumServers = {
  /*zcash: {
    address: '173.212.225.176',
    port: 50032,
    proto: 'tcp',
  },*/
  komodo: { // !estimatefee
    address: '173.212.225.176',
    port: 50011,
    proto: 'tcp',
    txfee: 10000,
  },
  dogecoin: { // !estimatefee
    address: '173.212.225.176',
    port: 50015,
    proto: 'tcp',
    txfee: 100000000,
  },
  viacoin: { // !estimatefee
    address: 'vialectrum.bitops.me',
    port: 50002,
    proto: 'ssl',
    txfee: 100000,
  },
  vertcoin: {
    address: '173.212.225.176',
    port: 50088,
    proto: 'tcp',
    txfee: 100000,
  },
  namecoin: {
    address: '173.212.225.176',
    port: 50036,
    proto: 'tcp',
    txfee: 100000,
  },
  monacoin: { // !estimatefee
    address: '173.212.225.176',
    port: 50002,
    proto: 'tcp',
    txfee: 100000,
  },
  litecoin: {
    address: '173.212.225.176',
    port: 50012,
    proto: 'tcp',
    txfee: 10000,
  },
  faircoin: {
    address: '173.212.225.176',
    port: 50005,
    proto: 'tcp',
    txfee: 1000000,
  },
  digibyte: {
    address: '173.212.225.176',
    port: 50022,
    proto: 'tcp',
    txfee: 100000,
  },
  dash: {
    address: '173.212.225.176',
    port: 50098,
    proto: 'tcp',
    txfee: 10000,
  },
  crown: {
    address: '173.212.225.176',
    port: 50041,
    proto: 'tcp',
    txfee: 10000,
  },
  bitcoin: {
    address: '173.212.225.176',
    port: 50001,
    proto: 'tcp',
  },
  argentum: { // !estimatefee
    address: '173.212.225.176',
    port: 50081,
    proto: 'tcp',
    txfee: 50000,
  },
  chips: { // !estimatefee
    address: '173.212.225.176',
    port: 50076,
    proto: 'tcp',
    txfee: 10000,
  },
};

let blockchain = {
  komodo: {
    height: 0,
  },
}

const bitcoinJS = require('bitcoinjs-lib');

shepherd.appConfig = _appConfig.config;

if (os.platform() === 'darwin') {
  fixPath();
  var agamaDir = `${process.env.HOME}/Library/Application Support/agama`,
      agamaTestDir = `${process.env.HOME}/Library/Application Support/agama/test`,
      komododBin = path.join(__dirname, '../assets/bin/osx/komodod'),
      komodocliBin = path.join(__dirname, '../assets/bin/osx/komodo-cli'),
      komodoDir = shepherd.appConfig.dataDir.length ? shepherd.appConfig.dataDir : `${process.env.HOME}/Library/Application Support/Komodo`,
      zcashdBin = '/Applications/ZCashSwingWalletUI.app/Contents/MacOS/zcashd',
      zcashcliBin = '/Applications/ZCashSwingWalletUI.app/Contents/MacOS/zcash-cli',
      zcashDir = `${process.env.HOME}/Library/Application Support/Zcash`,
      zcashParamsDir = `${process.env.HOME}/Library/Application Support/ZcashParams`,
      chipsBin = path.join(__dirname, '../assets/bin/osx/chipsd'),
      chipscliBin = path.join(__dirname, '../assets/bin/osx/chips-cli'),
      komodoDir = `${process.env.HOME}/Library/Application Support/Chips`,
      coindRootDir = path.join(__dirname, '../assets/bin/osx/dex/coind');
}

if (os.platform() === 'linux') {
  var agamaDir = `${process.env.HOME}/.agama`,
      agamaTestDir = `${process.env.HOME}/.agama/test`,
      komododBin = path.join(__dirname, '../assets/bin/linux64/komodod'),
      komodocliBin = path.join(__dirname, '../assets/bin/linux64/komodo-cli'),
      komodoDir = shepherd.appConfig.dataDir.length ? shepherd.appConfig.dataDir : `${process.env.HOME}/.komodo`,
      zcashParamsDir = `${process.env.HOME}/.zcash-params`,
      chipsBin = path.join(__dirname, '../assets/bin/linux64/chipsd'),
      chipscliBin = path.join(__dirname, '../assets/bin/linux64/chips-cli'),
      chipsDir = `${process.env.HOME}/.chips`,
      coindRootDir = path.join(__dirname, '../assets/bin/linux64/dex/coind');
}

if (os.platform() === 'win32') {
  var agamaDir = `${process.env.APPDATA}/agama`;
      agamaDir = path.normalize(agamaDir);
      agamaTestDir = `${process.env.APPDATA}/agama/test`;
      agamaTestDir = path.normalize(agamaTestDir);
      komododBin = path.join(__dirname, '../assets/bin/win64/komodod.exe'),
      komododBin = path.normalize(komododBin),
      komodocliBin = path.join(__dirname, '../assets/bin/win64/komodo-cli.exe'),
      komodocliBin = path.normalize(komodocliBin),
      komodoDir = shepherd.appConfig.dataDir.length ? shepherd.appConfig.dataDir : `${process.env.APPDATA}/Komodo`,
      komodoDir = path.normalize(komodoDir);
      chipsBin = path.join(__dirname, '../assets/bin/win64/chipsd.exe'),
      chipsBin = path.normalize(chipsBin),
      chipscliBin = path.join(__dirname, '../assets/bin/win64/chips-cli.exe'),
      chipscliBin = path.normalize(chipscliBin),
      chipsDir = `${process.env.APPDATA}/Chips`,
      chipsDir = path.normalize(chipsDir);
      zcashParamsDir = `${process.env.APPDATA}/ZcashParams`;
      zcashParamsDir = path.normalize(zcashParamsDir);
      coindRootDir = path.join(__dirname, '../assets/bin/osx/dex/coind');
      coindRootDir = path.normalize(coindRootDir);
}

shepherd.appConfigSchema = _appConfig.schema;
shepherd.defaultAppConfig = Object.assign({}, shepherd.appConfig);
shepherd.kmdMainPassiveMode = false;

shepherd.coindInstanceRegistry = coindInstanceRegistry;

shepherd.get('/electrum/getbalance', function(req, res, next) {
  const ecl = new electrumJSCore(electrumServers[req.query.network].port, electrumServers[req.query.network].address, electrumServers[req.query.network].proto); // tcp or tls

  ecl.connect();
  ecl.blockchainAddressGetBalance(req.query.address)
  .then((json) => {
    ecl.close();
    console.log('electrum getbalance ==>');
    console.log(0.00000001 * json.confirmed);

     const successObj = {
       'msg': 'success',
       'result': {
          balance: 0.00000001 * json.confirmed,
        },
     };

     res.end(JSON.stringify(successObj));
  });
});

shepherd.get('/electrum/listtransactions', function(req, res, next) {
  const ecl = new electrumJSCore(electrumServers[req.query.network].port, electrumServers[req.query.network].address, electrumServers[req.query.network].proto); // tcp or tls

  if (!req.query.full) {
    ecl.connect();
    ecl.blockchainAddressGetHistory(req.query.address)
    .then((json) => {
      ecl.close();
      console.log('electrum listtransactions ==>');
      console.log(json);

       const successObj = {
         'msg': 'success',
         'result': {
            listtransactions: json,
          },
       };

       res.end(JSON.stringify(successObj));
    });
  } else {
    // !expensive call!
    // TODO: limit e.g. 1-10, 10-20 etc
    const MAX_TX = 10;
    ecl.connect();

    ecl.blockchainNumblocksSubscribe()
    .then(function(currentHeight) {
      // TODO: block time, confs
      ecl.blockchainAddressGetHistory(req.query.address)
      .then((json) => {
        if (json &&
            json.length) {
          json = json.slice(0, MAX_TX);
          console.log(json.length);
          let _rawtx = [];

          // get raw tx
          for (let i = 0; i < json.length; i++) {
            ecl.blockchainTransactionGet(json[i]['tx_hash'])
            .then((_json) => {
              console.log('electrum gettransaction ==>');
              console.log(i + ' | ' + (json.length - 1));
              console.log(_json);

              // decode tx
              const _network = electrumJSNetworks[req.query.network];
              const decodedTx = electrumJSTxDecoder(_json, _network);

              // TODO: multi vin
              if (decodedTx.inputs[0].txid === '0000000000000000000000000000000000000000000000000000000000000000') {
                ecl.blockchainBlockGetHeader(json[i].height)
                .then((blockInfo) => {
                  _rawtx.push({
                    network: decodedTx.network,
                    format: decodedTx.format,
                    inputs: decodedTx.inputs,
                    outputs: decodedTx.outputs,
                    height: json[i].height,
                    timestamp: blockInfo.timestamp,
                    confirmations: currentHeight - json[i].height,
                    miner: true,
                  });

                  if (i === json.length - 1) {
                    ecl.close();
                    console.log('electrum gettransaction array ==>');
                    console.log(_rawtx);

                    const successObj = {
                      'msg': 'success',
                      'result': {
                        listtransactions: _rawtx,
                      },
                    };

                    res.end(JSON.stringify(successObj));
                  }
                });
              } else {
                // get vin tx, decode
                ecl.blockchainBlockGetHeader(json[i].height)
                .then((blockInfo) => {
                  ecl.blockchainTransactionGet(decodedTx.inputs[0].txid)
                  .then((__json) => {
                    console.log('electrum decoderawtx input tx ==>');
                    console.log(__json);

                    const decodedVin = electrumJSTxDecoder(__json, _network);

                    _rawtx.push({
                      network: decodedTx.network,
                      format: decodedTx.format,
                      inputs: decodedVin.outputs[decodedTx.inputs[0].n],
                      outputs: decodedTx.outputs,
                      height: json[i].height,
                      timestamp: blockInfo.timestamp,
                      confirmations: currentHeight - json[i].height,
                    });

                    if (i === json.length - 1) {
                      ecl.close();
                      console.log('electrum gettransaction array ==>');
                      console.log(_rawtx);

                      const successObj = {
                        'msg': 'success',
                        'result': {
                          listtransactions: _rawtx,
                        },
                      };

                      res.end(JSON.stringify(successObj));
                    }
                  });
                });
              }
            });
          }
        }
      });
    });
  }
});

shepherd.get('/electrum/gettransaction', function(req, res, next) {
  // TODO: block time, confs, current height
  const ecl = new electrumJSCore(electrumServers[req.query.network].port, electrumServers[req.query.network].address, electrumServers[req.query.network].proto); // tcp or tls

  ecl.connect();
  ecl.blockchainTransactionGet(req.query.txid)
  .then((json) => {
    ecl.close();
    console.log('electrum gettransaction ==>');
    console.log(json);

    const successObj = {
      'msg': 'success',
      'result': {
        gettransaction: json,
      },
    };

    res.end(JSON.stringify(successObj));
  });
});

shepherd.parseTransactionAddresses = function(tx, targetAddress) {
  // TODO: - mined flag
  //       - multi vin multi vout
  //       - detect change address
  let result = [];
  let _parse = {
    inputs: {},
    outputs: {},
  };
  let addressFound = false;

  for (let key in _parse) {
    if (!tx[key].length) {
      _parse[key] = [];
      _parse[key].push(tx[key]);
    } else {
      _parse[key] = tx[key];
    }

    for (let i = 0; i < _parse[key].length; i++) {
      console.log(key + ' ==>');
      console.log(_parse[key][i]);
      if (key === 'outputs' ||
          (key === 'inputs' && _parse[key][i].scriptPubKey.addresses && _parse[key][i].value)) {
        if (!targetAddress || (targetAddress === _parse[key][i].scriptPubKey.addresses[0] && !addressFound)) {
          let _type;

          if (tx.miner) {
            _type = 'miner';
          } else {
            _type = key === 'inputs' ? 'out' : 'in';
          }
          result.push({
            type: _type, // flip
            value: _parse[key][i].value,
            address: _parse[key][i].scriptPubKey.addresses[0],
            timestamp: tx.timestamp,
            txid: tx.format.txid,
            confirmations: tx.confirmations,
          });

          addressFound = true;
        }
      }
    }
  }

  console.log('parseTransactionAddresses result ==>');
  console.log(result);
  return result;
}

shepherd.get('/electrum/getblockinfo', function(req, res, next) {
  shepherd.electrumGetBlockInfo(req.query.height, req.query.network)
  .then(function(json) {
    const successObj = {
      'msg': 'success',
      'result': {
        getblockinfo: json,
      },
    };

    res.end(JSON.stringify(successObj));
  });
});

shepherd.electrumGetBlockInfo = function(height, network) {
  return new Promise((resolve, reject) => {
    const ecl = new electrumJSCore(electrumServers[network].port, electrumServers[network].address, electrumServers[network].proto); // tcp or tls

    ecl.connect();
    ecl.blockchainBlockGetHeader(height)
    .then((json) => {
      ecl.close();
      console.log('electrum getblockinfo ==>');
      console.log(json);

      resolve(json);
    });
  });
}

shepherd.get('/electrum/getcurrentblock', function(req, res, next) {
  shepherd.electrumGetCurrentBlock(req.query.network)
  .then(function(json) {
    const successObj = {
      'msg': 'success',
      'result': {
        getcurrentblock: json,
      },
    };

    res.end(JSON.stringify(successObj));
  });
});

shepherd.electrumGetCurrentBlock = function(network) {
  return new Promise((resolve, reject) => {
    const ecl = new electrumJSCore(electrumServers[network].port, electrumServers[network].address, electrumServers[network].proto); // tcp or tls

    ecl.connect();
    ecl.blockchainNumblocksSubscribe()
    .then((json) => {
      ecl.close();
      console.log('electrum currentblock ==>');
      console.log(json);

      resolve(json);
    });
  });
}

shepherd.get('/electrum/formatlisttransactions', function(req, res, next) {
  const tx = [{"network":{"messagePrefix":"\u0019Komodo Signed Message:\n","bip32":{"public":76067358,"private":76066276},"pubKeyHash":60,"scriptHash":85,"wif":188,"dustThreshold":1000},"format":{"txid":"92766e00c81df6c1f174faad44be46ab526f301c7eeee266404a366ba6fa31fc","version":1,"locktime":1485514057},"inputs":{"satoshi":999988875,"value":"9.99988875","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 e21749ae92bb1a0ef51dea76ec4b7905aa2428ba OP_EQUALVERIFY OP_CHECKSIG","hex":"76a914e21749ae92bb1a0ef51dea76ec4b7905aa2428ba88ac","type":"pubkeyhash","addresses":["RVtegwER6B13FNLFUTr6QrkX433Kb17Lgn"]}},"outputs":[{"satoshi":999488649,"value":"9.99488649","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 24af38fcb13bbc171b0b42bb017244a53b6bb2fa OP_EQUALVERIFY OP_CHECKSIG","hex":"76a91424af38fcb13bbc171b0b42bb017244a53b6bb2fa88ac","type":"pubkeyhash","addresses":["RCdAK6sXYYfHxLQKzxcKSxgmwwxbGAgnTR"]}},{"satoshi":500000,"value":"0.00500000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}}],"height":172447,"timestamp":1485514474,"confirmations":340906},{"network":{"messagePrefix":"\u0019Komodo Signed Message:\n","bip32":{"public":76067358,"private":76066276},"pubKeyHash":60,"scriptHash":85,"wif":188,"dustThreshold":1000},"format":{"txid":"6bbc3220670b952a487160d694d690a19dc75d0fe3738af104682082d8c40f5c","version":1,"locktime":1485514057},"inputs":{"satoshi":200000000,"value":"2.00000000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 6b24e73f48da0511fb3d979cddf3e2c03cd1967e OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9146b24e73f48da0511fb3d979cddf3e2c03cd1967e88ac","type":"pubkeyhash","addresses":["RK3ib8RZ9n4LAmUUNyv8DnLF8UeT4R2utg"]}},"outputs":[{"satoshi":199899774,"value":"1.99899774","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 46be5565e078d94e4bc60c6515393fbe86577f9e OP_EQUALVERIFY OP_CHECKSIG","hex":"76a91446be5565e078d94e4bc60c6515393fbe86577f9e88ac","type":"pubkeyhash","addresses":["RFjFPZ4UY82sLtUUBX3TvmwmAUUqULiM3L"]}},{"satoshi":100000,"value":"0.00100000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}}],"height":172447,"timestamp":1485514474,"confirmations":340906},{"network":{"messagePrefix":"\u0019Komodo Signed Message:\n","bip32":{"public":76067358,"private":76066276},"pubKeyHash":60,"scriptHash":85,"wif":188,"dustThreshold":1000},"format":{"txid":"ae35cc98ef9208886ef394792b1bba1cde953804adb66a3d192a89d1a1c48995","version":1,"locktime":1485514057},"inputs":{"satoshi":199899774,"value":"1.99899774","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 46be5565e078d94e4bc60c6515393fbe86577f9e OP_EQUALVERIFY OP_CHECKSIG","hex":"76a91446be5565e078d94e4bc60c6515393fbe86577f9e88ac","type":"pubkeyhash","addresses":["RFjFPZ4UY82sLtUUBX3TvmwmAUUqULiM3L"]}},"outputs":[{"satoshi":198899548,"value":"1.98899548","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 e6f9a1f85aaaae45106edee7a1d3c601dfcd3819 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a914e6f9a1f85aaaae45106edee7a1d3c601dfcd381988ac","type":"pubkeyhash","addresses":["RWLUYRMxZCxPh8HeFBF9SwDtD2k85StQow"]}},{"satoshi":1000000,"value":"0.01000000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}}],"height":172447,"timestamp":1485514474,"confirmations":340906},{"network":{"messagePrefix":"\u0019Komodo Signed Message:\n","bip32":{"public":76067358,"private":76066276},"pubKeyHash":60,"scriptHash":85,"wif":188,"dustThreshold":1000},"format":{"txid":"ddce005757ed1f05574305a480a02a50d9a5afbcd9f996ce6df7a7872f646117","version":1,"locktime":0},"inputs":{"satoshi":100000,"value":"0.00100000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}},"outputs":[{"satoshi":10000,"value":"0.00010000","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}},{"satoshi":80000,"value":"0.00080000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 dca218733633ce1e80faf0ccdb70cb9e41ac11fa OP_EQUALVERIFY OP_CHECKSIG","hex":"76a914dca218733633ce1e80faf0ccdb70cb9e41ac11fa88ac","type":"pubkeyhash","addresses":["RVPnvK49QRmbRYN3SgtFszWzFKNARcB3AH"]}}],"height":279595,"timestamp":1492345900,"confirmations":233758},{"network":{"messagePrefix":"\u0019Komodo Signed Message:\n","bip32":{"public":76067358,"private":76066276},"pubKeyHash":60,"scriptHash":85,"wif":188,"dustThreshold":1000},"format":{"txid":"5a45a6ab8d6c2d89cf0463a7cc593122160e6774437da0292b2bf805bf4f238f","version":1,"locktime":0},"inputs":{"satoshi":10000,"value":"0.00010000","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}},"outputs":[{"satoshi":10000,"value":"0.00010000","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}},{"satoshi":490000,"value":"0.00490000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 dca218733633ce1e80faf0ccdb70cb9e41ac11fa OP_EQUALVERIFY OP_CHECKSIG","hex":"76a914dca218733633ce1e80faf0ccdb70cb9e41ac11fa88ac","type":"pubkeyhash","addresses":["RVPnvK49QRmbRYN3SgtFszWzFKNARcB3AH"]}}],"height":279678,"timestamp":1492350916,"confirmations":233675},{"network":{"messagePrefix":"\u0019Komodo Signed Message:\n","bip32":{"public":76067358,"private":76066276},"pubKeyHash":60,"scriptHash":85,"wif":188,"dustThreshold":1000},"format":{"txid":"4be872597ed9c1be1d7dd36b98d1fb27d644487e46aaf059435fb0a89d4ecfc3","version":1,"locktime":1493189104},"inputs":{"satoshi":10000,"value":"0.00010000","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}},"outputs":[{"satoshi":10000,"value":"0.00010000","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 7651d8965e4078652fdf59e14d1ccee61c290656 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9147651d8965e4078652fdf59e14d1ccee61c29065688ac","type":"pubkeyhash","addresses":["RL4orv22Xch7PhM5w9jUHhVQhX6kF6GkfS"]}},{"satoshi":990000,"value":"0.00990000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}}],"height":293273,"timestamp":1493189165,"confirmations":220080},{"network":{"messagePrefix":"\u0019Komodo Signed Message:\n","bip32":{"public":76067358,"private":76066276},"pubKeyHash":60,"scriptHash":85,"wif":188,"dustThreshold":1000},"format":{"txid":"ea88bf3549df6b04aa45715b995f04f40a9768683f8e98fa69566c91adf1d323","version":1,"locktime":1493208534},"inputs":{"satoshi":990000,"value":"0.00990000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}},"outputs":[{"satoshi":10000,"value":"0.00010000","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 7651d8965e4078652fdf59e14d1ccee61c290656 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9147651d8965e4078652fdf59e14d1ccee61c29065688ac","type":"pubkeyhash","addresses":["RL4orv22Xch7PhM5w9jUHhVQhX6kF6GkfS"]}},{"satoshi":970000,"value":"0.00970000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}}],"height":293583,"timestamp":1493208548,"confirmations":219770},{"network":{"messagePrefix":"\u0019Komodo Signed Message:\n","bip32":{"public":76067358,"private":76066276},"pubKeyHash":60,"scriptHash":85,"wif":188,"dustThreshold":1000},"format":{"txid":"323680e838cb644075508530fb0ef0072ee40c4fbc40c2a8828a8a82e077bf64","version":1,"locktime":1493211930},"inputs":{"satoshi":970000,"value":"0.00970000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}},"outputs":[{"satoshi":10000,"value":"0.00010000","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 7651d8965e4078652fdf59e14d1ccee61c290656 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9147651d8965e4078652fdf59e14d1ccee61c29065688ac","type":"pubkeyhash","addresses":["RL4orv22Xch7PhM5w9jUHhVQhX6kF6GkfS"]}},{"satoshi":950000,"value":"0.00950000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}}],"height":293648,"timestamp":1493211935,"confirmations":219705},{"network":{"messagePrefix":"\u0019Komodo Signed Message:\n","bip32":{"public":76067358,"private":76066276},"pubKeyHash":60,"scriptHash":85,"wif":188,"dustThreshold":1000},"format":{"txid":"a8f12a0842822c81622c9021e54e7ab99044b061be482e4f16bd20cce064c918","version":1,"locktime":1493212481},"inputs":{"satoshi":950000,"value":"0.00950000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}},"outputs":[{"satoshi":10000,"value":"0.00010000","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}},{"satoshi":930000,"value":"0.00930000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}}],"height":293661,"timestamp":1493212543,"confirmations":219692},{"network":{"messagePrefix":"\u0019Komodo Signed Message:\n","bip32":{"public":76067358,"private":76066276},"pubKeyHash":60,"scriptHash":85,"wif":188,"dustThreshold":1000},"format":{"txid":"7da6b8fa066130571be8c08ef95851602050332f95fc3b1ca8dc497fcb2df4f9","version":1,"locktime":1493213728},"inputs":{"satoshi":10000,"value":"0.00010000","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}},"outputs":[{"satoshi":10000,"value":"0.00010000","n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 7651d8965e4078652fdf59e14d1ccee61c290656 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9147651d8965e4078652fdf59e14d1ccee61c29065688ac","type":"pubkeyhash","addresses":["RL4orv22Xch7PhM5w9jUHhVQhX6kF6GkfS"]}},{"satoshi":920000,"value":"0.00920000","n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 2f4c0f91fc06ac228c120aee41741d0d39096832 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac","type":"pubkeyhash","addresses":["RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd"]}}],"height":293682,"timestamp":1493213772,"confirmations":219671}];
  let result = [];

  for (let i = 0; i < tx.length; i++) {
    result = result.concat(shepherd.parseTransactionAddresses(tx[i], 'RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd'));
  }

  const successObj = {
    'msg': 'success',
    result,
  };

  res.end(JSON.stringify(successObj));
});

shepherd.get('/electrum/decoderawtx', function(req, res, next) {
  const _network = electrumJSNetworks[req.query.network];
  const _rawtx = req.query.rawtx;
  // const _rawtx = '0100000001dd6d064f5665f8454293ecaa9dbb55accf4f7e443d35f3b5ab7760f54b6c15fe000000006a473044022056355585a4a501ec9afc96aa5df124cf29ad3ac6454b47cd07cd7d89ec95ec2b022074c4604ee349d30e5336f210598e4dc576bf16ebeb67eeac3f4e82f56e930fee012103b90ba01af308757054e0484bb578765d5df59c4a57adbb94e2419df5e7232a63feffffff0289fc923b000000001976a91424af38fcb13bbc171b0b42bb017244a53b6bb2fa88ac20a10700000000001976a9142f4c0f91fc06ac228c120aee41741d0d3909683288ac49258b58';
  const decodedTx = electrumJSTxDecoder(_rawtx, _network);

  if (req.query.parseonly ||
      decodedTx.inputs[0].txid === '0000000000000000000000000000000000000000000000000000000000000000') {
    const successObj = {
      'msg': 'success',
      'result': {
        decodedTx: {
          network: decodedTx.network,
          format: decodedTx.format,
          inputs: decodedTx.inputs,
          outputs: decodedTx.outputs,
        },
      },
    };

    res.end(JSON.stringify(successObj));
  } else {
    const ecl = new electrumJSCore(electrumServers[req.query.network].port, electrumServers[req.query.network].address, electrumServers[req.query.network].proto); // tcp or tls

    ecl.connect();
    ecl.blockchainTransactionGet(decodedTx.inputs[0].txid)
    .then((json) => {
      ecl.close();
      console.log('electrum decoderawtx input tx ==>');
      console.log(json);

      const decodedVin = electrumJSTxDecoder(json, _network);

      const successObj = {
        'msg': 'success',
        'result': {
          decodedTx: {
            network: decodedTx.network,
            format: decodedTx.format,
            inputs: decodedVin.outputs[decodedTx.inputs[0].n],
            outputs: decodedTx.outputs,
          },
        },
      };

      res.end(JSON.stringify(successObj));
    });
  }
});

// simple case
shepherd.buildTestTx = function(sendTo, changeAddress, wif, network) {
  // single utxo
  const _utxo = {"height":400118,"value":20000,"tx_hash":"764cb67ef9d92942b0a3ef5f9c62ad2a552de07f575e1ab935c3cf45ace00cc8","tx_pos":0};
  const _valToSpend = 10000;

  var key = bitcoinJS.ECPair.fromWIF(wif, electrumJSNetworks['komodo']);
  var tx = new bitcoinJS.TransactionBuilder(electrumJSNetworks[network]);
  console.log(key);
  console.log(key.getAddress().toString());

  // electrumServers[].txfee
  const _txSize = shepherd.estimateTxSize(1, 2);
  const _feeEstimateByte = shepherd.estimateFee('small');
  const _feeEstimateTx = Math.floor(_txSize * _feeEstimateByte);
  const _change = _utxo.value - _valToSpend - _feeEstimateTx;

  console.log('val to spend ' + _valToSpend);
  console.log('change value ' + _change);

  tx.addInput(_utxo['tx_hash'], _utxo['tx_pos']);
  tx.addOutput(sendTo, _valToSpend);
  tx.addOutput(changeAddress, _change);

  console.log('estimate tx size ' + _txSize);
  console.log('fee per byte ' + _feeEstimateByte);
  console.log('tx fee ' + _feeEstimateTx);
  console.log(tx);
  // (in)15000 - (out)12000 = (fee)3000, this is the miner fee

  tx.sign(0, key);
  const rawtx = tx.build().toHex();
  console.log(rawtx);

  return rawtx;
}

shepherd.get('/electrum/txbuildtest', function(req, res, next) {
  const rawtx = shepherd.buildTestTx(
    'RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd',
    'RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd',
    'UrA1TCN2j9iMYKBLkKGMo9MbndBNYVW9nJV9RdViR9CoVK82ApFb',
    'komodo'
  );

  const successObj = {
    'msg': 'success',
    'result': {
      rawtx: rawtx,
    },
  };

  res.end(JSON.stringify(successObj));
});

shepherd.findUtxoSet = function(utxoList, target) {
  // utxoList = [{"height":427959,"value":20000,"tx_hash":"3f7da2daef2ea59fd40eb28d2be04a17839f2073c16ea291b1b03a3d799fec3b","tx_pos":0},{"height":428139,"value":20000,"tx_hash":"aa4afdece59c46a6a1e34d6ae7bf2c46b282de0ce6ef1753e8766c08e87bdb36","tx_pos":0},{"height":428216,"value":20000,"tx_hash":"3ec5e982083ffc617aaa75e68e69f9da5f07faadcd870e144f6451c34936ee24","tx_pos":0},{"height":433459,"value":20000,"tx_hash":"b943330cb034f36c6d9f03c57a2e1f0a3970378825336b505d51d1f2561af3fe","tx_pos":0},{"height":459573,"value":100000,"tx_hash":"7fee95da75e9b77bf9cd03b460fcf04c31ce4dbe4bdfa1e66256c9beb1fe2308","tx_pos":0},{"height":505916,"value":20000,"tx_hash":"aa92df15b20a10543750db58fc6e885205d1eee3438ef79f01d3c4ec2616e7aa","tx_pos":0},{"height":505916,"value":90000,"tx_hash":"aa92df15b20a10543750db58fc6e885205d1eee3438ef79f01d3c4ec2616e7aa","tx_pos":1},{"height":505931,"value":20000,"tx_hash":"dd1ab56c0e3f63e3650aeca3e2aa4ecea54cca22e97932e48341e299c4640ef9","tx_pos":0},{"height":505931,"value":100000,"tx_hash":"dd1ab56c0e3f63e3650aeca3e2aa4ecea54cca22e97932e48341e299c4640ef9","tx_pos":1},{"height":505937,"value":20000,"tx_hash":"7bed6729de8be9b61b85716d8d1615d751c1dbb2bd2defd6f9c76354a591586c","tx_pos":0},{"height":505937,"value":70000,"tx_hash":"7bed6729de8be9b61b85716d8d1615d751c1dbb2bd2defd6f9c76354a591586c","tx_pos":1},{"height":506038,"value":20000,"tx_hash":"f47f4d5e2aaee19f98ebdf97deac3c471b919b71312a073d1b45dfc27fb64d24","tx_pos":0},{"height":506045,"value":20000,"tx_hash":"e8a92b174b768a050b4801ea497cdb9651d4647f20ec5a77b5af0d6558fdf468","tx_pos":0},{"height":506057,"value":20000,"tx_hash":"758ae45606ee43b55d72ec57284abac54c34b34badf4986b3d9e53e5aaf227d8","tx_pos":0},{"height":514498,"value":18902,"tx_hash":"b3918bc40a8ba4fb26383bdd54b8519d14200b7f2c700adb2ceea46d5ca36590","tx_pos":0},{"height":514722,"value":10000,"tx_hash":"a6c46b2168964f2e6f18a8cba40eac10a30a6bcc363b773696265f8450c5a881","tx_pos":0},{"height":514722,"value":4820,"tx_hash":"a6c46b2168964f2e6f18a8cba40eac10a30a6bcc363b773696265f8450c5a881","tx_pos":1}];
  let result = [];
  let sum = 0;

  function findUtxoSubset() {
    if (utxoList[0].value >= target) {
      result.push(utxoList[0]);
    } else {
      for (let i = 0; i < utxoList.length; i++) {
        if (sum < target) {
          sum += Number(utxoList[i].value);
          result.push(utxoList[i]);
        } else {
          break;
        }
      }
    }
  }

  // search time
  const startTime = process.hrtime();
  const res = findUtxoSubset();
  const diff = process.hrtime(startTime);

  const change = sum - target;

  // console.log('utxo set search result: ', result);
  console.log('target: ' + target);
  console.log('total utxos: ' + utxoList.length);
  console.log('utxo sum: ' + sum);
  console.log('change: ' + change);
  console.log(`Time: ${ (diff[0] * 1e9 + diff[1]) / 1000000} ms`);

  return {
    set: result,
    change
  };
}

shepherd.get('/electrum/subset', function(req, res, next) {
  const _utxoSet = shepherd.findUtxoSet(null, Number(req.query.target) + Number(electrumServers[req.query.network].txfee)); // target + txfee

  const successObj = {
    'msg': 'success',
    'result': {
      utxoSet: _utxoSet.set,
      change: _utxoSet.change,
    },
  };

  res.end(JSON.stringify(successObj));
});

// single sig
shepherd.buildSignedTx = function(sendTo, changeAddress, wif, network, utxo, changeValue, spendValue) {
  var key = bitcoinJS.ECPair.fromWIF(wif, electrumJSNetworks[network]);
  var tx = new bitcoinJS.TransactionBuilder(electrumJSNetworks[network]);

  console.log('buildSignedTx priv key ' + wif);
  console.log('buildSignedTx pub key ' + key.getAddress().toString());
  console.log('buildSignedTx std tx fee ' + electrumServers[network].txfee);

  for (let i = 0; i < utxo.length; i++) {
    tx.addInput(utxo[i]['tx_hash'], utxo[i]['tx_pos']);
  }

  tx.addOutput(sendTo, Number(spendValue));
  tx.addOutput(changeAddress, Number(changeValue));

  console.log('buildSignedTx unsigned tx data');
  console.log(tx);

  for (let i = 0; i < utxo.length; i++) {
    tx.sign(i, key);
  }

  const rawtx = tx.build().toHex();
  console.log('buildSignedTx signed tx hex');
  console.log(rawtx);

  return rawtx;
}

shepherd.get('/electrum/createrawtx', function(req, res, next) {
  const ecl = new electrumJSCore(electrumServers[req.query.network].port, electrumServers[req.query.network].address, electrumServers[req.query.network].proto); // tcp or tls
  const outputAddress = req.query.address;
  const changeAddress = req.query.change;
  const wif = req.query.wif;
  const value = req.query.value;
  const network = req.query.network;
  const push = req.query.push;

  ecl.connect();
  ecl.blockchainAddressListunspent(changeAddress)
  .then((utxoList) => {
    ecl.close();

    console.log('electrum listunspent ==>');

    const _utxoSet = shepherd.findUtxoSet(utxoList, Number(req.query.value) + Number(electrumServers[req.query.network].txfee)); // target + txfee

    const _rawtx = shepherd.buildSignedTx(outputAddress, changeAddress, wif, network, _utxoSet.set, _utxoSet.change, value);

    if (!push) {
      const successObj = {
        'msg': 'success',
        'result': {
          utxoSet: _utxoSet.set,
          change: _utxoSet.change,
          wif,
          value,
          outputAddress,
          changeAddress,
          network,
          rawtx: _rawtx,
        },
      };

      res.end(JSON.stringify(successObj));
    } else {
      const ecl = new electrumJSCore(electrumServers[req.query.network].port, electrumServers[req.query.network].address, electrumServers[req.query.network].proto); // tcp or tls

      ecl.connect();
      ecl.blockchainTransactionBroadcast(_rawtx)
      .then((txid) => {
        ecl.close();

        const successObj = {
          'msg': 'success',
          'result': {
            utxoSet: _utxoSet.set,
            change: _utxoSet.change,
            wif,
            value,
            outputAddress,
            changeAddress,
            network,
            rawtx: _rawtx,
            txid,
          },
        };

        res.end(JSON.stringify(successObj));
      });
    }
  });
});

/*shepherd.buildTestTx = function(address, wif, network) {
  const _utxo = [{"value":20000,"tx_hash":"2bb1a6d807ddfd1614317028748a6feddc585255c105438e3fa7e6384e607944","height":358804,"tx_pos":0},{"value":20000,"tx_hash":"764cb67ef9d92942b0a3ef5f9c62ad2a552de07f575e1ab935c3cf45ace00cc8","height":400118,"tx_pos":0},{"value":20000,"tx_hash":"3f7da2daef2ea59fd40eb28d2be04a17839f2073c16ea291b1b03a3d799fec3b","height":427959,"tx_pos":0},{"value":20000,"tx_hash":"aa4afdece59c46a6a1e34d6ae7bf2c46b282de0ce6ef1753e8766c08e87bdb36","height":428139,"tx_pos":0},{"value":20000,"tx_hash":"3ec5e982083ffc617aaa75e68e69f9da5f07faadcd870e144f6451c34936ee24","height":428216,"tx_pos":0},{"value":20000,"tx_hash":"b943330cb034f36c6d9f03c57a2e1f0a3970378825336b505d51d1f2561af3fe","height":433459,"tx_pos":0},{"value":100000,"tx_hash":"7fee95da75e9b77bf9cd03b460fcf04c31ce4dbe4bdfa1e66256c9beb1fe2308","height":459573,"tx_pos":0},{"value":20000,"tx_hash":"aa92df15b20a10543750db58fc6e885205d1eee3438ef79f01d3c4ec2616e7aa","height":505916,"tx_pos":0},{"value":90000,"tx_hash":"aa92df15b20a10543750db58fc6e885205d1eee3438ef79f01d3c4ec2616e7aa","height":505916,"tx_pos":1},{"value":20000,"tx_hash":"dd1ab56c0e3f63e3650aeca3e2aa4ecea54cca22e97932e48341e299c4640ef9","height":505931,"tx_pos":0},{"value":100000,"tx_hash":"dd1ab56c0e3f63e3650aeca3e2aa4ecea54cca22e97932e48341e299c4640ef9","height":505931,"tx_pos":1},{"value":20000,"tx_hash":"7bed6729de8be9b61b85716d8d1615d751c1dbb2bd2defd6f9c76354a591586c","height":505937,"tx_pos":0},{"value":70000,"tx_hash":"7bed6729de8be9b61b85716d8d1615d751c1dbb2bd2defd6f9c76354a591586c","height":505937,"tx_pos":1},{"value":20000,"tx_hash":"f47f4d5e2aaee19f98ebdf97deac3c471b919b71312a073d1b45dfc27fb64d24","height":506038,"tx_pos":0},{"value":20000,"tx_hash":"e8a92b174b768a050b4801ea497cdb9651d4647f20ec5a77b5af0d6558fdf468","height":506045,"tx_pos":0},{"value":20000,"tx_hash":"758ae45606ee43b55d72ec57284abac54c34b34badf4986b3d9e53e5aaf227d8","height":506057,"tx_pos":0}];

  var key = bitcoinJS.ECPair.fromWIF('UrA1TCN2j9iMYKBLkKGMo9MbndBNYVW9nJV9RdViR9CoVK82ApFb', electrumJSNetworks['komodo']);
  var tx = new bitcoinJS.TransactionBuilder(electrumJSNetworks['komodo']);
  console.log(key);
  console.log(key.getAddress().toString());

  // electrumServers[].txfee
  const _txSize = shepherd.estimateTxSize(1, 1);
  const _feeEstimateByte = shepherd.estimateFee('small');
  const _feeEstimateTx = Math.floor(_txSize * _feeEstimateByte);
  console.log('output val ' + (20000 - _feeEstimateTx));

  // 20000
  tx.addInput('2bb1a6d807ddfd1614317028748a6feddc585255c105438e3fa7e6384e607944', 0);
  tx.addOutput('RDbGxL8QYdEp8sMULaVZS2E6XThcTKT9Jd', 20000 - _feeEstimateTx);

  console.log('estimate tx size ' + _txSize);
  console.log('fee per byte ' + _feeEstimateByte);
  console.log('tx fee ' + _feeEstimateTx);
  console.log(tx);
  // (in)15000 - (out)12000 = (fee)3000, this is the miner fee

  tx.sign(0, key);
  const rawtx = tx.build().toHex();
  console.log(rawtx);

  return rawtx;
}*/

shepherd.get('/electrum/pushtx', function(req, res, next) {
  const rawtx = req.query.rawtx;
  const ecl = new electrumJSCore(electrumServers[req.query.network].port, electrumServers[req.query.network].address, electrumServers[req.query.network].proto); // tcp or tls

  ecl.connect();
  ecl.blockchainTransactionBroadcast(rawtx)
  .then((json) => {
    ecl.close();
    console.log('electrum pushtx ==>');
    console.log(json);

    const successObj = {
      'msg': 'success',
      'result': {
        txid: json,
      },
    };

    res.end(JSON.stringify(successObj));
  });
});

shepherd.get('/electrum/listunspent', function(req, res, next) {
  const ecl = new electrumJSCore(electrumServers[req.query.network].port, electrumServers[req.query.network].address, electrumServers[req.query.network].proto); // tcp or tls

  ecl.connect();
  ecl.blockchainAddressListunspent(req.query.address)
  .then((json) => {
    ecl.close();
    console.log('electrum listunspent ==>');

    const successObj = {
      'msg': 'success',
      'result': {
        listunspent: json,
      },
    };

    res.end(JSON.stringify(successObj));
  });
});

shepherd.get('/electrum/estimatefee', function(req, res, next) {
  const ecl = new electrumJSCore(electrumServers[req.query.network].port, electrumServers[req.query.network].address, electrumServers[req.query.network].proto); // tcp or tls

  ecl.connect();
  ecl.blockchainEstimatefee(req.query.blocks)
  .then((json) => {
    ecl.close();
    console.log('electrum estimatefee ==>');

    const successObj = {
      'msg': 'success',
      'result': {
        estimatefee: json,
      },
    };

    res.end(JSON.stringify(successObj));
  });
});

shepherd.estimateTxSize = function(numVins, numOuts) {
  // in x 180 + out x 34 + 10 plus or minus in
  return numVins * 180 + numOuts * 34 + 11;
}

shepherd.estimateFee = function(type) {
  return 20;

  if (type === 'small') {
    return 0.00005 / 1024 * 100000000;
  }
  if (type === 'medium') {
    return 0.0001 / 1024 * 100000000;
  }
  if (type === 'high') {
    return 0.0003 / 1024 * 100000000;
  }
}

/*
 *  list native coind
 *  type:
 *  params:
 */
shepherd.get('/coind/list', function(req, res, next) {
  const successObj = {
    'msg': 'success',
    'result': shepherd.nativeCoindList,
  };

  res.end(JSON.stringify(successObj));
});

shepherd.scanNativeCoindBins = function() {
  let nativeCoindList = {};

  // check if coind bins are present in agama
  for (let key in nativeCoind) {
    nativeCoindList[key] = {
      name: nativeCoind[key].name,
      port: nativeCoind[key].port,
      bin: nativeCoind[key].bin,
      bins: {
        daemon: false,
        cli: false,
      },
    };

    if (fs.existsSync(`${coindRootDir}/${key}/${nativeCoind[key].bin}d${os.platform() === 'win32' ? '.exe' : ''}`)) {
      nativeCoindList[key].bins.daemon = true;
    }

    if (fs.existsSync(`${coindRootDir}/${key}/${nativeCoind[key].bin}-cli${os.platform() === 'win32' ? '.exe' : ''}`)) {
      nativeCoindList[key].bins.cli = true;
    }
  }

  return nativeCoindList;
}

shepherd.getAppRuntimeLog = function() {
  return new Promise((resolve, reject) => {
    resolve(appRuntimeLog);
  });
};

shepherd.log = function(msg) {
  if (shepherd.appConfig.dev ||
      shepherd.appConfig.debug) {
    console.log(msg);
  }

  appRuntimeLog.push({
    time: Date.now(),
    msg: msg,
  });
};

shepherd.startKMDNative = function(selection, isManual) {
  if (isManual) {
    shepherd.kmdMainPassiveMode = true;
  }

  if (selection === 'KMD') {
    const herdData = {
      'ac_name': 'komodod',
      'ac_options': [
        '-daemon=0',
        '-addnode=78.47.196.146',
      ],
    };

    const options = {
      url: `http://127.0.0.1:${shepherd.appConfig.agamaPort}/shepherd/herd`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'herd': 'komodod',
        'options': herdData,
      })
    };

    request(options, function(error, response, body) {
      if (response &&
          response.statusCode &&
          response.statusCode === 200) {
        //resolve(body);
      } else {
        //resolve(body);
      }
    });
  } else {
    const herdData = [{
      'ac_name': 'komodod',
      'ac_options': [
        '-daemon=0',
        '-addnode=78.47.196.146',
      ]
    }, {
      'ac_name': 'REVS',
      'ac_options': [
        '-daemon=0',
        '-server',
        `-ac_name=REVS`,
        '-addnode=78.47.196.146',
        '-ac_supply=1300000'
      ]
    }, {
      'ac_name': 'JUMBLR',
      'ac_options': [
        '-daemon=0',
        '-server',
        `-ac_name=JUMBLR`,
        '-addnode=78.47.196.146',
        '-ac_supply=999999'
      ]
    }];

    for (let i = 0; i < herdData.length; i++) {
      setTimeout(() => {
        const options = {
          url: `http://127.0.0.1:${shepherd.appConfig.agamaPort}/shepherd/herd`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            'herd': 'komodod',
            'options': herdData[i],
          })
        };

        request(options, function(error, response, body) {
          if (response &&
              response.statusCode &&
              response.statusCode === 200) {
            //resolve(body);
          } else {
            //resolve(body);
          }
        });
      }, 100);
    }
  }
};

/*
 *  Combined native dashboard update same as in gui
 *  type: GET
 *  params: coin
 */
shepherd.post('/native/dashboard/update', function(req, res, next) {
  let _returnObj;
  let _promiseStack;
  const _coin = req.body.coin;

  if (_coin === 'CHIPS') {
    _returnObj = {
      getinfo: {},
      listtransactions: [],
      getbalance: {},
      listunspent: {},
      addresses: {},
    };
    _promiseStack = [
      'getinfo',
      'listtransactions',
      'getbalance',
    ];
  } else {
    _returnObj = {
      getinfo: {},
      listtransactions: [],
      z_gettotalbalance: {},
      z_getoperationstatus: {},
      listunspent: {},
      addresses: {},
    };
    _promiseStack = [
      'getinfo',
      'listtransactions',
      'z_gettotalbalance',
      'z_getoperationstatus'
    ];
  }

  function getAddressesNative(coin) {
    const type = [
      'public',
      'private'
    ];

    if (coin === 'CHIPS') {
      type.pop();
    }

    Promise.all(type.map((_type, index) => {
      return new Promise((resolve, reject) => {
        _bitcoinRPC(
          coin,
          _type === 'public' ? 'getaddressesbyaccount' : 'z_listaddresses',
          ['']
        ).then(function(_json) {
          if (_json === 'Work queue depth exceeded' ||
              !_json) {
            resolve({ error: 'daemon is busy' });
          } else {
            resolve(JSON.parse(_json).result);
          }
        });
      });
    }))
    .then(result => {
      if (result[0] && result[0].length) {
        function calcBalance(result, json) {
          if (json &&
              json.length) {
            const allAddrArray = json.map(res => res.address).filter((x, i, a) => a.indexOf(x) == i);

            for (let a = 0; a < allAddrArray.length; a++) {
              const filteredArray = json.filter(res => res.address === allAddrArray[a]).map(res => res.amount);

              let isNewAddr = true;
              for (let x = 0; x < result.length && isNewAddr; x++) {
                for (let y = 0; y < result[x].length && isNewAddr; y++) {
                  if (allAddrArray[a] === result[x][y]) {
                    isNewAddr = false;
                  }
                }
              }

              if (isNewAddr &&
                  (allAddrArray[a].substring(0, 2) === 'zc' ||
                  allAddrArray[a].substring(0, 2) === 'zt')) {
                result[1][result[1].length] = allAddrArray[a];
              } else {
                result[0][result[0].length] = allAddrArray[a];
              }
            }
          }

          // remove addr duplicates
          if (result[0] &&
              result[0].length) {
            result[0] = result[0].filter(function(elem, pos) {
              return result[0].indexOf(elem) === pos;
            });
          }
          if (result[1] &&
              result[1].length) {
            result[1] = result[1].filter(function(elem, pos) {
              return result[1].indexOf(elem) === pos;
            });
          }

          let newAddressArray = [];
          for (let a = 0; a < result.length; a++) {
            newAddressArray[a] = [];

            if (result[a]) {
              for (let b = 0; b < result[a].length; b++) {
                let filteredArray;

                filteredArray = json.filter(res => res.address === result[a][b]).map(res => res.amount);

                let sum = 0;
                for (let i = 0; i < filteredArray.length; i++) {
                  sum += filteredArray[i];
                }

                newAddressArray[a][b] = {
                  address: result[a][b],
                  amount: sum,
                  type: a === 0 ? 'public': 'private',
                };
              }
            }
          }

          // get zaddr balance
          if (result[1] &&
              result[1].length) {
            Promise.all(result[1].map((_address, index) => {
              return new Promise((resolve, reject) => {
                _bitcoinRPC(coin, 'z_getbalance', [_address])
                .then(function(__json) {
                  __json = JSON.parse(__json);
                  if (__json &&
                      __json.error) {
                    resolve(0);
                  } else {
                    resolve(__json.result)
                    newAddressArray[1][index] = {
                      address: _address,
                      amount: __json.result,
                      type: 'private',
                    };
                  }
                });
              });
            }))
            .then(zresult => {
              _returnObj.addresses = {
                public: newAddressArray[0],
                private: newAddressArray[1],
              };

              const returnObj = {
                msg: 'success',
                result: _returnObj,
              };

              res.end(JSON.stringify(returnObj));
            });
          } else {
            _returnObj.addresses = {
              public: newAddressArray[0],
              private: newAddressArray[1],
            };

            const returnObj = {
              msg: 'success',
              result: _returnObj,
            };

            res.end(JSON.stringify(returnObj));
          }
        }

        _bitcoinRPC(coin, 'listunspent')
        .then(function(__json) {
          if (__json === 'Work queue depth exceeded' ||
              !__json) {
            const returnObj = {
              msg: 'success',
              result: _returnObj,
            };

            res.end(JSON.stringify(returnObj));
          } else {
            _returnObj.listunspent = JSON.parse(__json);

            calcBalance(
              result,
              JSON.parse(__json).result
            );
          }
        });
      } else {
        _returnObj.addresses = {
          public: {},
          private: {},
        };

        const returnObj = {
          msg: 'success',
          result: _returnObj,
        };

        res.end(JSON.stringify(returnObj));
      }
    })
  }

  function _bitcoinRPC(coin, cmd, params) {
    return new Promise(function(resolve, reject) {
      let _payload;

      if (params) {
        _payload = {
          mode: null,
          chain: coin,
          cmd: cmd,
          params: params,
        };
      } else {
        _payload = {
          mode: null,
          chain: coin,
          cmd: cmd,
        };
      }

      const options = {
        url: `http://127.0.0.1:${shepherd.appConfig.agamaPort}/shepherd/cli`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload: _payload }),
        timeout: 60000,
      };

      request(options, function(error, response, body) {
        if (response &&
            response.statusCode &&
            response.statusCode === 200) {
          resolve(body);
        } else {
          resolve(body);
        }
      });
    });
  }

  Promise.all(_promiseStack.map((_call, index) => {
    let _params;
    if (_call === 'listtransactions') {
      _params = [
        '',
        300,
        0
      ];
    }
    return new Promise((resolve, reject) => {
      _bitcoinRPC(
        _coin,
        _call,
        _params
      )
      .then(function(json) {
        if (json === 'Work queue depth exceeded' ||
            !json) {
          _returnObj[_call] = { error: 'daemon is busy' };
        } else {
          _returnObj[_call] = JSON.parse(json);
        }
        resolve(json);
      });
    });
  }))
  .then(result => {
    getAddressesNative(_coin);
  });
});

shepherd.testClearAll = function() {
  return new Promise(function(resolve, reject) {
    fs.removeSync(`${iguanaTestDir}`);
    resolve('done');
  });
}

shepherd.testBins = function(daemonName) {
  return new Promise(function(resolve, reject) {
    const _bins = {
      komodod: komododBin,
      komodoCli: komodocliBin,
    };
    const _arg = null;
    let _pid;

    shepherd.log('testBins exec ' + _bins[daemonName]);

    if (!fs.existsSync(agamaTestDir)) {
      fs.mkdirSync(agamaTestDir);
    }

    try {
      _fs.access(`${agamaTestDir}/${daemonName}Test.log`, fs.constants.R_OK, function(err) {
        if (!err) {
          try {
            _fs.unlinkSync(`${agamaTestDir}/${daemonName}Test.log`);
          } catch (e) {}
        } else {
          shepherd.log(`path ${agamaTestDir}/${daemonName}Test.log doesnt exist`);
        }
      });
    } catch (e) {}

    if (daemonName === 'komodod') {
      try {
        _fs.access(`${iguanaTestDir}/debug.log`, fs.constants.R_OK, function(err) {
          if (!err) {
            _fs.unlinkSync(`${iguanaTestDir}/db.log`);
            _fs.unlinkSync(`${iguanaTestDir}/debug.log`);
            _fs.unlinkSync(`${iguanaTestDir}/komodo.conf`);
            _fs.unlinkSync(`${iguanaTestDir}/komodod.pid`);
            _fs.unlinkSync(`${iguanaTestDir}/komodostate`);
            _fs.unlinkSync(`${iguanaTestDir}/realtime`);
            _fs.unlinkSync(`${iguanaTestDir}/wallet.dat`);
            _fs.unlinkSync(`${iguanaTestDir}/.lock`);
            fs.removeSync(`${iguanaTestDir}/blocks`);
            fs.removeSync(`${iguanaTestDir}/chainstate`);
            fs.removeSync(`${iguanaTestDir}/database`);
            execKomodod();
          } else {
            shepherd.log(`test: nothing to remove in ${iguanaTestDir}`);
            execKomodod();
          }
        });
      } catch (e) {}

      function execKomodod() {
        let _komododTest = {
          port: 'unknown',
          start: 'unknown',
          getinfo: 'unknown',
          errors: {
            assertFailed: false,
            zcashParams: false,
          },
        };
        const _komodoConf = 'rpcuser=user83f3afba8d714993\n' +
          'rpcpassword=0d4430ca1543833e35bce5a0cc9e16b3\n' +
          'server=1\n' +
          'addnode=78.47.196.146\n' +
          'addnode=5.9.102.210\n' +
          'addnode=178.63.69.164\n' +
          'addnode=88.198.65.74\n' +
          'addnode=5.9.122.241\n' +
          'addnode=144.76.94.3\n' +
          'addnode=144.76.94.38\n' +
          'addnode=89.248.166.91\n' +
          'addnode=148.251.57.148\n' +
          'addnode=149.56.28.84\n' +
          'addnode=176.9.26.39\n' +
          'addnode=94.102.63.199\n' +
          'addnode=94.102.63.200\n' +
          'addnode=104.255.64.3\n' +
          'addnode=221.121.144.140\n' +
          'addnode=103.18.58.150\n' +
          'addnode=103.18.58.146\n' +
          'addnode=213.202.253.10\n' +
          'addnode=185.106.121.32\n' +
          'addnode=27.100.36.201\n';

        fs.writeFile(`${iguanaTestDir}/komodo.conf`, _komodoConf, function(err) {
          if (err) {
            shepherd.log(`test: error writing komodo conf in ${iguanaTestDir}`);
          }
        });

        portscanner.checkPortStatus('7771', '127.0.0.1', function(error, status) {
          // Status is 'open' if currently in use or 'closed' if available
          if (status === 'closed') {
            _komododTest.port = 'passed';
          } else {
            _komododTest.port = 'failed';
          }
        });

        /*pm2.connect(true,function(err) { //start up pm2 god
          if (err) {
            shepherd.error(err);
            process.exit(2);
          }

          pm2.start({
            script: komododBin, // path to binary
            name: 'komodod',
            exec_mode : 'fork',
            args: [
              '-daemon=0',
              '-addnode=78.47.196.146',
              `-datadir=${iguanaTestDir}/`
            ],
            output: `${iguanaTestDir}/komododTest.log`,
            mergeLogs: true,
          }, function(err, apps) {
            if (apps[0] &&
                apps[0].process &&
                apps[0].process.pid) {
              _komododTest.start = 'success';
              shepherd.log(`test: got komodod instance pid = ${apps[0].process.pid}`);
              shepherd.writeLog(`test: komodod started with pid ${apps[0].process.pid}`);
            } else {
              _komododTest.start = 'failed';
              shepherd.log(`unable to start komodod`);
            }

            pm2.disconnect(); // Disconnect from PM2
            if (err) {
              shepherd.writeLog(`test: error starting komodod`);
              shepherd.log(`komodod fork err: ${err}`);
              // throw err;
            }
          });
        });*/

        setTimeout(function() {
          const options = {
            url: `http://localhost:7771`,
            method: 'POST',
            auth: {
              user: 'user83f3afba8d714993',
              pass: '0d4430ca1543833e35bce5a0cc9e16b3',
            },
            body: JSON.stringify({
              agent: 'bitcoinrpc',
              method: 'getinfo',
            }),
          };

          request(options, function(error, response, body) {
            if (response &&
                response.statusCode &&
                response.statusCode === 200) {
              // res.end(body);
              shepherd.log(JSON.stringify(body, null, '\t'));
            } else {
              // res.end(body);
              shepherd.log(JSON.stringify(body, null, '\t'));
            }
          });
        }, 10000);

        setTimeout(function() {
          pm2.delete('komodod');
          resolve(_komododTest);
        }, 20000);
      }
      // komodod debug.log hooks

//"{\"result\":{\"version\":1000850,\"protocolversion\":170002,\"KMDversion\":\"0.1.1\",\"notarized\":0,\"notarizedhash\":\"0000000000000000000000000000000000000000000000000000000000000000\",\"notarizedtxid\":\"0000000000000000000000000000000000000000000000000000000000000000\",\"notarizedtxid_height\":\"mempool\",\"notarized_confirms\":0,\"walletversion\":60000,\"balance\":0.00000000,\"interest\":0.00000000,\"blocks\":128,\"longestchain\":472331,\"timeoffset\":0,\"tiptime\":1473827710,\"connections\":1,\"proxy\":\"\",\"difficulty\":1,\"testnet\":false,\"keypoololdest\":1504118047,\"keypoolsize\":101,\"paytxfee\":0.00000000,\"relayfee\":0.00000100,\"errors\":\"\"},\"error\":null,\"id\":null}\n"

      //2017-08-30 17:51:33 Error: Cannot find the Zcash network parameters in the following directory:
      //"/home/pbca/.zcash-params"
      //Please run 'zcash-fetch-params' or './zcutil/fetch-params.sh' and then restart.
      //EXCEPTION: St13runtime_error
      //Assertion failed.
      //2017-08-30 17:51:14 Using config file /home/pbca/.iguana/test/komodo.conf
      //2017-08-30 18:23:43 UpdateTip: new best=0a47c1323f393650f7221c217d19d149d002d35444f47fde61be2dd90fbde8e6  height=1  log2_work=5.0874628  tx=2  date=2016-09-13 19:04:01 progress=0.000001  cache=0.0MiB(1tx)
      //2017-08-30 18:23:43 UpdateTip: new best=05076a4e1fc9af0f5fda690257b17ae20c12d4796dfba1624804d012c9ec00be  height=2  log2_work=5.6724253  tx=3  date=2016-09-13 19:05:28 progress=0.000001  cache=0.0MiB(2tx)

      /*execFile(`${komododBin}`, _arg, {
        maxBuffer: 1024 * 10000 // 10 mb
      }, function(error, stdout, stderr) {
        shepherd.writeLog(`stdout: ${stdout}`);
        shepherd.writeLog(`stderr: ${stderr}`);

        if (error !== null) {
          console.log(`exec error: ${error}`);
          shepherd.writeLog(`exec error: ${error}`);

          if (error.toString().indexOf('using -reindex') > -1) {
            shepherd.io.emit('service', {
              komodod: {
                error: 'run -reindex',
              }
            });
          }
        }
      });*/
    }
  });
}

// komodod datadir location test
shepherd.testLocation = function(path) {
  return new Promise(function(resolve, reject) {
    fs.lstat(path, (err, stats) => {
      if (err) {
        shepherd.log(`error testing path ${path}`);
        resolve(-1);
      } else {
        if (stats.isDirectory()) {
          resolve(true);
        } else {
          shepherd.log(`error testing path ${path} not a folder`);
          resolve(false);
        }
      }
    });
  });
}

// osx and linux
shepherd.binFixRights = function() {
  const osPlatform = os.platform();
  const _bins = [
    komododBin,
    komodocliBin
  ];

  if (osPlatform === 'darwin' ||
      osPlatform === 'linux') {
    for (let i = 0; i < _bins.length; i++) {
      _fs.stat(_bins[i], function(err, stat) {
        if (!err) {
          if (parseInt(stat.mode.toString(8), 10) !== 100775) {
            shepherd.log(`${_bins[i]} fix permissions`);
            fsnode.chmodSync(_bins[i], '0775');
          }
        } else {
          shepherd.log(`error: ${_bins[i]} not found`);
        }
      });
    }
  }
}

shepherd.killRogueProcess = function(processName) {
  // kill rogue process copies on start
  let processGrep;
  const osPlatform = os.platform();

  switch (osPlatform) {
    case 'darwin':
      processGrep = "ps -p $(ps -A | grep -m1 " + processName + " | awk '{print $1}') | grep -i " + processName;
      break;
    case 'linux':
      processGrep = 'ps -p $(pidof ' + processName + ') | grep -i ' + processName;
      break;
    case 'win32':
      processGrep = 'tasklist';
      break;
  }

  exec(processGrep, function(error, stdout, stderr) {
    if (stdout.indexOf(processName) > -1) {
      const pkillCmd = osPlatform === 'win32' ? `taskkill /f /im ${processName}.exe` : `pkill -15 ${processName}`;

      shepherd.log(`found another ${processName} process(es)`);
      shepherd.writeLog(`found another ${processName} process(es)`);

      exec(pkillCmd, function(error, stdout, stderr) {
        shepherd.log(`${pkillCmd} is issued`);
        shepherd.writeLog(`${pkillCmd} is issued`);

        if (error !== null) {
          shepherd.log(`${pkillCmd} exec error: ${error}`);
          shepherd.writeLog(`${pkillCmd} exec error: ${error}`);
        };
      });
    }

    if (error !== null) {
      shepherd.log(`${processGrep} exec error: ${error}`);
      shepherd.writeLog(`${processGrep} exec error: ${error}`);
    };
  });
}

shepherd.zcashParamsExist = function() {
  let _checkList = {
    rootDir: _fs.existsSync(zcashParamsDir),
    provingKey: _fs.existsSync(`${zcashParamsDir}/sprout-proving.key`),
    provingKeySize: false,
    verifyingKey: _fs.existsSync(`${zcashParamsDir}/sprout-verifying.key`),
    verifyingKeySize: false,
    errors: false,
  };

  if (_checkList.rootDir &&
      _checkList.provingKey &&
      _checkList.verifyingKey) {
    // verify each key size
    const _provingKeySize = fs.lstatSync(`${zcashParamsDir}/sprout-proving.key`);
    const _verifyingKeySize = fs.lstatSync(`${zcashParamsDir}/sprout-verifying.key`);

    if (_provingKeySize.size === 910173851) {
      _checkList.provingKeySize = true;
    }
    if (_verifyingKeySize.size === 1449) {
      _checkList.verifyingKeySize = true;
    }

    shepherd.log('zcashparams exist');
  } else {
    shepherd.log('zcashparams doesnt exist');
  }

  if (!_checkList.rootDir ||
      !_checkList.provingKey ||
      !_checkList.verifyingKey ||
      !_checkList.provingKeySize ||
      !_checkList.verifyingKeySize) {
    _checkList.errors = true;
  }

  return _checkList;
}

shepherd.readVersionFile = function() {
  // read app version
  const rootLocation = path.join(__dirname, '../');
  const localVersionFile = fs.readFileSync(`${rootLocation}version`, 'utf8');

  return localVersionFile;
}

shepherd.writeLog = function(data) {
  const logLocation = `${agamaDir}/shepherd`;
  const timeFormatted = new Date(Date.now()).toLocaleString('en-US', { hour12: false });

  if (shepherd.appConfig.debug) {
    if (fs.existsSync(`${logLocation}/agamalog.txt`)) {
      fs.appendFile(`${logLocation}/agamalog.txt`, `${timeFormatted}  ${data}\r\n`, function(err) {
        if (err) {
          shepherd.log('error writing log file');
        }
      });
    } else {
      fs.writeFile(`${logLocation}/agamalog.txt`, `${timeFormatted}  ${data}\r\n`, function(err) {
        if (err) {
          shepherd.log('error writing log file');
        }
      });
    }
  }
}

shepherd.createAgamaDirs = function() {
  if (!fs.existsSync(agamaDir)) {
    fs.mkdirSync(agamaDir);

    if (fs.existsSync(agamaDir)) {
      shepherd.log(`created agama folder at ${agamaDir}`);
      shepherd.writeLog(`created agama folder at ${agamaDir}`);
    }
  } else {
    shepherd.log('agama folder already exists');
  }

  if (!fs.existsSync(`${agamaDir}/shepherd`)) {
    fs.mkdirSync(`${agamaDir}/shepherd`);

    if (fs.existsSync(`${agamaDir}/shepherd`)) {
      shepherd.log(`created shepherd folder at ${agamaDir}/shepherd`);
      shepherd.writeLog(`create shepherd folder at ${agamaDir}/shepherd`);
    }
  } else {
    shepherd.log('agama/shepherd folder already exists');
  }

  if (!fs.existsSync(`${agamaDir}/shepherd/pin`)) {
    fs.mkdirSync(`${agamaDir}/shepherd/pin`);

    if (fs.existsSync(`${agamaDir}/shepherd/pin`)) {
      shepherd.log(`created pin folder at ${agamaDir}/shepherd/pin`);
      shepherd.writeLog(`create pin folder at ${agamaDir}/shepherd/pin`);
    }
  } else {
    shepherd.log('shepherd/pin folder already exists');
  }
}

/*
 *  type: POST
 *  params: none
 */
shepherd.post('/encryptkey', function(req, res, next) {
  if (req.body.key &&
      req.body.string &&
      req.body.pubkey) {
    const encryptedString = aes256.encrypt(req.body.key, req.body.string);

    // test pin security
    // - at least 1 char in upper case
    // - at least 1 digit
    // - at least one special character
    // - min length 8

    const _pin = req.body.key;
    const _pinTest = _pin.match('^(?=.*[A-Z])(?=.*[^<>{}\"/|;:.,~!?@#$%^=&*\\]\\\\()\\[_+]*$)(?=.*[0-9])(?=.*[a-z]).{8}$');

    fs.writeFile(`${agamaDir}/shepherd/pin/${req.body.pubkey}.pin`, encryptedString, function(err) {
      if (err) {
        shepherd.log('error writing pin file');
      }

      const returnObj = {
        msg: 'success',
        result: encryptedString,
      };

      res.end(JSON.stringify(returnObj));
    });
  } else {
    let errorObj = {
      msg: 'error',
      result: '',
    };
    const _paramsList = [
      'key',
      'string',
      'pubkey'
    ];
    let _errorParamsList = [];

    for (let i = 0; i < _paramsList.length; i++) {
      if (!req.query[_paramsList[i]]) {
        _errorParamsList.push(_paramsList[i]);
      }
    }

    errorObj.result = `missing param ${_errorParamsList.join(', ')}`;
    res.end(JSON.stringify(errorObj));
  }
});

shepherd.post('/decryptkey', function(req, res, next) {
  if (req.body.key &&
      req.body.pubkey) {
    if (fs.existsSync(`${agamaDir}/shepherd/pin/${req.body.pubkey}.pin`)) {
      fs.readFile(`${agamaDir}/shepherd/pin/${req.body.pubkey}.pin`, 'utf8', function(err, data) {
        if (err) {
          const errorObj = {
            msg: 'error',
            result: err,
          };

          res.end(JSON.stringify(errorObj));
        } else {
          const encryptedKey = aes256.decrypt(req.body.key, data);
          // test if stored encrypted passphrase is decrypted correctly
          // if not then the key is wrong
          const _regexTest = encryptedKey.match(/^[0-9a-zA-Z ]+$/g);
          let returnObj;

          if (!_regexTest) {
            returnObj = {
              msg: 'error',
              result: 'wrong key',
            };
          } else {
            returnObj = {
              msg: 'success',
              result: encryptedKey,
            };
          }

          res.end(JSON.stringify(returnObj));
        }
      });
    } else {
      const errorObj = {
        msg: 'error',
        result: `file ${req.query.pubkey}.pin doesnt exist`,
      };

      res.end(JSON.stringify(errorObj));
    }
  } else {
    const errorObj = {
      msg: 'error',
      result: 'missing key or pubkey param',
    };

    res.end(JSON.stringify(errorObj));
  }
});

shepherd.get('/getpinlist', function(req, res, next) {
  if (fs.existsSync(`${agamaDir}/shepherd/pin`)) {
    fs.readdir(`${agamaDir}/shepherd/pin`, function(err, items) {
      let _pins = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].substr(items[i].length - 4, 4) === '.pin') {
          _pins.push(items[i].substr(0, items[i].length - 4));
        }
      }

      if (!items.length) {
        const errorObj = {
          msg: 'error',
          result: 'no pins',
        };

        res.end(JSON.stringify(errorObj));
      } else {
        const successObj = {
          msg: 'success',
          result: _pins,
        };

        res.end(JSON.stringify(successObj));
      }
    });
  } else {
    const errorObj = {
      msg: 'error',
      result: 'pin folder doesnt exist',
    };

    res.end(JSON.stringify(errorObj));
  }
});

/**
 * Promise based download file method
 */
function downloadFile(configuration) {
  return new Promise(function(resolve, reject) {
    // Save variable to know progress
    let receivedBytes = 0;
    let totalBytes = 0;

    let req = request({
      method: 'GET',
      uri: configuration.remoteFile,
      agentOptions: {
        keepAlive: true,
        keepAliveMsecs: 15000,
      },
    });

    let out = fs.createWriteStream(configuration.localFile);
    req.pipe(out);

    req.on('response', function(data) {
      // Change the total bytes value to get progress later.
      totalBytes = parseInt(data.headers['content-length']);
    });

    // Get progress if callback exists
    if (configuration.hasOwnProperty('onProgress')) {
      req.on('data', function(chunk) {
        // Update the received bytes
        receivedBytes += chunk.length;
        configuration.onProgress(receivedBytes, totalBytes);
      });
    } else {
      req.on('data', function(chunk) {
        // Update the received bytes
        receivedBytes += chunk.length;
      });
    }

    req.on('end', function() {
      resolve();
    });
  });
}

const remoteBinLocation = {
  win32: 'https://artifacts.supernet.org/latest/windows/',
  darwin: 'https://artifacts.supernet.org/latest/osx/',
  linux: 'https://artifacts.supernet.org/latest/linux/',
};
const localBinLocation = {
  win32: 'assets/bin/win64/',
  darwin: 'assets/bin/osx/',
  linux: 'assets/bin/linux64/',
};
const latestBins = {
  win32: [
    'komodo-cli.exe',
    'komodod.exe',
    'libcrypto-1_1.dll',
    'libcurl-4.dll',
    'libcurl.dll',
    'libgcc_s_sjlj-1.dll',
    'libnanomsg.dll',
    'libssl-1_1.dll',
    'libwinpthread-1.dll',
    'nanomsg.dll',
    'pthreadvc2.dll',
  ],
  darwin: [
    'komodo-cli',
    'komodod',
    'libgcc_s.1.dylib',
    'libgomp.1.dylib',
    'libnanomsg.5.0.0.dylib',
    'libstdc++.6.dylib', // encode %2B
  ],
  linux: [
    'komodo-cli',
    'komodod',
  ],
};

let binsToUpdate = [];

/*
 *  Check bins file size
 *  type:
 *  params:
 */
shepherd.get('/update/bins/check', function(req, res, next) {
  const rootLocation = path.join(__dirname, '../');
  const successObj = {
    msg: 'success',
    result: 'bins',
  };

  res.end(JSON.stringify(successObj));

  const _os = os.platform();
  shepherd.log(`checking bins: ${_os}`);

  shepherd.io.emit('patch', {
    patch: {
      type: 'bins-check',
      status: 'progress',
      message: `checking bins: ${_os}`,
    },
  });
  // get list of bins/dlls that can be updated to the latest
  for (let i = 0; i < latestBins[_os].length; i++) {
    remoteFileSize(remoteBinLocation[_os] + latestBins[_os][i], function(err, remoteBinSize) {
      const localBinSize = fs.statSync(rootLocation + localBinLocation[_os] + latestBins[_os][i]).size;

      shepherd.log('remote url: ' + (remoteBinLocation[_os] + latestBins[_os][i]) + ' (' + remoteBinSize + ')');
      shepherd.log('local file: ' + (rootLocation + localBinLocation[_os] + latestBins[_os][i]) + ' (' + localBinSize + ')');

      if (remoteBinSize !== localBinSize) {
        shepherd.log(`${latestBins[_os][i]} can be updated`);
        binsToUpdate.push({
          name: latestBins[_os][i],
          rSize: remoteBinSize,
          lSize: localBinSize,
        });
      }

      if (i === latestBins[_os].length - 1) {
        shepherd.io.emit('patch', {
          patch: {
            type: 'bins-check',
            status: 'done',
            fileList: binsToUpdate,
          },
        });
      }
    });
  }
});

/*
 *  Update bins
 *  type:
 *  params:
 */
shepherd.get('/update/bins', function(req, res, next) {
  const rootLocation = path.join(__dirname, '../');
  const _os = os.platform();
  const successObj = {
    msg: 'success',
    result: {
      filesCount: binsToUpdate.length,
      list: binsToUpdate,
    },
  };

  res.end(JSON.stringify(successObj));

  for (let i = 0; i < binsToUpdate.length; i++) {
    downloadFile({
      remoteFile: remoteBinLocation[_os] + binsToUpdate[i].name,
      localFile: `${rootLocation}${localBinLocation[_os]}patch/${binsToUpdate[i].name}`,
      onProgress: function(received, total) {
        const percentage = (received * 100) / total;
        shepherd.io.emit('patch', {
          msg: {
            type: 'bins-update',
            status: 'progress',
            file: binsToUpdate[i].name,
            bytesTotal: total,
            bytesReceived: received,
          },
        });
        shepherd.log(`${binsToUpdate[i].name} ${percentage}% | ${received} bytes out of ${total} bytes.`);
      }
    })
    .then(function() {
      // verify that remote file is matching to DL'ed file
      const localBinSize = fs.statSync(`${rootLocation}${localBinLocation[_os]}patch/${binsToUpdate[i].name}`).size;
      shepherd.log('compare dl file size');

      if (localBinSize === binsToUpdate[i].rSize) {
        shepherd.io.emit('patch', {
          msg: {
            type: 'bins-update',
            file: binsToUpdate[i].name,
            status: 'done',
          },
        });
        shepherd.log(`file ${binsToUpdate[i].name} succesfully downloaded`);
      } else {
        shepherd.io.emit('patch', {
          msg: {
            type: 'bins-update',
            file: binsToUpdate[i].name,
            message: 'size mismatch',
          },
        });
        shepherd.log(`error: ${binsToUpdate[i].name} file size doesnt match remote!`);
      }
    });
  }
});

/*
 *  DL app patch
 *  type: GET
 *  params: patchList
 */
shepherd.get('/update/patch', function(req, res, next) {
  const successObj = {
    msg: 'success',
    result: 'dl started'
  };

  res.end(JSON.stringify(successObj));

  shepherd.updateAgama();
});

shepherd.updateAgama = function() {
  const rootLocation = path.join(__dirname, '../');

  downloadFile({
    remoteFile: 'https://github.com/pbca26/dl-test/raw/master/patch.zip',
    localFile: `${rootLocation}patch.zip`,
    onProgress: function(received, total) {
      const percentage = (received * 100) / total;
      if (Math.floor(percentage) % 5 === 0 ||
          Math.floor(percentage) % 10 === 0) {
        shepherd.log(`patch ${percentage}% | ${received} bytes out of ${total} bytes.`);
        shepherd.io.emit('patch', {
          msg: {
            status: 'progress',
            type: 'ui',
            progress: percentage,
            bytesTotal: total,
            bytesReceived: received,
          },
        });
      }
    }
  })
  .then(function() {
    remoteFileSize('https://github.com/pbca26/dl-test/raw/master/patch.zip', function(err, remotePatchSize) {
      // verify that remote file is matching to DL'ed file
      const localPatchSize = fs.statSync(`${rootLocation}patch.zip`).size;
      shepherd.log('compare dl file size');

      if (localPatchSize === remotePatchSize) {
        const zip = new AdmZip(`${rootLocation}patch.zip`);

        shepherd.log('patch succesfully downloaded');
        shepherd.log('extracting contents');

        if (shepherd.appConfig.dev) {
          if (!fs.existsSync(`${rootLocation}/patch`)) {
            fs.mkdirSync(`${rootLocation}/patch`);
          }
        }

        zip.extractAllTo(/*target path*/rootLocation + (shepherd.appConfig.dev ? '/patch' : ''), /*overwrite*/true);
        // TODO: extract files in chunks
        shepherd.io.emit('patch', {
          msg: {
            type: 'ui',
            status: 'done',
          },
        });
        fs.unlinkSync(`${rootLocation}patch.zip`);
      } else {
        shepherd.io.emit('patch', {
          msg: {
            type: 'ui',
            status: 'error',
            message: 'size mismatch',
          },
        });
        shepherd.log('patch file size doesnt match remote!');
      }
    });
  });
}

/*
 *  check latest version
 *  type:
 *  params:
 */
shepherd.get('/update/patch/check', function(req, res, next) {
  const rootLocation = path.join(__dirname, '../');
  const options = {
    url: 'https://github.com/pbca26/dl-test/raw/master/version',
    method: 'GET',
  };

  request(options, function(error, response, body) {
    if (response &&
        response.statusCode &&
        response.statusCode === 200) {
      const remoteVersion = body.split('\n');
      const localVersionFile = fs.readFileSync(`${rootLocation}version`, 'utf8');
      let localVersion;

      if (localVersionFile.indexOf('\r\n') > -1) {
        localVersion = localVersionFile.split('\r\n');
      } else {
        localVersion = localVersionFile.split('\n');
      }

      if (remoteVersion[0] === localVersion[0]) {
        const successObj = {
          msg: 'success',
          result: 'latest',
        };

        res.end(JSON.stringify(successObj));
      } else {
        const successObj = {
          msg: 'success',
          result: 'update',
          version: {
            local: localVersion[0],
            remote: remoteVersion[0],
          },
        };

        res.end(JSON.stringify(successObj));
      }
    } else {
      res.end({
        err: 'error getting update',
      });
    }
  });
});

/*
 *  unpack zip
 *  type:
 *  params:
 */
shepherd.get('/unpack', function(req, res, next) {
  const dlLocation = path.join(__dirname, '../');
  const zip = new AdmZip(`${dlLocation}patch.zip`);
  zip.extractAllTo(/*target path*/ `${dlLocation}/patch/unpack`, /*overwrite*/true);

  const successObj = {
    msg: 'success',
    result: 'unpack started',
  };

  res.end(JSON.stringify(successObj));
});

/*
 *  type: GET
 *
 */
shepherd.get('/coinslist', function(req, res, next) {
  if (fs.existsSync(`${agamaDir}/shepherd/coinslist.json`)) {
    fs.readFile(`${agamaDir}/shepherd/coinslist.json`, 'utf8', function(err, data) {
      if (err) {
        const errorObj = {
          msg: 'error',
          result: err,
        };

        res.end(JSON.stringify(errorObj));
      } else {
        const successObj = {
          msg: 'success',
          result: data ? JSON.parse(data) : '',
        };

        res.end(JSON.stringify(successObj));
      }
    });
  } else {
    const errorObj = {
      msg: 'error',
      result: 'coin list doesn\'t exist',
    };

    res.end(JSON.stringify(errorObj));
  }
});

/*
 *  type: POST
 *  params: payload
 */
shepherd.post('/guilog', function(req, res, next) {
  const logLocation = `${agamaDir}/shepherd`;

  if (!guiLog[shepherd.appSessionHash]) {
    guiLog[shepherd.appSessionHash] = {};
  }

  if (guiLog[shepherd.appSessionHash][req.body.timestamp]) {
    guiLog[shepherd.appSessionHash][req.body.timestamp].status = req.body.status;
    guiLog[shepherd.appSessionHash][req.body.timestamp].response = req.body.response;
  } else {
    guiLog[shepherd.appSessionHash][req.body.timestamp] = {
      function: req.body.function,
      type: req.body.type,
      url: req.body.url,
      payload: req.body.payload,
      status: req.body.status,
    };
  }

  fs.writeFile(`${logLocation}/agamalog.json`, JSON.stringify(guiLog), function(err) {
    if (err) {
      shepherd.writeLog('error writing gui log file');
    }

    const returnObj = {
      msg: 'success',
      result: 'gui log entry is added',
    };

    res.end(JSON.stringify(returnObj));
  });
});

/*
 *  type: GET
 *  params: type
 */
shepherd.get('/getlog', function(req, res, next) {
  const logExt = req.query.type === 'txt' ? 'txt' : 'json';

  if (fs.existsSync(`${agamaDir}/shepherd/agamalog.${logExt}`)) {
    fs.readFile(`${agamaDir}/shepherd/agamalog.${logExt}`, 'utf8', function(err, data) {
      if (err) {
        const errorObj = {
          msg: 'error',
          result: err,
        };

        res.end(JSON.stringify(errorObj));
      } else {
        const successObj = {
          msg: 'success',
          result: data ? JSON.parse(data) : '',
        };

        res.end(JSON.stringify(successObj));
      }
    });
  } else {
    const errorObj = {
      msg: 'error',
      result: `agama.${logExt} doesnt exist`,
    };

    res.end(JSON.stringify(errorObj));
  }
});

/*
 *  type: POST
 *  params: payload
 */
shepherd.post('/coinslist', function(req, res, next) {
  const _payload = req.body.payload;

  if (!_payload) {
    const errorObj = {
      msg: 'error',
      result: 'no payload provided',
    };

    res.end(JSON.stringify(errorObj));
  } else {
    fs.writeFile(`${agamaDir}/shepherd/coinslist.json`, JSON.stringify(_payload), function(err) {
      if (err) {
        const errorObj = {
          msg: 'error',
          result: err,
        };

        res.end(JSON.stringify(errorObj));
      } else {
        const successObj = {
          msg: 'success',
          result: 'done',
        };

        res.end(JSON.stringify(successObj));
      }
    });
  }
});

// TODO: check if komodod is running
shepherd.quitKomodod = function(timeout = 100) {
  // if komodod is under heavy load it may not respond to cli stop the first time
  // exit komodod gracefully
  let coindExitInterval = {};
  lockDownAddCoin = true;

  for (let key in coindInstanceRegistry) {
    const chain = key !== 'komodod' ? key : null;
    let _coindQuitCmd = komodocliBin;

     // any coind
    if (shepherd.nativeCoindList[key.toLowerCase()]) {
      _coindQuitCmd = `${coindRootDir}/${key.toLowerCase()}/${shepherd.nativeCoindList[key.toLowerCase()].bin.toLowerCase()}-cli`;
    }
    if (key === 'CHIPS') {
      _coindQuitCmd = chipscliBin;
    }

    function execCliStop() {
      let _arg = [];
      if (chain && !shepherd.nativeCoindList[key.toLowerCase()] && key !== 'CHIPS') {
        _arg.push(`-ac_name=${chain}`);
      }
      _arg.push('stop');
      execFile(`${_coindQuitCmd}`, _arg, function(error, stdout, stderr) {
        shepherd.log(`stdout: ${stdout}`);
        shepherd.log(`stderr: ${stderr}`);

        if (stdout.indexOf('EOF reached') > -1 ||
            stderr.indexOf('EOF reached') > -1 ||
            (error && error.toString().indexOf('Command failed') > -1 && !stderr) || // win "special snowflake" case
            stdout.indexOf('connect to server: unknown (code -1)') > -1 ||
            stderr.indexOf('connect to server: unknown (code -1)') > -1) {
          delete coindInstanceRegistry[key];
          clearInterval(coindExitInterval[key]);
        }

        if (error !== null) {
          shepherd.log(`exec error: ${error}`);
        }
        if (key === 'CHIPS') {
          shepherd.killRogueProcess('chips-cli');
        } else {
          shepherd.killRogueProcess('komodo-cli');
        }
      });
    }

    execCliStop();
    coindExitInterval[key] = setInterval(function() {
      execCliStop();
    }, timeout);
  }
}

shepherd.getConf = function(chain) {
  let _confLocation = chain === 'komodod' ? `${komodoDir}/komodo.conf` : `${komodoDir}/${chain}/${chain}.conf`;
  _confLocation = chain === 'CHIPS' ? `${chipsDir}/chips.conf` : _confLocation;

   // any coind
  if (shepherd.nativeCoindList[chain.toLowerCase()]) {
    const _osHome = os.platform === 'win32' ? process.env.APPDATA : process.env.HOME;
    let coindDebugLogLocation = `${_osHome}/.${shepherd.nativeCoindList[chain.toLowerCase()].bin.toLowerCase()}/debug.log`;

    _confLocation = `${_osHome}/.${shepherd.nativeCoindList[chain.toLowerCase()].bin.toLowerCase()}/${shepherd.nativeCoindList[chain.toLowerCase()].bin.toLowerCase()}.conf`;
  }

  if (fs.existsSync(_confLocation)) {
    let _port = assetChainPorts[chain];
    const _rpcConf = fs.readFileSync(_confLocation, 'utf8');

    // any coind
    if (shepherd.nativeCoindList[chain.toLowerCase()]) {
      _port = shepherd.nativeCoindList[chain.toLowerCase()].port;
    }

    if (_rpcConf.length) {
      let _match;
      let parsedRpcConfig = {
        user: '',
        pass: '',
        port: _port,
      };

      if (_match = _rpcConf.match(/rpcuser=\s*(.*)/)) {
        parsedRpcConfig.user = _match[1];
      }

      if ((_match = _rpcConf.match(/rpcpass=\s*(.*)/)) ||
          (_match = _rpcConf.match(/rpcpassword=\s*(.*)/))) {
        parsedRpcConfig.pass = _match[1];
      }

      if (shepherd.nativeCoindList[chain.toLowerCase()]) {
        rpcConf[chain] = parsedRpcConfig;
      } else {
        rpcConf[chain === 'komodod' ? 'KMD' : chain] = parsedRpcConfig;
      }
    } else {
      shepherd.log(`${_confLocation} is empty`);
    }
  } else {
    shepherd.log(`${_confLocation} doesnt exist`);
  }
}

/*
 *  type: POST
 *  params: payload
 */
shepherd.post('/cli', function(req, res, next) {
  if (!req.body.payload) {
    const errorObj = {
      msg: 'error',
      result: 'no payload provided',
    };

    res.end(JSON.stringify(errorObj));
  } else if (!req.body.payload.cmd.match(/^[0-9a-zA-Z _\,\.\[\]"'/\\]+$/g)) {
    const errorObj = {
      msg: 'error',
      result: 'wrong cli string format',
    };

    res.end(JSON.stringify(errorObj));
  } else {
    const _mode = req.body.payload.mode === 'passthru' ? 'passthru' : 'default';
    const _chain = req.body.payload.chain === 'KMD' ? null : req.body.payload.chain;
    let _cmd = req.body.payload.cmd;
    const _params = req.body.payload.params ? ` ${req.body.payload.params}` : '';

    if (!rpcConf[_chain]) {
      shepherd.getConf(req.body.payload.chain === 'KMD' ? 'komodod' : req.body.payload.chain);
    }

    if (_mode === 'default') {
      /*let _body = {
        agent: 'bitcoinrpc',
        method: _cmd,
      };

      if (req.body.payload.params) {
        _body = {
          agent: 'bitcoinrpc',
          method: _cmd,
          params: req.body.payload.params === ' ' ? [''] : req.body.payload.params,
        };
      }

      const options = {
        url: `http://localhost:${rpcConf[req.body.payload.chain].port}`,
        method: 'POST',
        auth: {
          user: rpcConf[req.body.payload.chain].user,
          pass: rpcConf[req.body.payload.chain].pass,
        },
        body: JSON.stringify(_body)
      };

      // send back body on both success and error
      // this bit replicates iguana core's behaviour
      request(options, function(error, response, body) {
        if (response &&
            response.statusCode &&
            response.statusCode === 200) {
          res.end(body);
        } else {
          res.end(body);
        }
      });*/
      if (_cmd === 'debug' && _chain !== 'CHIPS') {
        if (shepherd.nativeCoindList[_chain.toLowerCase()]) {
          const _osHome = os.platform === 'win32' ? process.env.APPDATA : process.env.HOME;
          let coindDebugLogLocation;

          if (_chain === 'CHIPS') {
            coindDebugLogLocation = `${chipsDir}/debug.log`;
          } else {
            coindDebugLogLocation = `${_osHome}/.${shepherd.nativeCoindList[_chain.toLowerCase()].bin.toLowerCase()}/debug.log`;
          }

          shepherd.readDebugLog(coindDebugLogLocation, 1)
          .then(function(result) {
            const _obj = {
              'msg': 'success',
              'result': result,
            };

            // shepherd.log('bitcoinrpc debug ====>');
            // console.log(result);

            res.end(JSON.stringify(_obj));
          }, function(result) {
            const _obj = {
              error: result,
              result: 'error',
            };

            res.end(JSON.stringify(_obj));
          });
        } else {
          res.end({
            error: 'bitcoinrpc debug error',
            result: 'error',
          });
          // console.log('bitcoinrpc debug error');
        }
      } else {
        if (_chain === 'CHIPS' &&
            _cmd === 'debug') {
          _cmd = 'getblockchaininfo';
        }

        let _body = {
          'agent': 'bitcoinrpc',
          'method': _cmd,
        };

        if (req.body.payload.params) {
          _body = {
            'agent': 'bitcoinrpc',
            'method': _cmd,
            'params': req.body.payload.params === ' ' ? [''] : req.body.payload.params,
          };
        }

        const options = {
          url: `http://localhost:${rpcConf[req.body.payload.chain].port}`,
          method: 'POST',
          auth: {
            'user': rpcConf[req.body.payload.chain].user,
            'pass': rpcConf[req.body.payload.chain].pass
          },
          body: JSON.stringify(_body)
        };

        // send back body on both success and error
        // this bit replicates iguana core's behaviour
        request(options, function (error, response, body) {
          if (response &&
              response.statusCode &&
              response.statusCode === 200) {
            res.end(body);
          } else {
            res.end(body);
          }
        });
      }
    } else {
      let _coindCliBin = komodocliBin + (_chain ? ' -ac_name=' + _chain : '') + ' ' + _cmd + _params;

      if (shepherd.nativeCoindList[_chain.toLowerCase()]) {
        _coindCliBin = `${coindRootDir}/${_chain.toLowerCase()}/${shepherd.nativeCoindList[_chain.toLowerCase()].bin.toLowerCase()}-cli`;
      }

      let _arg = (_chain ? ' -ac_name=' + _chain : '') + ' ' + _cmd + _params;
      _arg = _arg.trim().split(' ');
      execFile(_coindCliBin, _arg, function(error, stdout, stderr) {
        shepherd.log(`stdout: ${stdout}`);
        shepherd.log(`stderr: ${stderr}`);

        if (error !== null) {
          shepherd.log(`exec error: ${error}`);
        }

        let responseObj;

        if (stderr) {
          responseObj = {
            msg: 'error',
            result: stderr,
          };
        } else {
          responseObj = {
            msg: 'success',
            result: stdout,
          };
        }

        res.end(JSON.stringify(responseObj));
        shepherd.killRogueProcess('komodo-cli');
      });
    }
  }
});

/*
 *  type: POST
 *  params: payload
 */
shepherd.post('/appconf', function(req, res, next) {
  if (!req.body.payload) {
    const errorObj = {
      msg: 'error',
      result: 'no payload provided',
    };

    res.end(JSON.stringify(errorObj));
  } else {
    shepherd.saveLocalAppConf(req.body.payload);

    const successObj = {
      msg: 'success',
      result: 'config saved',
    };

    res.end(JSON.stringify(successObj));
  }
});

/*
 *  type: POST
 *  params: none
 */
shepherd.post('/appconf/reset', function(req, res, next) {
  shepherd.saveLocalAppConf(shepherd.defaultAppConfig);

  const successObj = {
    msg: 'success',
    result: 'config saved',
  };

  res.end(JSON.stringify(successObj));
});

shepherd.saveLocalAppConf = function(appSettings) {
  let appConfFileName = `${agamaDir}/config.json`;

  _fs.access(agamaDir, fs.constants.R_OK, function(err) {
    if (!err) {

      const FixFilePermissions = function() {
        return new Promise(function(resolve, reject) {
          const result = 'config.json file permissions updated to Read/Write';

          fsnode.chmodSync(appConfFileName, '0666');

          setTimeout(function() {
            shepherd.log(result);
            shepherd.writeLog(result);
            resolve(result);
          }, 1000);
        });
      }

      const FsWrite = function() {
        return new Promise(function(resolve, reject) {
          const result = 'config.json write file is done';

          fs.writeFile(appConfFileName,
                      JSON.stringify(appSettings)
                      .replace(/,/g, ',\n') // format json in human readable form
                      .replace(/:/g, ': ')
                      .replace(/{/g, '{\n')
                      .replace(/}/g, '\n}'), 'utf8', function(err) {
            if (err)
              return shepherd.log(err);
          });

          fsnode.chmodSync(appConfFileName, '0666');
          setTimeout(function() {
            shepherd.log(result);
            shepherd.log(`app conf.json file is created successfully at: ${agamaDir}`);
            shepherd.writeLog(`app conf.json file is created successfully at: ${agamaDir}`);
            resolve(result);
          }, 2000);
        });
      }

      FsWrite()
      .then(FixFilePermissions());
    }
  });
}

shepherd.loadLocalConfig = function() {
  if (fs.existsSync(`${agamaDir}/config.json`)) {
    let localAppConfig = fs.readFileSync(`${agamaDir}/config.json`, 'utf8');

    shepherd.log('app config set from local file');
    shepherd.writeLog('app config set from local file');

    // find diff between local and hardcoded configs
    // append diff to local config
    const compareJSON = function(obj1, obj2) {
      let result = {};

      for (let i in obj1) {
        if (!obj2.hasOwnProperty(i)) {
          result[i] = obj1[i];
        }
      }

      return result;
    };

    if (localAppConfig) {
      const compareConfigs = compareJSON(shepherd.appConfig, JSON.parse(localAppConfig));

      if (Object.keys(compareConfigs).length) {
        const newConfig = Object.assign(JSON.parse(localAppConfig), compareConfigs);

        shepherd.log('config diff is found, updating local config');
        shepherd.log('config diff:');
        shepherd.log(compareConfigs);
        shepherd.writeLog('aconfig diff is found, updating local config');
        shepherd.writeLog('config diff:');
        shepherd.writeLog(compareConfigs);

        shepherd.saveLocalAppConf(newConfig);
        return newConfig;
      } else {
        return JSON.parse(localAppConfig);
      }
    } else {
      return shepherd.appConfig;
    }
  } else {
    shepherd.log('local config file is not found!');
    shepherd.writeLog('local config file is not found!');
    shepherd.saveLocalAppConf(shepherd.appConfig);

    return shepherd.appConfig;
  }
};

shepherd.appConfig = shepherd.loadLocalConfig();

shepherd.log(`agama dir: ${agamaDir}`);
shepherd.log('--------------------------')
shepherd.log(`komodo dir: ${komododBin}`);
shepherd.log(`komodo bin: ${komodoDir}`);
shepherd.writeLog(`agama dir: ${agamaDir}`);
shepherd.writeLog(`komodo dir: ${komododBin}`);
shepherd.writeLog(`komodo bin: ${komodoDir}`);

// default route
shepherd.get('/', function(req, res, next) {
  res.send('Agama app server');
});

/*
 *  type: GET
 *
 */
shepherd.get('/appconf', function(req, res, next) {
  const obj = shepherd.loadLocalConfig();
  res.send(obj);
});

/*
 *  type: GET
 *
 */
shepherd.get('/sysinfo', function(req, res, next) {
  const obj = shepherd.SystemInfo();
  res.send(obj);
});

/*
 *  type: GET
 *
 */
shepherd.get('/appinfo', function(req, res, next) {
  const obj = shepherd.appInfo();
  res.send(obj);
});

// expose sockets obj
shepherd.setIO = function(io) {
  shepherd.io = io;
};

shepherd.setVar = function(_name, _body) {
  shepherd[_name] = _body;
};

/*
 *  type: GET
 *
 */
shepherd.get('/InstantDEX/allcoins', function(req, res, next) {
  let successObj;
  let nativeCoindList = [];

  for (let key in coindInstanceRegistry) {
    nativeCoindList.push(key === 'komodod' ? 'KMD' : key);
  }

  successObj = {
    native: nativeCoindList,
  };

  res.end(JSON.stringify(successObj));
});

/*
 *  type: GET
 *
 */
shepherd.get('/SuperNET/activehandle', function(req, res, next) { // not finished
  let successObj;

  successObj = {
    pubkey: 'nativeonly',
    result: 'success',
    handle: '',
    status: Object.keys(coindInstanceRegistry).length ? 'unlocked' : 'locked',
    duration: 2507830,
  };

  res.end(JSON.stringify(successObj));
});

/*
 *  type: GET
 *  params: herd, lastLines
 */
shepherd.post('/debuglog', function(req, res) {
  let _herd = req.body.herdname;
  let _ac = req.body.ac;
  let _lastNLines = req.body.lastLines;
  let _location;

  if (os.platform() === 'darwin') {
    komodoDir = shepherd.appConfig.dataDir.length ? shepherd.appConfig.dataDir : `${process.env.HOME}/Library/Application Support/Komodo`;
  }

  if (os.platform() === 'linux') {
    komodoDir = shepherd.appConfig.dataDir.length ? shepherd.appConfig.dataDir : `${process.env.HOME}/.komodo`;
  }

  if (os.platform() === 'win32') {
    komodoDir = shepherd.appConfig.dataDir.length ? shepherd.appConfig.dataDir : `${process.env.APPDATA}/Komodo`;
    komodoDir = path.normalize(komodoDir);
  }

  if (_herd === 'komodo') {
    _location = komodoDir;
  }

  if (_ac) {
    _location = `${komodoDir}/${_ac}`;

    if (_ac === 'CHIPS') {
      _location = chipsDir;
    }
  }

  shepherd.readDebugLog(`${_location}/debug.log`, _lastNLines)
  .then(function(result) {
    const _obj = {
      msg: 'success',
      result: result,
    };

    res.end(JSON.stringify(_obj));
  }, function(result) {
    const _obj = {
      msg: 'error',
      result: result,
    };

    res.end(JSON.stringify(_obj));
  });
});

/*
 *  type: POST
 *  params: herd
 */
shepherd.post('/herd', function(req, res) {
  shepherd.log('======= req.body =======');
  shepherd.log(req.body);

  if (req.body.options &&
      !shepherd.kmdMainPassiveMode) {
    function testCoindPort(skipError) {
      if (!lockDownAddCoin) {
        const _port = assetChainPorts[req.body.options.ac_name];

        portscanner.checkPortStatus(_port, '127.0.0.1', function(error, status) {
          // Status is 'open' if currently in use or 'closed' if available
          if (status === 'open') {
            if (!skipError) {
              shepherd.log(`komodod service start error at port ${_port}, reason: port is closed`);
              shepherd.writeLog(`komodod service start error at port ${_port}, reason: port is closed`);
              shepherd.io.emit('service', {
                komodod: {
                  error: `error starting ${req.body.herd} ${req.body.options.ac_name} daemon. Port ${_port} is already taken!`,
                },
              });

              const obj = {
                msg: 'error',
                result: `error starting ${req.body.herd} ${req.body.options.ac_name} daemon. Port ${_port} is already taken!`,
              };

              res.status(500);
              res.end(JSON.stringify(obj));
            } else {
              shepherd.log(`komodod service start success at port ${_port}`);
              shepherd.writeLog(`komodod service start success at port ${_port}`);
            }
          } else {
            if (!skipError) {
              herder(req.body.herd, req.body.options);

              const obj = {
                msg: 'success',
                result: 'result',
              };

              res.end(JSON.stringify(obj));
            } else {
              shepherd.log(`komodod service start error at port ${_port}, reason: unknown`);
              shepherd.writeLog(`komodod service start error at port ${_port}, reason: unknown`);
            }
          }
        });
      }
    }

    if (req.body.herd === 'komodod') {
      // check if komodod instance is already running
      testCoindPort();
      setTimeout(function() {
        testCoindPort(true);
      }, 10000);
    } else {
      herder(req.body.herd, req.body.options, req.body.coind);

      const obj = {
        msg: 'success',
        result: 'result',
      };

      res.end(JSON.stringify(obj));
    }
  } else {
    // (?)
    herder(req.body.herd, req.body.options);

    const obj = {
      msg: 'success',
      result: 'result',
    };

    res.end(JSON.stringify(obj));
  }
});

/*
 *  type: POST
 */
shepherd.post('/setconf', function(req, res) {
  shepherd.log('======= req.body =======');
  shepherd.log(req.body);

  if (os.platform() === 'win32' &&
      req.body.chain == 'komodod') {
    setkomodoconf = spawn(path.join(__dirname, '../assets/bin/win64/genkmdconf.bat'));
  } else {
    setConf(req.body.chain);
  }

  const obj = {
    msg: 'success',
    result: 'result',
  };

  res.end(JSON.stringify(obj));
});

/*
 *  type: POST
 */
shepherd.post('/getconf', function(req, res) {
  shepherd.log('======= req.body =======');
  shepherd.log(req.body);

  const confpath = getConf(req.body.chain, req.body.coind);

  shepherd.log('got conf path is:');
  shepherd.log(confpath);
  shepherd.writeLog('got conf path is:');
  shepherd.writeLog(confpath);

  const obj = {
    msg: 'success',
    result: confpath,
  };

  res.end(JSON.stringify(obj));
});

/*
 *  type: GET
 *  params: coin, type
 *  TODO: reorganize to work with coind
 */
shepherd.get('/kick', function(req, res, next) {
  const _coin = req.query.coin;
  const _type = req.query.type;

  if (!_coin) {
    const errorObj = {
      msg: 'error',
      result: 'no coin name provided',
    };

    res.end(JSON.stringify(errorObj));
  }

  if (!_type) {
    const errorObj = {
      msg: 'error',
      result: 'no type provided',
    };

    res.end(JSON.stringify(errorObj));
  }

  const kickStartDirs = {
    soft: [
      {
        name: 'DB/[coin]',
        type: 'pattern',
        match: 'balancecrc.',
      },
      {
        name: 'DB/[coin]/utxoaddrs',
        type: 'file',
      },
      {
        name: 'DB/[coin]/accounts',
        type: 'folder',
      },
      {
        name: 'DB/[coin]/fastfind',
        type: 'folder',
      },
      {
        name: 'tmp/[coin]',
        type: 'folder',
      }
    ],
    hard: [
      {
        name: 'DB/[coin]',
        type: 'pattern',
        match: 'balancecrc.',
      },
      {
        name: 'DB/[coin]/utxoaddrs',
        type: 'file',
      },
      {
        name: 'DB/[coin]',
        type: 'pattern',
        match: 'utxoaddrs.',
      },
      {
        name: 'DB/[coin]/accounts',
        type: 'folder',
      },
      {
        name: 'DB/[coin]/fastfind',
        type: 'folder',
      },
      {
        name: 'DB/[coin]/spends',
        type: 'folder',
      },
      {
        name: 'tmp/[coin]',
        type: 'folder',
      }
    ],
    brutal: [ // delete all coin related data
      {
        name: 'DB/[coin]',
        type: 'folder',
      },
      {
        name: 'DB/purgeable/[coin]',
        type: 'folder',
      },
      {
        name: 'DB/ro/[coin]',
        type: 'folder',
      },
      {
        name: 'tmp/[coin]',
        type: 'folder',
      }
    ]
  };

  if (_coin &&
      _type) {
    for (let i = 0; i < kickStartDirs[_type].length; i++) {
      let currentKickItem = kickStartDirs[_type][i];

      shepherd.log('deleting ' + currentKickItem.type + (currentKickItem.match ? ' ' + currentKickItem.match : '') + ' ' + iguanaDir + '/' + currentKickItem.name.replace('[coin]', _coin));
      if (currentKickItem.type === 'folder' ||
          currentKickItem.type === 'file') {
        /*rimraf(`${iguanaDir}/${currentKickItem.name.replace('[coin]', _coin)}`, function(err) {
          if (err) {
            shepherd.writeLog(`kickstart err: ${err}`);
            shepherd.log(`kickstart err: ${err}`);
          }
        });*/
      } else if (currentKickItem.type === 'pattern') {
        let dirItems = fs.readdirSync(`${iguanaDir}/currentKickItem.name.replace('[coin]', _coin)`);

        if (dirItems &&
            dirItems.length) {
          for (let j = 0; j < dirItems.length; j++) {
            if (dirItems[j].indexOf(currentKickItem.match) > -1) {
              /*rimraf(`${iguanaDir}/${currentKickItem.name.replace('[coin]', _coin)}/${dirItems[j]}`, function(err) {
                if (err) {
                  shepherd.writeLog(`kickstart err: ${err}`);
                  shepherd.log(`kickstart err: ${err}`);
                }
              });*/

              shepherd.log(`deleting ${dirItems[j]}`);
            }
          }
        }
      }
    }

    const successObj = {
      msg: 'success',
      result: 'kickstart: brutal is executed',
    };

    res.end(JSON.stringify(successObj));
  }
});

shepherd.readDebugLog = function(fileLocation, lastNLines) {
  return new Promise(
    function(resolve, reject) {
      if (lastNLines) {
        try {
          _fs.access(fileLocation, fs.constants.R_OK, function(err) {
            if (err) {
              shepherd.log(`error reading ${fileLocation}`);
              shepherd.writeLog(`error reading ${fileLocation}`);
              reject(`readDebugLog error: ${err}`);
            } else {
              shepherd.log(`reading ${fileLocation}`);
              _fs.readFile(fileLocation, 'utf-8', function(err, data) {
                if (err) {
                  shepherd.writeLog(`readDebugLog err: ${err}`);
                  shepherd.log(`readDebugLog err: ${err}`);
                }

                const lines = data.trim().split('\n');
                const lastLine = lines.slice(lines.length - lastNLines, lines.length).join('\n');

                resolve(lastLine);
              });
            }
          });
        } catch (e) {
          reject(`readDebugLog error: ${e}`);
        }
      } else {
        reject('readDebugLog error: lastNLines param is not provided!');
      }
    }
  );
};

function herder(flock, data, coind) {
  if (data === undefined) {
    data = 'none';
    shepherd.log('it is undefined');
  }

  shepherd.log('herder ' + flock + ' ' + coind);
  shepherd.log(`selected data: ${JSON.stringify(data, null, '\t')}`);

  // TODO: notify gui that reindex/rescan param is used to reflect on the screen
  //       asset chain debug.log unlink
  if (flock === 'komodod') {
    let kmdDebugLogLocation = (data.ac_name !== 'komodod' ? komodoDir + '/' + data.ac_name : komodoDir) + '/debug.log';

    shepherd.log('komodod flock selected...');
    shepherd.log('selected data: ' + JSON.stringify(data, null, '\t'));
    shepherd.writeLog('komodod flock selected...');
    shepherd.writeLog(`selected data: ${data}`);

    // truncate debug.log
    if (!shepherd.kmdMainPassiveMode) {
      try {
        const _confFileAccess = _fs.accessSync(kmdDebugLogLocation, fs.R_OK | fs.W_OK);

        if (_confFileAccess) {
          shepherd.log(`error accessing ${kmdDebugLogLocation}`);
          shepherd.writeLog(`error accessing ${kmdDebugLogLocation}`);
        } else {
          try {
            fs.unlinkSync(kmdDebugLogLocation);
            shepherd.log(`truncate ${kmdDebugLogLocation}`);
            shepherd.writeLog(`truncate ${kmdDebugLogLocation}`);
          } catch (e) {
            shepherd.log('cant unlink debug.log');
          }
        }
      } catch(e) {
        shepherd.log(`komodod debug.log access err: ${e}`);
        shepherd.writeLog(`komodod debug.log access err: ${e}`);
      }
    }

    // get komodod instance port
    const _port = assetChainPorts[data.ac_name];

    try {
      // check if komodod instance is already running
      portscanner.checkPortStatus(_port, '127.0.0.1', function(error, status) {
        // Status is 'open' if currently in use or 'closed' if available
        if (status === 'closed') {
          // start komodod via exec
          const _customParamDict = {
            silent: '&',
            reindex: '-reindex',
            change: '-pubkey=',
            datadir: '-datadir=',
            rescan: '-rescan',
          };
          let _customParam = '';

          if (data.ac_custom_param === 'silent' ||
              data.ac_custom_param === 'reindex' ||
              data.ac_custom_param === 'rescan') {
            _customParam = ` ${_customParamDict[data.ac_custom_param]}`;
          } else if (data.ac_custom_param === 'change' && data.ac_custom_param_value) {
            _customParam = ` ${_customParamDict[data.ac_custom_param]}${data.ac_custom_param_value}`;
          }

          if (shepherd.appConfig.dataDir.length) {
            _customParam = _customParam + ' -datadir=' + shepherd.appConfig.dataDir + '/' + data.ac_name;
          }

          shepherd.log(`exec ${komododBin} ${data.ac_options.join(' ')}${_customParam}`);
          shepherd.writeLog(`exec ${komododBin} ${data.ac_options.join(' ')}${_customParam}`);

          const isChain = data.ac_name.match(/^[A-Z]*$/);
          const coindACParam = isChain ? ` -ac_name=${data.ac_name} ` : '';
          shepherd.log(`daemon param ${data.ac_custom_param}`);

          coindInstanceRegistry[data.ac_name] = true;
          if (!shepherd.kmdMainPassiveMode) {
            let _arg = `${coindACParam}${data.ac_options.join(' ')}${_customParam}`;
            _arg = _arg.trim().split(' ');
            execFile(`${komododBin}`, _arg, {
              maxBuffer: 1024 * 1000000 // 1000 mb
            }, function(error, stdout, stderr) {
              shepherd.writeLog(`stdout: ${stdout}`);
              shepherd.writeLog(`stderr: ${stderr}`);

              if (error !== null) {
                shepherd.log(`exec error: ${error}`);
                shepherd.writeLog(`exec error: ${error}`);

                if (error.toString().indexOf('using -reindex') > -1) {
                  shepherd.io.emit('service', {
                    komodod: {
                      error: 'run -reindex',
                    },
                  });
                }
              }
            });
          }
        } else {
          if (shepherd.kmdMainPassiveMode) {
            coindInstanceRegistry[data.ac_name] = true;
          }
          shepherd.log(`port ${_port} (${data.ac_name}) is already in use`);
          shepherd.writeLog(`port ${_port} (${data.ac_name}) is already in use`);
        }
      });
    } catch(e) {
      shepherd.log(`failed to start komodod err: ${e}`);
      shepherd.writeLog(`failed to start komodod err: ${e}`);
    }
  }

  if (flock === 'chipsd') {
    let kmdDebugLogLocation = chipsDir + '/debug.log';

    shepherd.log('chipsd flock selected...');
    shepherd.log('selected data: ' + JSON.stringify(data, null, '\t'));
    shepherd.writeLog('chipsd flock selected...');
    shepherd.writeLog(`selected data: ${data}`);

    // truncate debug.log
    try {
      const _confFileAccess = _fs.accessSync(kmdDebugLogLocation, fs.R_OK | fs.W_OK);

      if (_confFileAccess) {
        shepherd.log(`error accessing ${kmdDebugLogLocation}`);
        shepherd.writeLog(`error accessing ${kmdDebugLogLocation}`);
      } else {
        try {
          fs.unlinkSync(kmdDebugLogLocation);
          shepherd.log(`truncate ${kmdDebugLogLocation}`);
          shepherd.writeLog(`truncate ${kmdDebugLogLocation}`);
        } catch (e) {
          shepherd.log('cant unlink debug.log');
        }
      }
    } catch(e) {
      shepherd.log(`chipsd debug.log access err: ${e}`);
      shepherd.writeLog(`chipsd debug.log access err: ${e}`);
    }

    // get komodod instance port
    const _port = assetChainPorts.chipsd;

    try {
      // check if komodod instance is already running
      portscanner.checkPortStatus(_port, '127.0.0.1', function(error, status) {
        // Status is 'open' if currently in use or 'closed' if available
        if (status === 'closed') {
          // start komodod via exec
          const _customParamDict = {
            silent: '&',
            reindex: '-reindex',
            change: '-pubkey=',
            rescan: '-rescan',
          };
          let _customParam = '';

          if (data.ac_custom_param === 'silent' ||
              data.ac_custom_param === 'reindex' ||
              data.ac_custom_param === 'rescan') {
            _customParam = ` ${_customParamDict[data.ac_custom_param]}`;
          } else if (data.ac_custom_param === 'change' && data.ac_custom_param_value) {
            _customParam = ` ${_customParamDict[data.ac_custom_param]}${data.ac_custom_param_value}`;
          }

          shepherd.log(`exec ${chipsBin} ${_customParam}`);
          shepherd.writeLog(`exec ${chipsBin} ${_customParam}`);

          shepherd.log(`daemon param ${data.ac_custom_param}`);

          coindInstanceRegistry['CHIPS'] = true;
          let _arg = `${_customParam}`;
          _arg = _arg.trim().split(' ');

          if (_arg &&
              _arg.length > 1) {
            execFile(`${chipsBin}`, _arg, {
              maxBuffer: 1024 * 1000000 // 1000 mb
            }, function(error, stdout, stderr) {
              shepherd.writeLog(`stdout: ${stdout}`);
              shepherd.writeLog(`stderr: ${stderr}`);

              if (error !== null) {
                shepherd.log(`exec error: ${error}`);
                shepherd.writeLog(`exec error: ${error}`);

                if (error.toString().indexOf('using -reindex') > -1) {
                  shepherd.io.emit('service', {
                    komodod: {
                      error: 'run -reindex',
                    },
                  });
                }
              }
            });
          } else {
            execFile(`${chipsBin}`, {
              maxBuffer: 1024 * 1000000 // 1000 mb
            }, function(error, stdout, stderr) {
              shepherd.writeLog(`stdout: ${stdout}`);
              shepherd.writeLog(`stderr: ${stderr}`);

              if (error !== null) {
                shepherd.log(`exec error: ${error}`);
                shepherd.writeLog(`exec error: ${error}`);

                if (error.toString().indexOf('using -reindex') > -1) {
                  shepherd.io.emit('service', {
                    komodod: {
                      error: 'run -reindex',
                    },
                  });
                }
              }
            });
          }
        }
      });
    } catch(e) {
      shepherd.log(`failed to start chipsd err: ${e}`);
      shepherd.writeLog(`failed to start chipsd err: ${e}`);
    }
  }

  if (flock === 'zcashd') { // TODO: fix(?)
    let kmdDebugLogLocation = `${zcashDir}/debug.log`;

    shepherd.log('zcashd flock selected...');
    shepherd.log(`selected data: ${data}`);
    shepherd.writeLog('zcashd flock selected...');
    shepherd.writeLog(`selected data: ${data}`);

    /*pm2.connect(true, function(err) { // start up pm2 god
      if (err) {
        shepherd.error(err);
        process.exit(2);
      }

      pm2.start({
        script: zcashdBin, // path to binary
        name: data.ac_name, // REVS, USD, EUR etc.
        exec_mode: 'fork',
        cwd: zcashDir,
        args: data.ac_options
      }, function(err, apps) {
        shepherd.writeLog(`zcashd fork started ${data.ac_name} ${JSON.stringify(data.ac_options)}`);

        pm2.disconnect(); // Disconnect from PM2
        if (err) {
          shepherd.writeLog(`pm2.disconnect err: ${err}`);
          shepherd.log(`pm2.disconnect err: ${err}`);
        }
        // throw err;
      });
    });*/
  }

  if (flock === 'coind') {
     const _osHome = os.platform === 'win32' ? process.env.APPDATA : process.env.HOME;
     let coindDebugLogLocation = `${_osHome}/.${shepherd.nativeCoindList[coind.toLowerCase()].bin.toLowerCase()}/debug.log`;

     shepherd.log(`coind ${coind} flock selected...`);
     shepherd.log(`selected data: ${JSON.stringify(data, null, '\t')}`);
     shepherd.writeLog(`coind ${coind} flock selected...`);
     shepherd.writeLog(`selected data: ${data}`);

     // truncate debug.log
     try {
       _fs.access(coindDebugLogLocation, fs.constants.R_OK, function(err) {
         if (err) {
           shepherd.log(`error accessing ${coindDebugLogLocation}`);
           shepherd.writeLog(`error accessing ${coindDebugLogLocation}`);
         } else {
           shepherd.log(`truncate ${coindDebugLogLocation}`);
           shepherd.writeLog(`truncate ${coindDebugLogLocation}`);
           fs.unlink(coindDebugLogLocation);
         }
       });
     } catch(e) {
       shepherd.log(`coind ${coind} debug.log access err: ${e}`);
       shepherd.writeLog(`coind ${coind} debug.log access err: ${e}`);
     }

     // get komodod instance port
     const _port = shepherd.nativeCoindList[coind.toLowerCase()].port;
     const coindBin = `${coindRootDir}/${coind.toLowerCase()}/${shepherd.nativeCoindList[coind.toLowerCase()].bin.toLowerCase()}d`;

     try {
       // check if coind instance is already running
       portscanner.checkPortStatus(_port, '127.0.0.1', function(error, status) {
         // Status is 'open' if currently in use or 'closed' if available
         if (status === 'closed') {
           shepherd.log(`exec ${coindBin} ${data.ac_options.join(' ')}`);
           shepherd.writeLog(`exec ${coindBin} ${data.ac_options.join(' ')}`);

           coindInstanceRegistry[coind] = true;
            let _arg = `${data.ac_options.join(' ')}`;
            _arg = _arg.trim().split(' ');
            execFile(`${coindBin}`, _arg, {
              maxBuffer: 1024 * 1000000 // 1000 mb
            }, function(error, stdout, stderr) {
             shepherd.writeLog(`stdout: ${stdout}`);
             shepherd.writeLog(`stderr: ${stderr}`);

             if (error !== null) {
               shepherd.log(`exec error: ${error}`);
               shepherd.writeLog(`exec error: ${error}`);
             }
           });
         } else {
           shepherd.log(`port ${_port} (${coind}) is already in use`);
           shepherd.writeLog(`port ${_port} (${coind}) is already in use`);
         }
       });
     } catch(e) {
       shepherd.log(`failed to start ${coind} err: ${e}`);
       shepherd.writeLog(`failed to start ${coind} err: ${e}`);
     }
  }
}

shepherd.setConfKMD = function(isChips) {
  let komodoDir;
  let zcashDir;

  if (os.platform() === 'darwin') {
    komodoDir = `${process.env.HOME}/Library/Application Support/Komodo`;
    ZcashDir = `${process.env.HOME}/Library/Application Support/Zcash`;
  }

  if (os.platform() === 'linux') {
    komodoDir = `${process.env.HOME}/.komodo`;
    ZcashDir = `${process.env.HOME}/.zcash`;
  }

  if (os.platform() === 'win32') {
    komodoDir = `${process.env.APPDATA}/Komodo`;
    ZcashDir = `${process.env.APPDATA}/Zcash`;
  }

  // check if kmd conf exists
  _fs.access(isChips ? `${chipsDir}/chips.conf` : `${komodoDir}/komodo.conf`, fs.constants.R_OK, function(err) {
    if (err) {
      shepherd.log(isChips ? 'creating chips conf' : 'creating komodo conf');
      shepherd.writeLog(isChips ? `creating chips conf in ${chipsDir}/chips.conf` : `creating komodo conf in ${komodoDir}/komodo.conf`);
      setConf(isChips ? 'chipsd' : 'komodod');
    } else {
      const _confSize = fs.lstatSync(isChips ? `${chipsDir}/chips.conf` : `${komodoDir}/komodo.conf`);

      if (_confSize.size === 0) {
        shepherd.log(isChips ? 'err: chips conf file is empty, creating chips conf' : 'err: komodo conf file is empty, creating komodo conf');
        shepherd.writeLog(isChips ? `creating chips conf in ${chipsDir}/chips.conf` : `creating komodo conf in ${komodoDir}/komodo.conf`);
        setConf(isChips ? 'chipsd' : 'komodod');
      } else {
        shepherd.writeLog(isChips ? 'chips conf exists' : 'komodo conf exists');
        shepherd.log(isChips ? 'chips conf exists' : 'komodo conf exists');
      }
    }
  });
}

function setConf(flock, coind) {
  let komodoDir;
  let chipsDir;
  let zcashDir;
  let nativeCoindDir;
  let DaemonConfPath;

  shepherd.log(flock);
  shepherd.writeLog(`setconf ${flock}`);

  if (os.platform() === 'darwin') {
    komodoDir = `${process.env.HOME}/Library/Application Support/Komodo`;
    chipsDir = `${process.env.HOME}/Library/Application Support/Chips`;
    ZcashDir = `${process.env.HOME}/Library/Application Support/Zcash`;
    nativeCoindDir = coind ? `${process.env.HOME}/Library/Application Support/${shepherd.nativeCoindList[coind.toLowerCase()].bin}` : null;
  }

  if (os.platform() === 'linux') {
    komodoDir = `${process.env.HOME}/.komodo`;
    chipsDir = `${process.env.HOME}/.chips`;
    ZcashDir = `${process.env.HOME}/.zcash`;
    nativeCoindDir = coind ? `${process.env.HOME}/.${shepherd.nativeCoindList[coind.toLowerCase()].bin.toLowerCase()}` : null;
  }

  if (os.platform() === 'win32') {
    komodoDir = `${process.env.APPDATA}/Komodo`;
    chipsDir = `${process.env.APPDATA}/Chips`;
    ZcashDir = `${process.env.APPDATA}/Zcash`;
    nativeCoindDir = coind ?  `${process.env.APPDATA}/${shepherd.nativeCoindList[coind.toLowerCase()].bin}` : null;
  }

  switch (flock) {
    case 'komodod':
      DaemonConfPath = `${komodoDir}/komodo.conf`;

      if (os.platform() === 'win32') {
        DaemonConfPath = path.normalize(DaemonConfPath);
      }
      break;
    case 'zcashd':
      DaemonConfPath = `${ZcashDir}/zcash.conf`;

      if (os.platform() === 'win32') {
        DaemonConfPath = path.normalize(DaemonConfPath);
      }
      break;
    case 'chipsd':
      DaemonConfPath = `${chipsDir}/chips.conf`;

      if (os.platform() === 'win32') {
        DaemonConfPath = path.normalize(DaemonConfPath);
      }
      break;
    case 'coind':
       DaemonConfPath = `${nativeCoindDir}/${shepherd.nativeCoindList[coind.toLowerCase()].bin.toLowerCase()}.conf`;

       if (os.platform() === 'win32') {
         DaemonConfPath = path.normalize(DaemonConfPath);
       }
       break;
    default:
      DaemonConfPath = `${komodoDir}/${flock}/${flock}.conf`;

      if (os.platform() === 'win32') {
        DaemonConfPath = path.normalize(DaemonConfPath);
      }
  }

  shepherd.log(DaemonConfPath);
  shepherd.writeLog(`setconf ${DaemonConfPath}`);

  const CheckFileExists = function() {
    return new Promise(function(resolve, reject) {
      const result = 'Check Conf file exists is done'

      const confFileExist = fs.ensureFileSync(DaemonConfPath);
      if (confFileExist) {
        shepherd.log(result);
        shepherd.writeLog(`setconf ${result}`);

        resolve(result);
      } else {
        shepherd.log('conf file doesnt exist');
        resolve('conf file doesnt exist');
      }
    });
  }

  const FixFilePermissions = function() {
    return new Promise(function(resolve, reject) {
      const result = 'Conf file permissions updated to Read/Write';

      fsnode.chmodSync(DaemonConfPath, '0666');
      shepherd.log(result);
      shepherd.writeLog(`setconf ${result}`);

      resolve(result);
    });
  }

  const RemoveLines = function() {
    return new Promise(function(resolve, reject) {
      const result = 'RemoveLines is done';

      fs.readFile(DaemonConfPath, 'utf8', function(err, data) {
        if (err) {
          shepherd.writeLog(`setconf error ${err}`);
          return shepherd.log(err);
        }

        const rmlines = data.replace(/(?:(?:\r\n|\r|\n)\s*){2}/gm, '\n');

        fs.writeFile(DaemonConfPath, rmlines, 'utf8', function(err) {
          if (err)
            return shepherd.log(err);

          fsnode.chmodSync(DaemonConfPath, '0666');
          shepherd.writeLog(`setconf ${result}`);
          shepherd.log(result);
          resolve(result);
        });
      });
    });
  }

  const CheckConf = function() {
    return new Promise(function(resolve, reject) {
      const result = 'CheckConf is done';

      setconf.status(DaemonConfPath, function(err, status) {
        const rpcuser = function() {
          return new Promise(function(resolve, reject) {
            const result = 'checking rpcuser...';

            if (status[0].hasOwnProperty('rpcuser')) {
              shepherd.log('rpcuser: OK');
              shepherd.writeLog('rpcuser: OK');
            } else {
              const randomstring = md5((Math.random() * Math.random() * 999).toString());

              shepherd.log('rpcuser: NOT FOUND');
              shepherd.writeLog('rpcuser: NOT FOUND');

              fs.appendFile(DaemonConfPath, `\nrpcuser=user${randomstring.substring(0, 16)}`, (err) => {
                if (err) {
                  shepherd.writeLog(`append daemon conf err: ${err}`);
                  shepherd.log(`append daemon conf err: ${err}`);
                }
                // throw err;
                shepherd.log('rpcuser: ADDED');
                shepherd.writeLog('rpcuser: ADDED');
              });
            }

            resolve(result);
          });
        }

        const rpcpass = function() {
          return new Promise(function(resolve, reject) {
            const result = 'checking rpcpassword...';

            if (status[0].hasOwnProperty('rpcpassword')) {
              shepherd.log('rpcpassword: OK');
              shepherd.writeLog('rpcpassword: OK');
            } else {
              var randomstring = md5((Math.random() * Math.random() * 999).toString());

              shepherd.log('rpcpassword: NOT FOUND');
              shepherd.writeLog('rpcpassword: NOT FOUND');

              fs.appendFile(DaemonConfPath, `\nrpcpassword=${randomstring}`, (err) => {
                if (err) {
                  shepherd.writeLog(`append daemon conf err: ${err}`);
                  shepherd.log(`append daemon conf err: ${err}`);
                }
                // throw err;
                shepherd.log('rpcpassword: ADDED');
                shepherd.writeLog('rpcpassword: ADDED');
              });
            }

            resolve(result);
          });
        }

        const rpcbind = function() {
          return new Promise(function(resolve, reject) {
            const result = 'checking rpcbind...';

            if (status[0].hasOwnProperty('rpcbind')) {
              shepherd.log('rpcbind: OK');
              shepherd.writeLog('rpcbind: OK');
            } else {
              shepherd.log('rpcbind: NOT FOUND');
              shepherd.writeLog('rpcbind: NOT FOUND');

              fs.appendFile(DaemonConfPath, '\nrpcbind=127.0.0.1', (err) => {
                if (err) {
                  shepherd.writeLog(`append daemon conf err: ${err}`);
                  shepherd.log(`append daemon conf err: ${err}`);
                }
                // throw err;
                shepherd.log('rpcbind: ADDED');
                shepherd.writeLog('rpcbind: ADDED');
              });
            }

            resolve(result);
          });
        }

        const server = function() {
          return new Promise(function(resolve, reject) {
            const result = 'checking server...';

            if (status[0].hasOwnProperty('server')) {
              shepherd.log('server: OK');
              shepherd.writeLog('server: OK');
            } else {
              shepherd.log('server: NOT FOUND');
              shepherd.writeLog('server: NOT FOUND');

              fs.appendFile(DaemonConfPath, '\nserver=1', (err) => {
                if (err) {
                  shepherd.writeLog(`append daemon conf err: ${err}`);
                  shepherd.log(`append daemon conf err: ${err}`);
                }
                // throw err;
                shepherd.log('server: ADDED');
                shepherd.writeLog('server: ADDED');
              });
            }

            resolve(result);
          });
        }

        const addnode = function() {
          return new Promise(function(resolve, reject) {
            const result = 'checking addnode...';

            if (flock === 'chipsd' ||
                flock === 'komodod') {
              if (status[0].hasOwnProperty('addnode')) {
                shepherd.log('addnode: OK');
                shepherd.writeLog('addnode: OK');
              } else {
                let nodesList;

                if (flock === 'chipsd') {
                  nodesList = '\naddnode=95.110.191.193' +
                  '\naddnode=144.76.167.66' +
                  '\naddnode=158.69.248.93' +
                  '\naddnode=149.202.49.218' +
                  '\naddnode=95.213.205.222' +
                  '\naddnode=5.9.253.198' +
                  '\naddnode=164.132.224.253' +
                  '\naddnode=163.172.4.66' +
                  '\naddnode=217.182.194.216' +
                  '\naddnode=94.130.96.114' +
                  '\naddnode=5.9.253.195';
                } else if (flock === 'komodod') {
                  nodesList = '\naddnode=78.47.196.146' +
                  '\naddnode=5.9.102.210' +
                  '\naddnode=178.63.69.164' +
                  '\naddnode=88.198.65.74' +
                  '\naddnode=5.9.122.241' +
                  '\naddnode=144.76.94.3';
                }
                shepherd.log('addnode: NOT FOUND');
                fs.appendFile(DaemonConfPath, nodesList, (err) => {
                  if (err) {
                    shepherd.writeLog(`append daemon conf err: ${err}`);
                    shepherd.log(`append daemon conf err: ${err}`);
                  }
                  // throw err;
                  shepherd.log('addnode: ADDED');
                  shepherd.writeLog('addnode: ADDED');
                });
              }
            } else {
              result = 'skip addnode';
            }

            resolve(result);
          });
        }

        rpcuser()
        .then(function(result) {
          return rpcpass();
        })
        .then(server)
        .then(rpcbind)
        .then(addnode);
      });

      shepherd.log(result);
      shepherd.writeLog(`checkconf addnode ${result}`);

      resolve(result);
    });
  }

  CheckFileExists()
  .then(function(result) {
    return FixFilePermissions();
  })
  .then(RemoveLines)
  .then(CheckConf);
}

function getConf(flock, coind) {
  let komodoDir = '';
  let ZcashDir = '';
  let chipsDir = '';
  let DaemonConfPath = '';
  let nativeCoindDir;

  if (flock === 'CHIPS') {
    flock = 'chipsd';
  }

  shepherd.log(flock);
  shepherd.log('getconf coind ' + coind);
  shepherd.writeLog(`getconf flock: ${flock}`);

  if (os.platform() === 'darwin') {
    komodoDir = `${process.env.HOME}/Library/Application Support/Komodo`;
    ZcashDir = `${process.env.HOME}/Library/Application Support/Zcash`;
    chipsDir = `${process.env.HOME}/Library/Application Support/Chips`;
    nativeCoindDir = `${process.env.HOME}/Library/Application Support/${shepherd.nativeCoindList[coind.toLowerCase()].bin}`;
  }

  if (os.platform() === 'linux') {
    komodoDir = `${process.env.HOME}/.komodo`;
    ZcashDir = `${process.env.HOME}/.zcash`;
    chipsDir = `${process.env.HOME}/.chips`;
    nativeCoindDir = coind ? `${process.env.HOME}/.${shepherd.nativeCoindList[coind.toLowerCase()].bin.toLowerCase()}` : null;
  }

  if (os.platform() === 'win32') {
    komodoDir = `${process.env.APPDATA}/Komodo`;
    ZcashDir = `${process.env.APPDATA}/Zcash`;
    chipsDir = `${process.env.APPDATA}/Chips`;
    nativeCoindDir = coind ? `${process.env.APPDATA}/${shepherd.nativeCoindList[coind.toLowerCase()].bin}` : null;
  }

  switch (flock) {
    case 'komodod':
      DaemonConfPath = komodoDir;
      if (os.platform() === 'win32') {
        DaemonConfPath = path.normalize(DaemonConfPath);
        shepherd.log('===>>> SHEPHERD API OUTPUT ===>>>');
      }
      break;
    case 'zcashd':
      DaemonConfPath = ZcashDir;
      if (os.platform() === 'win32') {
        DaemonConfPath = path.normalize(DaemonConfPath);
      }
      break;
    case 'chipsd':
      DaemonConfPath = chipsDir;
      if (os.platform() === 'win32') {
        DaemonConfPath = path.normalize(DaemonConfPath);
      }
      break;
    case 'coind':
      DaemonConfPath = os.platform() === 'win32' ? path.normalize(`${coindRootDir}/${coind.toLowerCase()}`) : `${coindRootDir}/${coind.toLowerCase()}`;
      break;
    default:
      DaemonConfPath = `${komodoDir}/${flock}`;
      if (os.platform() === 'win32') {
        DaemonConfPath = path.normalize(DaemonConfPath);
      }
  }

  shepherd.writeLog(`getconf path: ${DaemonConfPath}`);
  shepherd.log('daemon path: ' + DaemonConfPath);
  return DaemonConfPath;
}

function formatBytes(bytes, decimals) {
  if (bytes === 0)
    return '0 Bytes';

  const k = 1000;
  const dm = (decimals + 1) || 3;
  const sizes = [
    'Bytes',
    'KB',
    'MB',
    'GB',
    'TB',
    'PB',
    'EB',
    'ZB',
    'YB'
  ];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

shepherd.SystemInfo = function() {
  const os_data = {
    'totalmem_bytes': os.totalmem(),
    'totalmem_readable': formatBytes(os.totalmem()),
    'arch': os.arch(),
    'cpu': os.cpus()[0].model,
    'cpu_cores': os.cpus().length,
    'platform': os.platform(),
    'os_release': os.release(),
    'os_type': os.type()
  };

  return os_data;
}

shepherd.appInfo = function() {
  const sysInfo = shepherd.SystemInfo();
  const releaseInfo = shepherd.appBasicInfo;
  const dirs = {
    agamaDir,
    komodoDir,
    komododBin,
    configLocation: `${agamaDir}/config.json`,
    cacheLocation: `${agamaDir}/shepherd`,
  };

  return {
    sysInfo,
    releaseInfo,
    dirs,
    appSession: shepherd.appSessionHash,
  };
}

module.exports = shepherd;