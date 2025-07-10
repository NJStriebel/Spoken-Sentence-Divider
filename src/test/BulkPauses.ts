import type { pausesResult } from "../utils/EvaluatePauses";
import { makePauseFinder } from "../utils/FindPauses";
import { runWithoutDisplay} from "../utils/ProcessExample";
import { getProblemFromBloom} from "../utils/UnpackBloomFormat";
import { getProblemFromPangloss } from "../utils/UnpackPangloss";

const bookNames = ["Kade Comma", "04 - Cat and Dog and the Hats"];

const panglossFiles = ["crdo-LAG-hyena", "lamo-s-0001"].map(name=>`./data/${name}.xml`)

const MIN_GAP_PRE_DROP = 0.001;
const PAUSE_DURATION_MIN = 0.03;
const MIN_GAP_POST_DROP = 0.5;

const K_MEANS_ITERATIONS=20;
const K = 2;

//determines where the threshold is placed. 1/4 means 25% of the way from the background noise centroid to the speech centroid.
const FRACTION_OF_SPEECH = 1/4

const DISTANCE_FACTOR = -1;
const DISTANCE_POWER = 2;
const PAUSE_LENGTH_FACTOR = 10;
const PAUSE_LENGTH_POWER = 1;

const problems = [];

for(const bookName of bookNames){
    const thisBookProbs = await getProblemFromBloom(`./data/${bookName}.htm`);
    for(const prob of thisBookProbs){
        problems.push(prob);
    }
}

for(const pfPath of panglossFiles){
    problems.push(await getProblemFromPangloss(pfPath));
}

console.log(problems)

const aggregateResult : pausesResult = {
    pauses: [],
    predictedNumPauses:0,
    actualNumPauses:0,
    numCorrectIdentified:0
};

const pauseFindingAlg = makePauseFinder(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH);
let i = 1;

for(const prob of problems){
    console.log(`running on page ${i++} of ${problems.length}`)
    const result = await runWithoutDisplay(prob.targetSegments, prob.audioFileName, pauseFindingAlg) as pausesResult;
    console.log(result);
    aggregateResult.predictedNumPauses += result.predictedNumPauses;
    aggregateResult.actualNumPauses += result.actualNumPauses;
    aggregateResult.numCorrectIdentified += result.numCorrectIdentified;
}

console.log(aggregateResult);