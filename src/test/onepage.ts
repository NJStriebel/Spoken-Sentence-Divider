import { runAndDisplay } from "../utils/ProcessExample";
import { getProblemFromBloom } from "../utils/UnpackBloomFormat";
import { textLength } from "../decoders/DecodeWithTextLength";
import type { TimedTextSegment } from "../utils/TimedTextSegment";
import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";
import type { decodingAlgorithm } from "../utils/ProcessExample";
import { makePauseFinder } from "../utils/FindPauses";
import { makePausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";

const BOOK_NAME = "04 - Cat and Dog and the Hats";
const PAGE_INDEX = 3;

const problems = await getProblemFromBloom(`./data/${BOOK_NAME}.htm`);

const MIN_GAP_PRE_DROP = 0.001;
const PAUSE_DURATION_MIN = 0.03;
const MIN_GAP_POST_DROP = 0.5;

const K_MEANS_ITERATIONS=100;
const K = 2;

//determines where the threshold is placed. 1/4 means 25% of the way from the background noise centroid to the speech centroid.
const FRACTION_OF_SPEECH = 1/4

const DISTANCE_FACTOR = -1;
const DISTANCE_POWER = 2;
const PAUSE_LENGTH_FACTOR = 10;
const PAUSE_LENGTH_POWER = 1;

const pauseFinder:decodingAlgorithm = makePauseFinder(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH);

const algorithms = [
    pauseFinder,
    {name:"test", decode:makePausesAndPauseAwareLength(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH, DISTANCE_FACTOR, DISTANCE_POWER, PAUSE_LENGTH_FACTOR, PAUSE_LENGTH_POWER).decode, findPauses:pauseFinder.findPauses!} as decodingAlgorithm,
    {name:"quietest-max-nearby-adjustment", decode:(is:TimedTextSegment[], ad:number[], d:number)=>quietestNearby(textLength(is, ad, d), ad, d), findPauses:pauseFinder.findPauses!} as decodingAlgorithm,
]

runAndDisplay(problems[PAGE_INDEX].targetSegments, problems[PAGE_INDEX].audioFileName, algorithms)