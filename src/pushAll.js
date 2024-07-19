const ethers = require('ethers');

async function getChainTimestamp(prov) {
    let blockNum = await prov.getBlockNumber();
    let block = await prov.getBlock(blockNum);
    if (block)
        return block.timestamp;
    else
        return 0;
}

const pushAllVaultRiskPenaltyJob = async function(BC_NODE_URL, BC_KEEPER_PRIVATE_KEY, BC_VAULT_KEEPER_CONTRACT) {
    console.log("pushAllVaultRiskPenaltyJob is started...");
    console.log("BC_NODE_URL: "+BC_NODE_URL+"  BC_VAULT_KEEPER_CONTRACT: "+BC_VAULT_KEEPER_CONTRACT);
    
    try {
        const provider = new ethers.JsonRpcProvider(BC_NODE_URL, undefined, {staticNetwork: true});
        const signer = new ethers.Wallet(BC_KEEPER_PRIVATE_KEY, provider);
        
        const vaultKeeperContractABI = [
            "function isExpiredRiskPenaltyCheck() external view returns(bool)",
            "function pushAllVaultRiskPenalty(uint256) external"
        ];
        const vaultKeeperContract = new ethers.Contract(
            BC_VAULT_KEEPER_CONTRACT,
            vaultKeeperContractABI,
            signer
        );
        
        let current = await getChainTimestamp(provider);
        console.log("Chain timestamp: "+current+" to call pushAllVaultRiskPenalty...");
        const isExpiredRiskPenaltyCheck = await vaultKeeperContract.isExpiredRiskPenaltyCheck();
        if (isExpiredRiskPenaltyCheck) {    
            let data = vaultKeeperContract.interface.encodeFunctionData('pushAllVaultRiskPenalty', [current]);
            let transaction = {
                to: BC_VAULT_KEEPER_CONTRACT,
                data: data,
                gasLimit: 10000000 // 10m
            };
            let tx = await signer.sendTransaction(transaction);
            console.log(`pushAllVaultRiskPenalty tx hash: ${tx.hash}`);
            let receipt = await tx.wait();
            console.log('pushAllVaultRiskPenalty receipt: ', receipt);
        }
    } catch(error) {
        console.error(error);
    }
    console.log("pushAllVaultRiskPenaltyJob is completed.");
};

exports.pushAllVaultRiskPenaltyJob = pushAllVaultRiskPenaltyJob;