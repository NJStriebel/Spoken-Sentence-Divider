import { makePausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";
import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";
import { textLength } from "../decoders/DecodeWithTextLength";
import { makePauseFinder } from "../utils/FindPauses";
import { runWithoutDisplay, type decodeResult, type decodingAlgorithm } from "../utils/ProcessExample";
import { getProblemFromFiles, type parsingProblem } from "../utils/UnpackBloomFormat";

const bookNames = ["Kãde cɔ̃mmã", "04 - Cat and Dog and the Hats"];

const problems = [];
for(const bookName of bookNames){
    const thisBookProbs = await getProblemFromFiles(`./data/${bookName}.htm`);
    for(const prob of thisBookProbs){
        prob.audioFileName = `./data/${bookName}-audio/` + prob.audioFileName
        problems.push(prob);
    }
}

console.log(problems)

const aggregateResult : decodeResult = {
    segs:[],
    correct: 0,
    outOf:0,
};

const aggregateBaseline : decodeResult = {
    segs:[],
    correct: 0,
    outOf:0,
};

const pauseFinder = makePauseFinder(0.001, 0.2, 5).findPauses!;

const algorithm :decodingAlgorithm = {
    name:"test-alg",
    decode: makePausesAndPauseAwareLength(pauseFinder, -1, 2, 3, 1).decode,
    findPauses: pauseFinder
}

const baseLineAlg : decodingAlgorithm = {
    name:"baseline",
    decode: (is, ad, d) => quietestNearby(textLength(is, ad, d), ad, d),
    findPauses: pauseFinder
}

type pageResult = {
    result:decodeResult,
    baseline:decodeResult
}

async function onePage(prob: parsingProblem):Promise<pageResult>{
    const result = await runWithoutDisplay(prob.targetSegments, prob.audioFileName, algorithm) as decodeResult;
    const baseline = await runWithoutDisplay(prob.targetSegments, prob.audioFileName, baseLineAlg) as decodeResult;

    return {result:result, baseline:baseline} as pageResult;
}

const results: Promise<pageResult>[] = [];

for(const prob of problems){
    results.push(onePage(prob));
}

let perfectPages = 0;
let baselinePerfectPages = 0;

let i = 1;
for(const output of results){
    console.log(`Processing page ${i++}/${results.length}`)

    const thisPage = await output;

    aggregateResult.correct! += thisPage.result.correct!;
    aggregateResult.outOf! += thisPage.result.outOf!;
    if(thisPage.result.correct! === thisPage.result.outOf!) perfectPages++;

    aggregateBaseline.correct! += thisPage.baseline.correct!;
    aggregateBaseline.outOf! += thisPage.result.outOf!;
    if(thisPage.baseline.correct! == thisPage.baseline.outOf!) baselinePerfectPages++;
}

console.log(`algorithm under test:\nphrases: ${aggregateResult.correct}/${aggregateResult.outOf}\npages: ${perfectPages}/${i}`);
console.log(`baseline:\nphrases: ${aggregateBaseline.correct}/${aggregateBaseline.outOf}\npages: ${baselinePerfectPages}/${i}`);