/**
 * Contains the daemon logic.
 */
import { ApiPromise, WsProvider } from '@polkadot/api';

import { logger } from './logging';

const API_ENDPOINT = 'wss://rpc.helikon.io/polkadot';

const helikon = '15fTH34bbKGMUjF1bLmTqxPYgpg481imThwhWcQfCyktyBzL';
const saxemberg = '153YD8ZHD9dRh82U419bSCB5SzWhbdAFzjj4NtA5pMazR2yC';
const chaosDAO = '13EyMuuDHwtq5RD6w3psCJ9WvJFZzDDion6Fd2FVAqxz1g7K';
const jimi = '1jPw3Qo72Ahn7Ynfg8kmYNLEPvHWHhPfPNgpJfp5bkLZdrF';
const william = '1ZSPR3zNg5Po3obkhXTPR95DepNBzBZ3CyomHXGHK9Uvx6w';
const polkadotters = '12s6UMSSfE2bNxtYrJc6eeuZ7UxQnRpUzaAh1gPQrGNFnE8h';
const polkaworld = '12mP4sjCfKbDyMRAEyLpkeHeoYtS5USY4x34n9NMwQrcEyoh';

const tracks = [30, 31, 32, 33, 34];
const voters = [chaosDAO, saxemberg, helikon, jimi, polkadotters, william, polkaworld];
const voteCounts = new Map<string, number>();
voters.forEach((voter) => {
    voteCounts.set(voter, 0);
});

const START_REF_ID = 448;
const END_REF_ID = 699;

export async function countDVVotes() {
    logger.info('Start vote counter.');
    logger.info('Get API connection.');
    const provider = new WsProvider(API_ENDPOINT);
    const api = await ApiPromise.create({ provider });
    await api.isReady;
    logger.info('API connection is ready.');
    logger.info(`Process referenda #${START_REF_ID}-#${END_REF_ID}.`);
    for (let i = START_REF_ID; i <= END_REF_ID; i++) {
        logger.info(`Process referendum #${i}.`);
        const refInfo = (await api.query.referenda.referendumInfoFor(i)).toJSON();
        if (!refInfo) {
            logger.error(`Referendum ${i} was not found on chain.`);
            continue;
        }
        let blockNumber = 0;
        // @ts-ignore
        if (refInfo.approved) {
            // @ts-ignore
            blockNumber = refInfo.approved[0];
        }
        // @ts-ignore
        else if (refInfo.rejected) {
            // @ts-ignore
            blockNumber = refInfo.rejected[0];
        }
        // @ts-ignore
        else if (refInfo.timedOut) {
            // @ts-ignore
            blockNumber = refInfo.timedOut[0];
        }
        // @ts-ignore
        else if (refInfo.ongoing) {
            let finalizedHead = await api.rpc.chain.getFinalizedHead();
            let header = await api.rpc.chain.getHeader(finalizedHead);
            blockNumber = header.number.toNumber();
        } else {
            logger.error(`Unknown referendum state for #${i}.`);
            continue;
        }
        let prevBlockHash = await api.rpc.chain.getBlockHash(blockNumber - 1);
        let apiAtPrev = await api.at(prevBlockHash.toHex());
        let prevRefInfo = (await apiAtPrev.query.referenda.referendumInfoFor(i)).toJSON();
        // @ts-ignore
        let track = prevRefInfo.ongoing.track;
        if (tracks.indexOf(track) < 0) {
            logger.info(`Non-delegated track #${track} for referendum #${i}.`);
            continue;
        }
        let blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        let apiAt = await api.at(blockHash.toHex());
        for (let voter of voters) {
            let result = await apiAt.query.convictionVoting.votingFor(voter, track);
            // @ts-ignore
            for (let vote of result.toJSON().casting.votes) {
                if (vote[0] == i) {
                    voteCounts.set(voter, voteCounts.get(voter)! + 1);
                    break;
                }
            }
        }
    }
    console.log('ChaosDAO:', voteCounts.get(chaosDAO));
    console.log('Saxemberg:', voteCounts.get(saxemberg));
    console.log('Helikon:', voteCounts.get(helikon));
    console.log('Jimi:', voteCounts.get(jimi));
    console.log('Polkadotters:', voteCounts.get(polkadotters));
    console.log('William:', voteCounts.get(william));
    console.log('Polkaworld:', voteCounts.get(polkaworld));
}
