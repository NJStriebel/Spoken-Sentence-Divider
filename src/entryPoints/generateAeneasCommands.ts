import { getProblemsFromHandAlignedBloomPub } from "../utils/GetTargetPausesFromHandAligned";
import { getProblemFromBloom, type parsingProblem } from "../utils/UnpackBloomFormat";
import { printAeneasFragmentFileTextFromPangloss } from "../utils/UnpackPangloss";

// const trainingSet1FileNames = [
//     "conte_01_l_heritier", 
//     "crdo-CKB_WOMEN", 
//     "crdo-LAG-hyena", 
//     "crdo-NBC_MERMAID",
//     "crdo-NGE_FOURMI", 
//     "crdo-SVM_LIEVRE",
//     "crdo-WLS_UVEAC1FB_1",
//     "IKE_KAUTJAJUK_STORY",
//     "ike_lizzie_niviaxie",
//     "lamo-s-0001"
// ]

// const trainingSet2FileNames = [
//     "Baby Moses",
//     "Golden Rules - Sermon on the Mount",
//     "Jesus Heals the Ten Lepers",
//     "The Easter Story",
//     "The Parable of the Weeds"
// ]

const handAlignedBookNames = [
    //"Cuando Dios hiso todo",
    //"Golden Rules",
    //"05 God Tests Abraham s Love",
    //"Bell in cat s neck",
    //"Shaka and mazi",
    "Bangladesh",
    "A donkey speaks to Balaam"
]

const inDirectory = "C:/Users/natha/Documents/Bloom_Internship/SpokenSentenceDivider/public"
const outDirectory = "C:/Users/natha/Documents/Bloom_Internship/SpokenSentenceDivider/public/aeneasOutput"

for(const bookName of handAlignedBookNames){
    const pages : parsingProblem[]  = [];

    for(const page of await getProblemsFromHandAlignedBloomPub(bookName)){
        pages.push(page);
    }

    for(let i = 0; i < pages.length; i++){
        const audioFile = `${inDirectory}/${pages[i].audioFileName}`;
        const fragmentsFile = `${inDirectory}/data/HandAligned/${bookName}_pg${i}-fragments.txt`
        const outputFile = `${outDirectory}/${bookName}_pg${i}-aeneasOutput.txt`

        //const fetchableXML = `./data/TrainingSet1/${fileName}.xml`

        const command = `python -m aeneas.tools.execute_task \"${audioFile}\" \"${fragmentsFile}\" \"task_language=eo|is_text_type=plain|os_task_file_format=txt|os_task_file_head_tail_format=hidden|is_audio_file_detect_head_min=0.00|is_audio_file_detect_head_max=5|task_adjust_boundary_algorithm=percent|task_adjust_boundary_percent_value=50\" \"${outputFile}\" --runtime-configuration=\"tts_voice_code=en\"`;//-r=\"allow_unlisted_languages=True\"

        console.log(`copy the below into a file at:\n${fragmentsFile}`)
        //await printAeneasFragmentFileTextFromPangloss(fetchableXML);
        let frags = "";
        for(const seg of pages[i].targetSegments){
            frags += seg.text + "\n";
        }
        console.log(frags);

        console.log(`then run the following from cmd.exe:\n${command}`);
        console.log("\n\n");
    }
}