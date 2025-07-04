import type { TimedTextSegment } from "../utils/TimedTextSegment"
import { msErrorOnSegmentation } from "../utils/ErrorCalc";

const targetSegmentation : TimedTextSegment[] = [
    {start:1, end:2, text:"hi"},
    {start:2, end:2.5, text:"hi"},
    {start:2.5, end:5, text:"hi"},
    {start:5, end:6.3, text:"hi"},
    {start:6.3, end:7, text:"hi"}
]

const resultingSegmentation : TimedTextSegment[] = [
    {start:1, end:2.25, text:"hi"},
    {start:2.25, end:2.5, text:"hi"},
    {start:2.5, end:3.5, text:"hi"},
    {start:3.5, end:6.3, text:"hi"},
    {start:6.3, end:7, text:"hi"}
]

console.log(`error should be 0.578125 and it is: ${msErrorOnSegmentation(targetSegmentation, resultingSegmentation)}`);