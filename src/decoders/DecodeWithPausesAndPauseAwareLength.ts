import { makePauseFinder } from "../utils/FindPauses";
import type { TimedTextSegment } from "../utils/TimedTextSegment";
import { quietestNearby } from "./DecodeWithQuietestNearby";
import { makePauseAwareTextLength } from "./PauseAwareTextLength";

//the idea of this algorithm is to map each sentence break and pause to a level of confidence that they match
//we'll keep that mapping sorted by confidence level, then apply the matches in order of confidence level, skipping pauses that have already been assigned
export function makePausesAndPauseAwareLength(minPauseDuration:number, minGapPreDrop:number, minGapPostDrop:number, kMeansIterations:number, k:number, fractionOfSpeech:number, distanceFactor:number, distancePower:number, pauseWidthFactor:number, pauseWidthPower:number){
    const confidence = makeConfidenceMetric(distanceFactor, distancePower, pauseWidthFactor, pauseWidthPower);
    const pauseFinder = makePauseFinder(minPauseDuration, minGapPreDrop, minGapPostDrop, kMeansIterations, k, fractionOfSpeech).findPauses!;
    const pauseAwareTextLength = makePauseAwareTextLength(kMeansIterations, k, fractionOfSpeech);

    return {
        name: `pauses-and-pause-aware-length: df-${distanceFactor} dp-${distancePower} pwf-${pauseWidthFactor} pwp-${pauseWidthPower}`,
        decode: (initialSegments: TimedTextSegment[], audioData: number[], duration: number)=>{
            let pauses = pauseFinder(audioData, duration);
            try{
                if(pauses[0].start == 0) pauses = pauses.slice(1, pauses.length);
                if(pauses[pauses.length-1].end == duration) pauses = pauses.slice(0, pauses.length-1);
            }
            catch(error){
                console.error("Too few pauses were found to make pause-based sentence break assignments.\nDefaulting to text length.")
                return quietestNearby(initialSegments, audioData, duration);
            }

            //relies on getThreshold, which does not depend on min pause length or pause join parameters
            const textLengthBreaks = pauseAwareTextLength(initialSegments, audioData, duration);

            if(pauses.length < textLengthBreaks.length-1){
                console.error(`found fewer pauses (${pauses.length}) than needed (${textLengthBreaks.length-1}) to assign one to each phrase break.\nDefaulting to text length`);
                return quietestNearby(initialSegments, audioData, duration);
            }

            const pausePoints : number[] = pauses.map((pause:TimedTextSegment)=>{
                return pause.start + (pause.end - pause.start )/2;
            });
            let splitPoints : number[] = textLengthBreaks.map(split=>split.end);
            splitPoints = splitPoints.slice(0, -1);

            const confidenceTable : orderedConfidenceList = new orderedConfidenceList();
            const adjustedSplits : confidenceNode[] = [];

            for(let i = 0; i < pausePoints.length; i++){
                for(let j = 0; j < splitPoints.length; j++){
                    //if needed, add a guard of some kind to stop us from comparing every single pause to every single split
                    //addNode is a linear time operation, so we want to limit the size of confidence Table ( right now we're O(n^3) )
                    confidenceTable.addNode({
                        pauseIndex:i,
                        splitIndex:j,
                        confidence: confidence(pauses[i],textLengthBreaks[j])
                    });
                }
            }

            //assign splits to pauses in order of confidence
            for(let i = 0; i < splitPoints.length; i++){
                adjustedSplits.push(confidenceTable.pop())
            }

            try{
            for(const aSplit of adjustedSplits){
                const thisPause = pauses[aSplit.pauseIndex];

                const pauseCenter = thisPause.start + (thisPause.end - thisPause.start)/2;

                textLengthBreaks[aSplit.splitIndex].end = pauseCenter;
                textLengthBreaks[aSplit.splitIndex + 1].start = pauseCenter;
            }
            }catch(error){
                console.error("tried to look up a pause whose index doesn't exist")
                console.log("pauses")
                console.log(pauses)
                console.log("adjusted splits")
                console.log(adjustedSplits)
            }

            return textLengthBreaks;
        }
    }
}

//to begin with, we'll use the width of the pause minus the square of the distance between pause and split
function makeConfidenceMetric(distanceFactor:number, distancePower:number, pauseWidthFactor:number, pauseWidthPower:number):Function{
    return (pause:TimedTextSegment, split:TimedTextSegment)=>{
        const splitPoint = split.end;
        const pausePoint = pause.start + (pause.end-pause.start)/2

        return pauseWidthFactor*(pause.end - pause.start)**pauseWidthPower + distanceFactor*(pausePoint-splitPoint)**distancePower;
    }
}

class orderedConfidenceList{
    private head?:confidenceNode;
    public size:number=0;

    public constructor(){
        this.head = undefined;
    }

    public isEmpty():boolean{
        return this.head == undefined;
    }

    public addNode(newNode:confidenceNode){
        this.size++;

        if(this.head == undefined){
            this.head = newNode;
            return;
        }

        if(newNode.confidence > this.head.confidence){
            newNode.nextNode = this.head;
            this.head = newNode;
            return
        }

        let prevNode = this.head;
        while(prevNode.nextNode != undefined){
            if(newNode.confidence > prevNode.nextNode.confidence){
                newNode.nextNode = prevNode.nextNode;
                prevNode.nextNode = newNode;
                return
            }
            prevNode = prevNode.nextNode;
        }
        //if we make it here, then newNode didn't have a greater confidence than anything and prevNode is the last node in the list
        prevNode.nextNode = newNode;
    }

    public pop() : confidenceNode{
        if(this.head == undefined){
            return {pauseIndex:-1, splitIndex:-1, confidence:-Infinity};
        }

        this.size--;

        const toPop = this.head!;

        //the pause toPop is being assigned to is taken. Remove every reference to another split that wants to be assigned to it
        let currNode = toPop;
        while(currNode.nextNode != undefined){
            if(currNode.nextNode.pauseIndex == toPop.pauseIndex || currNode.nextNode.splitIndex == toPop.splitIndex){
                currNode.nextNode = currNode.nextNode.nextNode;
                this.size--;
            }
            else{
                currNode = currNode.nextNode;
            }            
        }

        this.head = this.head!.nextNode;
        return toPop;
    }
}

type confidenceNode = {
    pauseIndex:number,
    splitIndex:number,
    confidence:number,
    nextNode?:confidenceNode
}