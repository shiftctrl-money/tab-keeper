const ethers = require('ethers');
const axios = require('axios');

async function getMedianRates(TAB_ORACLE) {
    try {
        console.log("ready to retrieve median rates...");
        const res = await axios.get(TAB_ORACLE.TAB_ORACLE_NODE_URL + TAB_ORACLE.TAB_ORACLE_MEDIAN_ENDPOINT, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'X-API-TOKEN': TAB_ORACLE.TAB_ORACLE_API_TOKEN,
                'X-REAL-IP': '127.0.0.1'
            },
        });
        return JSON.parse(JSON.stringify(res.data));
    } catch(e) {
        if (e.response) {
            console.log("Error status: "+e.response.status);
            console.log("Error response data: "+e.response.data);
            console.log("Error message: "+e.response.statusText);
        } else {
            if (e.request)
                console.log("No response");
            else
                console.log(e);
        }
        return {error: e};
    }
}

async function getSignedRate(TAB_ORACLE, pubAddr, tabCode) {
    try {
        let sendUrl = (TAB_ORACLE.TAB_ORACLE_NODE_URL + TAB_ORACLE.TAB_ORACLE_MEDIAN_SIG_ENDPOINT)
                        .replaceAll('[USER_PUB]', pubAddr)
                        .replaceAll('[TAB_CODE]', tabCode);
        console.log("ready to retrieve signed rate from: "+sendUrl);
        const res = await axios.get(sendUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'X-API-TOKEN': TAB_ORACLE.TAB_ORACLE_API_TOKEN,
                'X-REAL-IP': '127.0.0.1'
            },
        });
        return JSON.parse(JSON.stringify(res.data));
    } catch(e) {
        if (e.response) {
            console.log("Error status: "+e.response.status);
            console.log("Error response data: "+e.response.data);
            console.log("Error message: "+e.response.statusText);
        } else {
            if (e.request)
                console.log("No response");
            else
                console.log(e);
        }
        return {error: e};
    }
}

function calcReserveValue(price, reserveAmt) {
    return  (price * reserveAmt) / ethers.parseEther("1");
}

async function getChainTimestamp(prov) {
    let blockNum = await prov.getBlockNumber();
    let block = await prov.getBlock(blockNum);
    if (block)
        return block.timestamp;
    else
        return 0;
}

