![Motel-Bridge Logo](./public/Motel-Bridge.png)

# Motel *defi* Bridge

## About Motel Bridge
Motel defi bridge dapp is about catering gamers need. Which is a specific Arena Breakout. Bridging the web2 online gaming with web3 tech like easy transactions. Educating gamers about web3 and it’s possibilties.

What made think of this  bridge is when I saw ChowdsYT
sold his in game item to SADE while they were playing on stream. I was like these young chads don’t know about digital currency as their were discussing how SADE would transfer the amount that was asked for by Chowds. Then another youtuber’s fan ask how can they donate, then it made sense why not create something for these gamers.

That’s how I got to this experiment bridging this empty space with web3 as a solution to people not knowing how to use this friendly tech blockchain for they online use and smoother experience.
### How does it work

- User can create a holding wallet through the frontend.
- User can register a name service if they have a wallet
- With one of the service the user can now use the dapp
  to transfer, deposit, purchase AB game bonds at a -15%
- When purchasing game bonds the bonds get tokenized.
- To keep track of the participants for incentives.
- Users’ have the option to fully privatize they activities.
- User can send their bonds to the their game Id & server
- Which would burn their bonds 
- Users’ who create a holding wallet through the protocol
- Must withdraw all their tokens before 90 day expiry of
  the wallet which transfer 2% fee to the protocol.
- Users’ who did register a name can keep their funds in their EOA.
- Name service has three options 1 year, 3 year and forever option which is 1 AVAX.

### AVALANCH tech
- The protocol would make use of eERC20 for privacy features like deposit, transfer,    purchase bonds and withdraw funds deposited in the eERC20.
- The name service should be housed in L1 subnet for gas effiecency.
- The dapp should have cross chain capabilities and make it easy to get the bonds prices  off chain through oracle price feed.
- The name service can reach an expiry time which would cause the name service to be deleted on chain then backed up in the IPFS protocols through  a hash so when the user wants to renew them on chain. Subnet would fit perfect fo this specific task.
- All purchases and deposit should be done via AVAX token

### Plans for future features
- The protocol has multiple revenue streams which would make great tokenomics. Issue the incentive token to the frequent user, not lend it out but show gratitude.
- Intoduce betting games like who is failing extraction first and who is making home. This would be done through chainlink relaying that data on chain every 36 min after a raid.
- Keep betting games at a minimum.
- With fee-backed tokens a gas token can help drive the gas fee down as the dapp fully operates in the subnet L1.
- With proper components in structure the dapp can fully be defi with a strong gamer community.
- Final future feature is DOA final boss.
## Roadmap
### *phase 1*
- Frontend built using nextjs, tailwind and typescript for hassle free maintainance.
- Basic cloning factory for wallet holdings.
- Bond purchased at 15% discount
- Destroying the holding wallet after 90 days.
- Simple  withdrawal fees.
  
### *phase 2*
- ERC1155 for bond tokenization
- Name service system then launch it’s own subnet L1.
- eERC20 privacy features.
- Chainlink prices feeds and off chain in game data.  

### *phase 3*
- Incentive ERC20 token launch
- Fee-backed tokenomics
- Advanced privacy features for all holding wallets.
- Cross-chain expension


### *phase 4*
- Optimize the smart contract for gas
- Make the smart contract interoperting
- Audit the smart contracts
- Modularized the frontend code

# Usage
`cd my_dapp` then `npm install`
`npm run dev` for the smart contract `forge install` then `forge build`