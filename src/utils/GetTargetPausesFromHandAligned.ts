import type { TimedTextSegment } from "./TimedTextSegment";
import { getProblemFromBloom, type parsingProblem } from "./UnpackBloomFormat";

export async function getProblemsFromHandAlignedBloomPub(bookName:string):Promise<parsingProblem[]>{
    const beginningProbs = await getProblemFromBloom(`./data/HandAligned/${bookName}-Beginning.htm`);
    const endProbs = await getProblemFromBloom(`./data/HandAligned/${bookName}-End.htm`);

    const pauseProbs : parsingProblem[] = [];
    for(let i = 0; i < beginningProbs.length; i++){
        const pauseSegs:TimedTextSegment[] = [];
        for(let j = 0; j < beginningProbs[i].targetSegments.length-1; j++){
            pauseSegs.push({
                start: beginningProbs[i].targetSegments[j].end,
                end: endProbs[i].targetSegments[j].end,
                text:""
            })
        }

        pauseProbs.push({
            targetSegments:beginningProbs[i].targetSegments.map((ts, i)=>{
                if(i==0) return {
                    start:ts.start, 
                    end:(pauseSegs[0].start + pauseSegs[0].end)/2, 
                    text:ts.text}
                if(i < pauseSegs.length) return {
                    start: (pauseSegs[i-1].start + pauseSegs[i-1].end)/2,
                    end: (pauseSegs[i].start + pauseSegs[i].end)/2,
                    text:ts.text
                }
                else return {
                    start: (pauseSegs[i-1].start + pauseSegs[i-1].end)/2,
                    end: ts.end,
                    text: ts.text
                }
            }),
            audioFileName:beginningProbs[i].audioFileName,
            targetPauses: pauseSegs
        })
    }

    return pauseProbs;
}