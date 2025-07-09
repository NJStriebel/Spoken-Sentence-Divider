import { runAndDisplay } from "../utils/ProcessExample";
import { getProblemFromBloom } from "../utils/UnpackBloomFormat";
import { textLength } from "../decoders/DecodeWithTextLength";
import type { TimedTextSegment } from "../utils/TimedTextSegment";
import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";
import type { decodingAlgorithm } from "../utils/ProcessExample";
import { makePauseFinder } from "../utils/FindPauses";
import { makePausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";

const BOOK_NAME = "04 - Cat and Dog and the Hats";
const PAGE_INDEX = 2;

const problems = await getProblemFromBloom(`./data/${BOOK_NAME}.htm`);

const MIN_PAUSE_DURATION = 0.0005;
const MAX_GAP_TO_JOIN = 0.05;
const K_MEANS_ITERATIONS=100;
const K = 2;

const DISTANCE_FACTOR = -1;
const DISTANCE_POWER = 2;
const PAUSE_LENGTH_FACTOR = 10;
const PAUSE_LENGTH_POWER = 1;

const pauseFinder:decodingAlgorithm = makePauseFinder(MIN_PAUSE_DURATION, MAX_GAP_TO_JOIN, K_MEANS_ITERATIONS, K);

const algorithms = [
    pauseFinder,
    {name:"test", decode:makePausesAndPauseAwareLength(MIN_PAUSE_DURATION, MAX_GAP_TO_JOIN, K_MEANS_ITERATIONS, K, DISTANCE_FACTOR, DISTANCE_POWER, PAUSE_LENGTH_FACTOR, PAUSE_LENGTH_POWER).decode, findPauses:pauseFinder.findPauses!} as decodingAlgorithm,
    {name:"quietest-max-nearby-adjustment", decode:(is:TimedTextSegment[], ad:number[], d:number)=>quietestNearby(textLength(is, ad, d), ad, d), findPauses:pauseFinder.findPauses!} as decodingAlgorithm,
]

runAndDisplay(problems[PAGE_INDEX].targetSegments, problems[PAGE_INDEX].audioFileName, algorithms)