
# Tab Keeper

The Tab Keeper module is a part of Tab Protocol that performs health check on all active vaults. 

If the active vault's reserve ratio fall below configured minimum reserve rate, an on-chain function `checkVault` will be called to the underperformed vault. 

As part of the `checkVault` process, if the vault's reserve ratio fall below liquidation ratio, `liquidateVault` function will be trigerred immediately. 

An on-chain Dutch auction is started to recover outstanding Tabs and vault is closed, with remaining reserves claimable by vault owner (if any).


## Sub-modules
| Name    | Description | Scheduler |
| ------- | ----------- | --------- |
| Check vault job | Check on each active vaults on-chain and call its `checkVault` function if it is underperformed | Run on every 6 minutes |
| Push all risk penalties job | Flush all cached risk penalty and update vault's outstanding tab amount on-chain | Run on every hour and 2 minutes |

## Getting Started

### Prerequisites
* EVM blockchain with Node URL
* Tab protocol deployment, smart contract address for VaultManager, TabRegistry, and VaultKeeper.
* Node.js

### Installation
Refer steps below:

1. Clone the repo ``` git clone [repo] ```
2. cd into tab-keeper directory
   ```sh
   cd tab-keeper 
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. Edit .env.local file to suit your environment. 

5. Start application
   ```sh
   npm run local
   ```

### Docker
You may execute this module in docker environment. 
Docker swarm mode is preferred so that we can utilize docker secret to hide sensitive data.

1. Install docker and run
   ```sh
   docker swarm init
   docker network create --driver overlay tab-net
   ```

2. Clone the repo ``` git clone [repo] ```

3. Switch into tab-keeper directory
   ```sh
   cd tab-keeper 
   ```
4. Create and edit .env file by referring to .env.local file based on your environment. The .env file will be saved as docker secret in following step.

5. Run commands to start docker,
   ```sh
   docker volume create tab-keeper-log
   docker secret create tab-keeper-env .env
   docker build . -t tab-keeper
   docker service create --name tab-keeper --network tab-net --replicas 1 \
   --hostname tab-keeper --secret src=tab-keeper-env,target=".env" \
   --mount src=tab-keeper-log,dst=/usr/src/app/logs tab-keeper:latest
   ```
6. Visit [Docker swarm](https://docs.docker.com/engine/swarm/) for reference.

## Contributing

Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. 
You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
Distributed under the MIT License. See `LICENSE.md` for more information.

## Contact
Project Link: [https://shiftctrl.money](https://shiftctrl.money) - contact@shiftctrl.money

Twitter [@shiftCTRL_money](https://twitter.com/shiftCTRL_money) 

Discord [shiftctrl_money](https://discord.gg/7w6JhTNt9K)