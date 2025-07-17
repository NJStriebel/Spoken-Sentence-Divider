import { makeQuietestNearbyByInterval } from "../decoders/DecodeWithQuietestNearby";
import { textLength } from "../decoders/DecodeWithTextLength";
import { getProblemsFromHandAlignedBloomPub } from "../utils/GetTargetPausesFromHandAligned";
import { runWithoutDisplay, type decodeResult, type decodingAlgorithm } from "../utils/ProcessExample";
import { type parsingProblem } from "../utils/UnpackBloomFormat";

console.log("running bulk splits...");

const bookNames:string[] = [
    // "05 God Tests Abraham s Love",
    // "Cuando Dios hiso todo",
    // "Golden Rules",
    // "Bell in cat s neck",
    // "Shaka and mazi",
    "A donkey speaks to Balaam",
    "Bangladesh"
];

for(let BASELINE_INTERVAL_DURATION = .16; BASELINE_INTERVAL_DURATION < 1; BASELINE_INTERVAL_DURATION += .05){
for(let BASELINE_SLOP_PERCENT = 0.05; BASELINE_SLOP_PERCENT <= .51; BASELINE_SLOP_PERCENT += 0.05){

const problems = [];

for(const bookPath of bookNames){
    const thisBookProbs = await getProblemsFromHandAlignedBloomPub(bookPath);
    for(const prob of thisBookProbs){
        problems.push(prob);
    }
}

type agResult = {
    adjustedMSEs:number[],
    correct: number,
    outOf: number
}

const aggregateBaseline : agResult = {
    adjustedMSEs: [],
    correct: 0,
    outOf:0,
};

const baseLineAlg : decodingAlgorithm = {
    name:"baseline",
    decode: (is, ad, d) => makeQuietestNearbyByInterval(BASELINE_INTERVAL_DURATION, BASELINE_SLOP_PERCENT)(textLength(is, ad, d), ad, d),
}

type pageResult = {
    result:decodeResult,
    baseline:decodeResult
}

async function onePage(prob: parsingProblem, on:number, of:number):Promise<decodeResult>{
    console.debug(`Start processing ${on}/${of}`)
    const baseline = await runWithoutDisplay(prob, baseLineAlg) as decodeResult;
    console.debug(`ran baseline on problem ${on}/${of} - scored ${baseline.correct}/${baseline.outOf}`);

    return baseline
}

const results: Promise<decodeResult>[] = [];

let i = 1;
for(const prob of problems){
    results.push(onePage(prob, i++, problems.length));
}

let baselinePerfectPages = 0;

i = 1;
for(const output of results){
    console.debug(`Awaiting output from page ${i++}/${results.length}`);

    const baseline = await output;

    aggregateBaseline.correct! += baseline.correct!;
    aggregateBaseline.outOf! += baseline.outOf!;
    aggregateBaseline.adjustedMSEs.push(baseline.mse! * baseline.outOf!);
    if(baseline.correct! == baseline.outOf!) baselinePerfectPages++;
}

const baselineMSE = aggregateBaseline.adjustedMSEs.reduce((total,current)=>total+current) / aggregateBaseline.outOf;

console.log(`Division Duration: ${BASELINE_INTERVAL_DURATION}\nSlop Percent: ${BASELINE_SLOP_PERCENT}\n\nmse: ${baselineMSE}\nphrases: ${aggregateBaseline.correct}/${aggregateBaseline.outOf}\npages: ${baselinePerfectPages}/${i}`);

}}