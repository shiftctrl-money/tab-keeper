const ethers = require('ethers');

const checkVaultJob = async function(BC_NODE_URL, BC_KEEPER_PRIVATE_KEY, BC_VAULT_MANAGER_CONTRACT, BC_TAB_REGISTRY_CONTRACT, BC_VAULT_KEEPER_CONTRACT) {
    console.log("checkVaultJob is started...");
    console.log("BC_NODE_URL: "+BC_NODE_URL+"  BC_VAULT_KEEPER_CONTRACT: "+BC_VAULT_KEEPER_CONTRACT);
    console.log("BC_VAULT_MANAGER_CONTRACT: "+BC_VAULT_MANAGER_CONTRACT);
    console.log("BC_TAB_REGISTRY_CONTRACT: "+BC_TAB_REGISTRY_CONTRACT);

    try {
        const provider = new ethers.providers.JsonRpcProvider(BC_NODE_URL);
        const signer = new ethers.Wallet(BC_KEEPER_PRIVATE_KEY, provider);

        const vaultManagerContractABI = [
            'function getOwnerList() external view returns(address[] memory)',
            'function getAllVaultIDByOwner(address) external view returns(uint256[] memory)',
            'function getVaultDetails(address,uint256) external view returns(bytes3,bytes32,uint256,uint256,uint256,uint256,uint256)'
        ];
        const vaultManagerContract = new ethers.Contract(
            BC_VAULT_MANAGER_CONTRACT,
            vaultManagerContractABI,
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
            'function checkVault(uint256,(address,uint256,bytes3,bytes32,uint256,uint256,uint256)) external'
        ];
        const vaultKeeperContract = new ethers.Contract(
            BC_VAULT_KEEPER_CONTRACT,
            vaultKeeperContractABI,
            signer
        );

        const BigNumber = ethers.BigNumber;
        var frozenTabs = {}; // one-time contract reading to store frozen state

        const ownerList = await vaultManagerContract.getOwnerList();
        console.log("ownerList: " + ownerList+' length: '+ownerList.length);

        var checkCount = 0;
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
                let det = await vaultManagerContract.getVaultDetails(addr, id);
                let strTab = ethers.utils.toUtf8String(det[0]);
                if (frozenTabs[strTab] == null) {
                    if (await tabRegistryContract.frozenTabs(det[0]))
                        frozenTabs[strTab] = 1;
                    else
                        frozenTabs[strTab] = 0;
                }
                if (frozenTabs[strTab] == 0) { // proceed checking only if vault tab is not frozen by protocol
                    let tab = det[0];
                    let reserveKey = det[1];
                    let price = BigNumber.from(det[2]);
                    let reserveAmt = BigNumber.from(det[3]);
                    let osTab = BigNumber.from(det[4]);
                    let reserveValue = BigNumber.from(det[5]);
                    let minReserveValue = BigNumber.from(det[6]);
                    let delta = minReserveValue.sub(reserveValue);
                    console.log('tab: ' + strTab);
                    console.log('reserveKey: ' + reserveKey);
                    console.log('price: ' + price);
                    console.log('reserveAmt: '+ reserveAmt);
                    console.log('osTab: ' + osTab);
                    console.log('reserveValue: ' + reserveValue);
                    console.log('minReserveValue: ' + minReserveValue);
                    console.log('delta: ' + delta + ' proceed checkValue? ' + delta.gt(BigNumber.from('0')));

                    let now = BigNumber.from(Math.floor(Date.now() / 1000));
                    console.log('now: '+now);

                    if (delta.gt(BigNumber.from('0'))) { // delta value existed, call on-chain function 
                        const data = vaultKeeperContract.interface.encodeFunctionData('checkVault', [
                            now,
                            [
                                addr,
                                id,
                                tab,
                                reserveKey,
                                osTab,
                                reserveValue,
                                minReserveValue
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
                            console.log("receipt: ", receipt);
                        } catch (error) {
                            console.error('Exception: ', error);
                        }
                    }
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