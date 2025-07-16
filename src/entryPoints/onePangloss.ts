import { runAndDisplay } from "../utils/ProcessExample";
import { textLength } from "../decoders/DecodeWithTextLength";
import type { TimedTextSegment } from "../utils/TimedTextSegment";
import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";
import type { decodingAlgorithm } from "../utils/ProcessExample";
import { makePauseFinder } from "../utils/FindPauses";
import { makePausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";
import { getProblemFromPangloss } from "../utils/UnpackPangloss";
import { makePauseAwareTextLength } from "../decoders/PauseAwareTextLength";

console.log("running...")

const FILE_NAME = "crdo-CKB_WOMEN";

const problem = await getProblemFromPangloss(`./data/TrainingSet1/${FILE_NAME}.xml`);

//min gap refers to the smallest gap that can exist between two pauses without it being joined
const MIN_GAP_PRE_DROP = 0.001;
const PAUSE_DURATION_MIN = 0.1;
const MIN_GAP_POST_DROP = 0.15;

const K_MEANS_ITERATIONS=10;
const K = 2;

//determines where the threshold is placed. 1/4 means 25% of the way from the background noise centroid to the speech centroid.
const FRACTION_OF_SPEECH = 3/4

const DISTANCE_FACTOR = -1;
const DISTANCE_POWER = 2;
const PAUSE_LENGTH_FACTOR = 10;
const PAUSE_LENGTH_POWER = 1;


const pauseFinder:decodingAlgorithm = makePauseFinder(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH);

const algorithms = [
    pauseFinder,
    {name:"pause-aware-text-length", decode: makePauseAwareTextLength(K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH)},
    {name:"test", decode:makePausesAndPauseAwareLength(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH, DISTANCE_FACTOR, DISTANCE_POWER, PAUSE_LENGTH_FACTOR, PAUSE_LENGTH_POWER).decode, findPauses:pauseFinder.findPauses!} as decodingAlgorithm,
    //{name:"quietest-max-nearby-adjustment", decode:(is:TimedTextSegment[], ad:number[], d:number)=>quietestNearby(textLength(is, ad, d), ad, d), findPauses:pauseFinder.findPauses!} as decodingAlgorithm,
]

runAndDisplay(problem.targetSegments, problem.audioFileName, algorithms)