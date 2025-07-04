import type { TimedTextSegment } from "../utils/TimedTextSegment";

//extremely stupid split - just makes every segment an equal length
export function equalLength(initialSegments: TimedTextSegment[], audioData: number[], duration: number){
    if(initialSegments.length <= 0 || audioData.length <= 0) return [];

    const segLength = duration / initialSegments.length;
    const segments :TimedTextSegment[] = [];

    segments.push({start:0, end: segLength, text: initialSegments[0].text})
    for(let i = 1; i < initialSegments.length; i++){
        segments.push({
            start: segments[i-1].end,
            end: segments[i-1].end + segLength,
            text: initialSegments[i].text
        });
    }

    return segments;
}