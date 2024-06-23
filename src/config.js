module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'local',
    BC_NODE_URL: process.env.BC_NODE_URL,
    BC_VAULT_MANAGER_CONTRACT: process.env.BC_VAULT_MANAGER_CONTRACT,
    BC_VAULT_UTILS_CONTRACT: process.env.BC_VAULT_UTILS_CONTRACT,
    BC_TAB_REGISTRY_CONTRACT: process.env.BC_TAB_REGISTRY_CONTRACT,
    BC_VAULT_KEEPER_CONTRACT: process.env.BC_VAULT_KEEPER_CONTRACT,
    BC_KEEPER_PRIVATE_KEY: process.env.BC_KEEPER_PRIVATE_KEY,
    TAB_ORACLE: {
        TAB_ORACLE_API_TOKEN: process.env.TAB_ORACLE_API_TOKEN,
        TAB_ORACLE_NODE_URL: process.env.TAB_ORACLE_NODE_URL,
        TAB_ORACLE_MEDIAN_ENDPOINT: process.env.TAB_ORACLE_MEDIAN_ENDPOINT,
        TAB_ORACLE_MEDIAN_SIG_ENDPOINT: process.env.TAB_ORACLE_MEDIAN_SIG_ENDPOINT
    }  
};