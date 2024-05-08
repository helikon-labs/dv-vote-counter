import { ApiPromise, WsProvider } from '@polkadot/api';
import { logHR, getTrackName } from './util';

const API_ENDPOINT = 'wss://rpc.helikon.io/polkadot';

const voters = [
    {
        name: 'ChaosDAO',
        address: '13EyMuuDHwtq5RD6w3psCJ9WvJFZzDDion6Fd2FVAqxz1g7K',
        voteCount: 0,
    },
    {
        name: 'Saxemberg',
        address: '153YD8ZHD9dRh82U419bSCB5SzWhbdAFzjj4NtA5pMazR2yC',
        voteCount: 0,
    },
    {
        name: 'Helikon',
        address: '15fTH34bbKGMUjF1bLmTqxPYgpg481imThwhWcQfCyktyBzL',
        voteCount: 0,
    },
    {
        name: 'Polkadotters',
        address: '12s6UMSSfE2bNxtYrJc6eeuZ7UxQnRpUzaAh1gPQrGNFnE8h',
        voteCount: 0,
    },
    {
        name: 'Jimi Tudeski',
        address: '1jPw3Qo72Ahn7Ynfg8kmYNLEPvHWHhPfPNgpJfp5bkLZdrF',
        voteCount: 0,
    },
    {
        name: 'William',
        address: '1ZSPR3zNg5Po3obkhXTPR95DepNBzBZ3CyomHXGHK9Uvx6w',
        voteCount: 0,
    },
    {
        name: 'Polkaworld',
        address: '12mP4sjCfKbDyMRAEyLpkeHeoYtS5USY4x34n9NMwQrcEyoh',
        voteCount: 0,
    },
];

const tracks = [30, 31, 32, 33, 34];

const START_REF_ID = 448;
const END_REF_ID = 699;

export async function countDVVotes() {
    logHR();
    console.log('Start vote counter.');
    console.log('Get API connection.');
    const provider = new WsProvider(API_ENDPOINT);
    const api = await ApiPromise.create({ provider });
    await api.isReady;
    console.log('API connection is ready.');
    console.log(`Process referenda #${START_REF_ID}-#${END_REF_ID}.`);
    for (let i = START_REF_ID; i <= END_REF_ID; i++) {
        logHR();
        console.log(`Process referendum #${i}.`);
        const refInfo = (await api.query.referenda.referendumInfoFor(i)).toJSON();
        if (!refInfo) {
            console.log(`Referendum ${i} was not found on chain.`);
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
            console.error(`ERROR :: Unknown referendum state for #${i}.`);
            continue;
        }
        let prevBlockHash = await api.rpc.chain.getBlockHash(blockNumber - 1);
        let apiAtPrev = await api.at(prevBlockHash.toHex());
        let prevRefInfo = (await apiAtPrev.query.referenda.referendumInfoFor(i)).toJSON();
        // @ts-ignore
        let track = prevRefInfo.ongoing.track;
        if (tracks.indexOf(track) < 0) {
            console.log(`Non-delegated track #${track} for referendum #${i}.`);
            continue;
        }
        console.log(`${getTrackName(track)} track.`);
        let blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        let apiAt = await api.at(blockHash.toHex());
        for (let voter of voters) {
            let result = await apiAt.query.convictionVoting.votingFor(voter.address, track);
            // @ts-ignore
            for (let vote of result.toJSON().casting.votes) {
                if (vote[0] == i) {
                    let voteType = '';
                    if (vote[1].splitAbstain) {
                        voteType = 'Abstain';
                    } else if (vote[1].standard) {
                        if (vote[1].standard.vote.indexOf('0x8') == 0) {
                            voteType = 'Aye';
                        } else if (vote[1].standard.vote.indexOf('0x0') == 0) {
                            voteType = 'Nay';
                        } else {
                            console.error(`Error: Unknown vote type ${JSON.stringify(vote)}`);
                        }
                    }
                    console.log(`${voter.name} voted : ${voteType}`);
                    voter.voteCount += 1;
                    break;
                }
            }
        }
    }
    logHR();
    console.log(`TOTAL VOTE COUNTS FOR REFERENDA #${START_REF_ID}-#${END_REF_ID}:`);
    for (let voter of voters) {
        console.log(`${voter.name}: ${voter.voteCount}`);
    }
    logHR();
    await api.disconnect();
}
