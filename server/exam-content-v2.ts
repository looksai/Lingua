import type { ExamSkill,IeltsVariant } from "../shared/exam-contract";
export type ExamItem={id:string;prompt:string;options:readonly string[];expected:string;explanation:string};
export type ExamSet={id:string;title:string;passage:string;skill:ExamSkill;questions:ExamItem[]};
const tf=["True","False","Not given"] as const;
export const additionalReading:Record<IeltsVariant,ExamSet[]> = {
 "ielts-academic":[
 {id:"library-energy-02",skill:"reading",title:"Reducing energy use in libraries",passage:"A university library replaced its fixed lighting schedule with sensors that detect occupancy. During a six-month trial, electricity used for lighting fell by 18 percent compared with the previous year. The researchers did not measure the energy used by computers or heating equipment. Staff reported that some sensors switched lights off when readers remained still for long periods. After the trial, the library adjusted the sensor delay and continued to monitor complaints.",questions:[
 {id:"a21",prompt:"The trial lasted six months.",options:tf,expected:"True",explanation:"The passage explicitly states a six-month trial."},
 {id:"a22",prompt:"The study measured electricity consumed by computers.",options:tf,expected:"False",explanation:"The researchers did not measure computer energy use."},
 {id:"a23",prompt:"The sensors were manufactured locally.",options:tf,expected:"Not given",explanation:"The manufacturer is not identified."},
 {id:"a24",prompt:"Why was the sensor delay adjusted?",options:["Lights sometimes switched off while readers were still","The heating system stopped working","Staff wanted shorter opening hours"],expected:"Lights sometimes switched off while readers were still",explanation:"Staff reported this problem before the adjustment."}]},
 {id:"seed-storage-03",skill:"reading",title:"Community seed collections",passage:"A regional project stores seeds from traditional vegetable varieties to preserve options for future growers. Most samples are kept in a refrigerated room after drying. A small proportion of every batch is planted periodically to estimate germination rates. The project prioritises varieties that are rarely available commercially. Its coordinator cautions that successful germination does not establish how well a plant will perform in a different climate.",questions:[
 {id:"a31",prompt:"Most seeds are refrigerated after drying.",options:tf,expected:"True",explanation:"The storage method is stated in the second sentence."},
 {id:"a32",prompt:"Every seed in each batch is planted during testing.",options:tf,expected:"False",explanation:"Only a small proportion is planted."},
 {id:"a33",prompt:"The collection was established in 1998.",options:tf,expected:"Not given",explanation:"No foundation date is provided."},
 {id:"a34",prompt:"What does the coordinator warn against assuming?",options:["Germination guarantees performance in another climate","Commercial varieties are always unavailable","Refrigeration prevents all germination"],expected:"Germination guarantees performance in another climate",explanation:"The final sentence separates germination from performance in another climate."}]}
 ],
 "ielts-general":[
 {id:"staff-training-02",skill:"reading",title:"Staff training notice",passage:"All new warehouse employees must attend an induction before entering the storage area. Sessions are held on Tuesdays at 9 am and Thursdays at 2 pm. Employees should contact their supervisor to book a session. Protective footwear is compulsory for the tour; helmets are supplied at reception. Staff who have completed the induction within the last twelve months do not need to repeat it unless their supervisor requests a refresher.",questions:[
 {id:"g21",prompt:"A Thursday session begins at 2 pm.",options:tf,expected:"True",explanation:"The notice lists Thursday at 2 pm."},
 {id:"g22",prompt:"Employees must supply their own helmets.",options:tf,expected:"False",explanation:"Helmets are supplied at reception."},
 {id:"g23",prompt:"The induction lasts ninety minutes.",options:tf,expected:"Not given",explanation:"The notice gives start times but no duration."},
 {id:"g24",prompt:"Who can request a refresher?",options:["The supervisor","A customer","The reception visitor"],expected:"The supervisor",explanation:"The final sentence identifies the supervisor."}]},
 {id:"rental-library-03",skill:"reading",title:"Borrowing equipment",passage:"Members of the Hillview Tool Library may borrow up to three items for seven days. Renewals are possible online if no other member has reserved the item. Tools must be returned clean and complete during staffed opening hours. A member who discovers damage should stop using the item and inform the library immediately. The annual membership fee covers borrowing, but replacement consumables are purchased separately.",questions:[
 {id:"g31",prompt:"Members may borrow four items at once.",options:tf,expected:"False",explanation:"The maximum is three."},
 {id:"g32",prompt:"An item can be renewed online if nobody has reserved it.",options:tf,expected:"True",explanation:"This is the renewal condition."},
 {id:"g33",prompt:"The annual membership fee is twenty pounds.",options:tf,expected:"Not given",explanation:"No amount is specified."},
 {id:"g34",prompt:"What should a member do upon discovering damage?",options:["Stop use and inform the library","Repair it without permission","Wait until renewal"],expected:"Stop use and inform the library",explanation:"The notice instructs members to stop using damaged equipment and report it."}]}
 ]
};
export const listeningSets:ExamSet[]=[
 {id:"listening-appointment-01",skill:"listening",title:"Booking a workshop",passage:"Hello, this is the community centre. I am calling to confirm your photography workshop. We have moved it from Friday to Saturday morning because the instructor is unavailable on Friday. Please arrive at half past nine at the reception desk. You do not need to bring a camera because equipment is available. However, please bring a notebook. The workshop costs twelve pounds, payable on arrival.",questions:[
 {id:"l11",prompt:"On which day will the workshop take place?",options:["Friday","Saturday","Sunday"],expected:"Saturday",explanation:"The speaker says the workshop has moved to Saturday."},
 {id:"l12",prompt:"What time should participants arrive?",options:["9:00","9:30","10:30"],expected:"9:30",explanation:"Half past nine means 9:30."},
 {id:"l13",prompt:"What should participants bring?",options:["A camera","A notebook","A laptop"],expected:"A notebook",explanation:"The speaker asks participants to bring a notebook."},
 {id:"l14",prompt:"How much does the workshop cost?",options:["£10","£12","£20"],expected:"£12",explanation:"The fee is twelve pounds."}]},
 {id:"listening-campus-02",skill:"listening",title:"Campus orientation",passage:"Welcome to the student support centre. On Monday, new students should collect their identity cards from the main hall. The library tour begins at eleven, not ten as printed in the old timetable. Lunch is available in the garden cafe, but students who prefer to bring their own food can use the common room. In the afternoon, the careers session will take place in room fourteen on the ground floor.",questions:[
 {id:"l21",prompt:"Where should new students collect identity cards?",options:["Main hall","Library","Garden cafe"],expected:"Main hall",explanation:"The main hall is specified."},
 {id:"l22",prompt:"When does the library tour begin?",options:["10:00","11:00","12:00"],expected:"11:00",explanation:"The speaker corrects the old timetable to eleven."},
 {id:"l23",prompt:"Where can students eat their own food?",options:["Common room","Careers office","Main hall"],expected:"Common room",explanation:"The common room is designated for brought food."},
 {id:"l24",prompt:"Which room hosts the careers session?",options:["Room 4","Room 14","Room 40"],expected:"Room 14",explanation:"The speaker says room fourteen."}]}
];
