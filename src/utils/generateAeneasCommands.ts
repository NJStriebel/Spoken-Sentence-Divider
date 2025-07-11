import { printAeneasFragmentFileTextFromPangloss } from "./UnpackPangloss";

const trainingSet1FileNames = [
    "conte_01_l_heritier", 
    "crdo-CKB_WOMEN", 
    "crdo-LAG-hyena", 
    "crdo-NBC_MERMAID",
    "crdo-NGE_FOURMI", 
    "crdo-SVM_LIEVRE",
    "crdo-WLS_UVEAC1FB_1",
    "IKE_KAUTJAJUK_STORY",
    "ike_lizzie_niviaxie",
    "lamo-s-0001"
]

const inDirectory = "C:/Users/natha/Documents/Bloom_Internship/SpokenSentenceDivider/public/data/TrainingSet1"
const outDirectory = "C:/Users/natha/Documents/Bloom_Internship/SpokenSentenceDivider/public/aeneasOutput"

for(const fileName of trainingSet1FileNames){
    const audioFile = `${inDirectory}/${fileName}.wav`;
    const fragmentsFile = `${inDirectory}/${fileName}-fragments.txt`
    const outputFile = `${outDirectory}/${fileName}-aeneasOutput.txt`

    const fetchableXML = `./data/TrainingSet1/${fileName}.xml`

    const command = `python -m aeneas.tools.execute_task \"${audioFile}\" \"${fragmentsFile}\" -r=\"allow_unlisted_languages=True\" \"task_language=eo|is_text_type=plain|os_task_file_format=txt|os_task_file_head_tail_format=hidden|is_audio_file_detect_head_min=0.00|is_audio_file_detect_head_max=5|task_adjust_boundary_algorithm=percent|task_adjust_boundary_percent_value=50\" \"${outputFile}\" --runtime-configuration=\"tts_voice_code=en\"`;

    console.log(`copy the below into a file at:\n${fragmentsFile}`)
    await printAeneasFragmentFileTextFromPangloss(fetchableXML);
    console.log(`then run the following from cmd.exe:\n${command}`);
    console.log("\n\n");
}