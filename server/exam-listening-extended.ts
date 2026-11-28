import {LISTENING_EXTENDED_ID} from "../shared/exam-contract";
import type {ExamSet,ExamItem} from "./exam-content-v2";
type Section={title:string;passage:string;questions:ExamItem[]};
function item(id:string,prompt:string,options:string[],expected:string,explanation:string):ExamItem{return {id,prompt,options,expected,explanation};}
const sections:Section[]=[
 {title:"Arranging a bicycle repair",passage:"Good morning. Your bicycle service is booked for Wednesday, but the workshop opens later than usual that day. Please bring the bicycle at eleven rather than nine. The basic service costs thirty pounds. If we discover that a replacement part is needed, we will telephone you before fitting it. Collection is from the rear entrance after four in the afternoon.",questions:[
 item("el1","Which day is the service booked for?",["Tuesday","Wednesday","Thursday"],"Wednesday","The booking is for Wednesday."),
 item("el2","When should the customer bring the bicycle?",["9:00","10:00","11:00"],"11:00","The revised arrival time is eleven."),
 item("el3","What will the workshop do before fitting a replacement part?",["Send a letter","Telephone the customer","Collect an extra deposit"],"Telephone the customer","The speaker promises to telephone first."),
 item("el4","Where should the bicycle be collected?",["Front desk","Rear entrance","Car park"],"Rear entrance","Collection is at the rear entrance.")]},
 {title:"A local museum visit",passage:"Welcome to the town museum. The exhibition on local transport is upstairs, and the photography collection is on the ground floor. The guided tour begins at two fifteen beside the information desk. It lasts forty minutes. You may take photographs in the transport exhibition, but not in the photography collection. The cafe is closed today, although drinking water is available near the entrance.",questions:[
 item("el5","Where is the transport exhibition?",["Upstairs","Ground floor","Outside"],"Upstairs","The transport exhibition is upstairs."),
 item("el6","When does the tour begin?",["2:00","2:15","2:40"],"2:15","The tour begins at two fifteen."),
 item("el7","How long is the tour?",["15 minutes","30 minutes","40 minutes"],"40 minutes","The speaker says forty minutes."),
 item("el8","Where are photographs prohibited?",["Transport exhibition","Photography collection","Information desk"],"Photography collection","The photography collection does not permit photographs.")]},
 {title:"A community gardening trial",passage:"Our gardening group compared two ways of watering raised beds. Half the beds were watered early in the morning, and the others in the evening. Both groups received the same amount of water. After six weeks, the morning beds had slightly higher average plant growth. However, the beds were not randomly assigned, and some received more sunlight than others. We cannot conclude that watering time caused the difference. Next season we plan to measure light exposure more carefully.",questions:[
 item("el9","What was the same for both groups?",["Water quantity","Watering time","Sunlight exposure"],"Water quantity","Both groups received the same amount of water."),
 item("el10","How long did the trial last?",["Four weeks","Six weeks","Eight weeks"],"Six weeks","The observation lasted six weeks."),
 item("el11","Why is the conclusion limited?",["The beds received different amounts of sunlight","There were no plants","The trial used only one bed"],"The beds received different amounts of sunlight","Sunlight differed and assignment was not random."),
 item("el12","What will the group measure more carefully next season?",["Soil price","Light exposure","Visitor numbers"],"Light exposure","The group plans to measure light exposure.")] }
];
export function listeningExtended():ExamSet{return {id:LISTENING_EXTENDED_ID,skill:"listening",title:"Listening · extended guided practice",passage:"",questions:sections.flatMap(s=>s.questions),sections:sections.map(s=>({title:s.title,passage:s.passage,questionIds:s.questions.map(q=>q.id)}))};}