const checkVaultJob = async function(
    BC_NODE_URL, 
    BC_KEEPER_PRIVATE_KEY, 
    BC_VAULT_MANAGER_CONTRACT, 
    BC_VAULT_UTILS_CONTRACT, 
    BC_TAB_REGISTRY_CONTRACT, 
    BC_VAULT_KEEPER_CONTRACT,
    TAB_ORACLE
) {
    console.log("checkVaultJob is started...");
    console.log("BC_NODE_URL: "+BC_NODE_URL+"  BC_VAULT_KEEPER_CONTRACT: "+BC_VAULT_KEEPER_CONTRACT);
    console.log("BC_VAULT_MANAGER_CONTRACT: "+BC_VAULT_MANAGER_CONTRACT);
    console.log("BC_TAB_REGISTRY_CONTRACT: "+BC_TAB_REGISTRY_CONTRACT);

    try {
        const provider = new ethers.JsonRpcProvider(BC_NODE_URL, undefined, {staticNetwork: true});
        const signer = new ethers.Wallet(BC_KEEPER_PRIVATE_KEY, provider);

        const vaultManagerContractABI = [
            'function getOwnerList() external view returns(address[] memory)',
            'function getAllVaultIDByOwner(address) external view returns(uint256[] memory)'
        ];
        const vaultManagerContract = new ethers.Contract(
            BC_VAULT_MANAGER_CONTRACT,
            vaultManagerContractABI,
            signer
        );

        const vaultUtilsContractABI = [
            'function getVaultDetails(address,uint256,uint256) external view returns(bytes3,bytes32,uint256,uint256,uint256,uint256,uint256)'
        ];
        const vaultUtilsContract = new ethers.Contract(
            BC_VAULT_UTILS_CONTRACT,
            vaultUtilsContractABI,
            signer
        );

        const tabRegistryContractABI = [
            'function frozenTabs(bytes3) external view returns(bool)'
        ];
        const tabRegistryContract = new ethers.Contract(
            BC_TAB_REGISTRY_CONTRACT,
            tabRegistryContractABI,
            signer
        );

        const vaultKeeperContractABI = [
            'function checkVault(uint256,(address,uint256,bytes3,bytes32,uint256,uint256,uint256),(address,address,bytes3,uint256,uint256,uint8,bytes32,bytes32)) external',
            'function largestVaultDelta(address,uint256) external view returns(uint256)'
        ];
        const vaultKeeperContract = new ethers.Contract(
            BC_VAULT_KEEPER_CONTRACT,
            vaultKeeperContractABI,
            signer
        );

        const ownerList = await vaultManagerContract.getOwnerList();
        console.log('ownerList length: '+ownerList.length);

        let rates = await getMedianRates(TAB_ORACLE);
        if (rates.error) {
            console.error("Failed to retrieve live median rates.");
            console.error(rates.error);
            return;
        }

        var checkCount = 0;
        let now = BigInt(Math.floor(Date.now() / 1000));
        for(var i=0; i < ownerList.length; i++) {
            let addr = ownerList[i];
            let ids = await vaultManagerContract.getAllVaultIDByOwner(addr);
            console.log('ids: '+ids+' length: '+ids.length);
            for(var k=0; k < ids.length; k++) {
                let id = ids[k];
                console.log('------------------------------------');
                console.log("Checking owner "+addr+' vault #'+id);
                
                // returns:
                    // bytes3 tab,
                    // bytes32 reserveKey,
                    // uint256 price,
                    // uint256 reserveAmt,
                    // uint256 osTab,
                    // uint256 reserveValue,
                    // uint256 minReserveValue
                let det = await vaultUtilsContract.getVaultDetails(addr, id, 1); // dummy price value: 1
                let strTab = ethers.toUtf8String(det[0]);
                
                let pairName = 'BTC'+strTab;
                let medianPriceRate = rates.data.quotes[pairName];
                if (medianPriceRate == null || medianPriceRate == undefined) {
                    console.error("Missing price rate on "+pairName);
                    continue;
                }
                // only proceed further if rate last updated within 10 minutes
                let rateLastUpdated = BigInt(rates.data.quotes[pairName].last_updated) / BigInt(1000);
                if ((now - rateLastUpdated) > (BigInt(10 * 60))) {
                    console.log("Skipped "+strTab+" elapsed: "+(now - rateLastUpdated).toString());
                    continue;
                }

                if (rates.data.quotes[pairName].tab.frozen == false) { // proceed checking only if vault tab is not frozen by protocol
                    let tab = det[0];
                    let reserveKey = det[1];
                    let price = BigInt(medianPriceRate.median);
                    let reserveAmt = BigInt(det[3]);
                    let osTab = BigInt(det[4]);
                    let reserveValue = calcReserveValue(price, reserveAmt);
                    let minReserveValue = BigInt(det[6]);
                    let delta = minReserveValue - reserveValue;
                    console.log('tab: ' + strTab);
                    console.log('reserveKey: ' + reserveKey);
                    console.log('price: ' + price);
                    console.log('reserveAmt: '+ reserveAmt);
                    console.log('osTab: ' + osTab);
                    console.log('reserveValue: ' + reserveValue);
                    console.log('minReserveValue: ' + minReserveValue);
                    console.log('delta: ' + delta + ' proceed checkValue? ' + (delta > 0) );
                    
                    if (delta > 0) { // delta value existed, call on-chain function 
                        // compare with on-chain largest delta (if any), if current delta is larger, submit it
                        let onChainLargestDelta = await vaultKeeperContract.largestVaultDelta(addr, id);
                        console.log('onChainLargestDelta: '+onChainLargestDelta);    

                        if (delta > onChainLargestDelta) {
                            let sig = await getSignedRate(TAB_ORACLE, signer.address, strTab);
                            if (sig.error) {
                                console.error("Failed to retrieve price rate signature on "+strTab);
                                console.error(sig.error);
                                continue;
                            }
                            let signed = sig.data.quotes[pairName].signed;
                            let blockTimestamp = await getChainTimestamp(provider);
                            console.log('blockTimestamp: '+blockTimestamp);
                            const data = vaultKeeperContract.interface.encodeFunctionData('checkVault', [
                                blockTimestamp,
                                [
                                    addr,
                                    id,
                                    tab,
                                    reserveKey,
                                    osTab,
                                    reserveValue,
                                    minReserveValue
                                ],
                                [
                                    signed.owner,
                                    signed.updater,
                                    signed.tab,
                                    signed.price,
                                    signed.timestamp,
                                    signed.v,
                                    signed.r,
                                    signed.s
                                ]
                            ]);
                            const transaction = {
                                to: BC_VAULT_KEEPER_CONTRACT,
                                data: data,
                                // gasPrice: ethers.utils.parseUnits('50', 'gwei'),
                                gasLimit: 10000000
                            };
                            try {
                                const tx = await signer.sendTransaction(transaction);
                                console.log("Triggered checkVault() on vault id: " + id + ' trx hash: '+tx.hash);
                                const receipt = await tx.wait();
                                console.log("checkVault receipt: ", receipt);
                            } catch (error) {
                                console.error('Exception: ', error);
                            }
                        }
                    }
                } else {
                    console.log("Skipped frozen tab "+strTab);
                }
                checkCount++;
            }// each vault id
        }// each vault owner
        console.log('Total checks: ' + checkCount);
        console.log("checkVaultJob is completed.");
    } catch(e) {
        console.error(e);
    }
};

exports.checkVaultJob = checkVaultJob;