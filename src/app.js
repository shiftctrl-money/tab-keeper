require('log-timestamp');
const { 
    NODE_ENV, 
    BC_NODE_URL, 
    BC_KEEPER_PRIVATE_KEY, 
    BC_VAULT_MANAGER_CONTRACT, 
    BC_TAB_REGISTRY_CONTRACT, 
    BC_VAULT_KEEPER_CONTRACT,
    BC_VAULT_UTILS_CONTRACT, 
    TAB_ORACLE,
    WRAPPED_BTC_RESERVES
} = require('./config');
const { checkVaultJob } = require('./checkVault');
const { pushAllVaultRiskPenaltyJob } = require('./pushAll');
const cron = require('node-cron');

if (NODE_ENV == 'local') {
    // run one time only
    pushAllVaultRiskPenaltyJob(BC_NODE_URL, BC_KEEPER_PRIVATE_KEY, BC_VAULT_KEEPER_CONTRACT);
    
    // every minute
    // cron.schedule('* * * * *', () => {
        checkVaultJob(
            BC_NODE_URL, 
            BC_KEEPER_PRIVATE_KEY, 
            BC_VAULT_MANAGER_CONTRACT, 
            BC_VAULT_UTILS_CONTRACT, 
            BC_TAB_REGISTRY_CONTRACT, 
            BC_VAULT_KEEPER_CONTRACT, 
            TAB_ORACLE, 
            WRAPPED_BTC_RESERVES
        );
    // });
    
} else {
    // run on every 1 hour 2 minutes
    cron.schedule('2 * * * *', () => {
        pushAllVaultRiskPenaltyJob(BC_NODE_URL, BC_KEEPER_PRIVATE_KEY, BC_VAULT_KEEPER_CONTRACT);
    });

    // run on every 6 minutes
    cron.schedule('*/6 * * * *', () => {
        checkVaultJob(
            BC_NODE_URL, 
            BC_KEEPER_PRIVATE_KEY, 
            BC_VAULT_MANAGER_CONTRACT, 
            BC_VAULT_UTILS_CONTRACT, 
            BC_TAB_REGISTRY_CONTRACT, 
            BC_VAULT_KEEPER_CONTRACT, 
            TAB_ORACLE, 
            WRAPPED_BTC_RESERVES
        );
    });
}
