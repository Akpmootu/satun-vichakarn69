import { BranchOption, WorkTypeOption } from './types';

export const APP_NAME = "SKMS";
export const BUDGET_YEAR = 2569;

export const WORK_TYPES: WorkTypeOption[] = [
  { id: "oral", label: "KM Presentation (นำเสนอผลงาน)", icon: "fa-person-chalkboard" },
  { id: "eposter", label: "Infographic / e-Poster", icon: "fa-image" },
  { id: "innovation", label: "นวัตกรรมและสิ่งประดิษฐ์", icon: "fa-lightbulb" },
  { id: "bestpractice", label: "Best Practice (ถอดบทเรียน)", icon: "fa-book-bookmark" },
];

export const BRANCHES: BranchOption[] = [
  { id: 1, label: "การแพทย์ระดับปฐมภูมิและทุติยภูมิ" },
  { id: 2, label: "การแพทย์ระดับตติยภูมิและศูนย์ความเป็นเลิศ" },
  { id: 3, label: "ทันตสาธารณสุข" },
  { id: 4, label: "เภสัชกรรมและการคุ้มครองผู้บริโภค" },
  { id: 5, label: "การพยาบาลระดับปฐมภูมิ" },
  { id: 6, label: "การพยาบาลระดับทุติยภูมิ" },
  { id: 7, label: "การพยาบาลระดับตติยภูมิและศูนย์ความเป็นเลิศ" },
  { id: 8, label: "การบริหารการพยาบาล" },
  { id: 9, label: "สารสนเทศทางการพยาบาล" },
  { id: 10, label: "งานวิทยาศาสตร์การแพทย์" },
  { id: 11, label: "สหเวชศาสตร์ (กายภาพ, เทคนิคการแพทย์)" },
  { id: 12, label: "การแพทย์แผนไทยและการแพทย์ทางเลือก" },
  { id: 13, label: "การส่งเสริมสุขภาพ (Health Promotion)" },
  { id: 14, label: "อนามัยสิ่งแวดล้อม" },
  { id: 15, label: "การป้องกันและควบคุมโรค (DDC)" },
  { id: 16, label: "สุขภาพจิต ยาเสพติด" },
  { id: 17, label: "ผู้สูงอายุ ผู้พิการ (LTC)" },
  { id: 18, label: "บริหารสาธารณสุข และนโยบาย" },
  { id: 19, label: "หลักประกันสุขภาพและเศรษฐกิจสุขภาพ" },
  { id: 20, label: "ดิจิทัลสุขภาพ (Digital Health)" },
];

export const PR_NEWS = [
  {
    id: 1,
    title: "เปิดเวทีแลกเปลี่ยนเรียนรู้ SKMS Forum 2569",
    date: "15 ก.พ. 2569",
    desc: "ขอเชิญบุคลากรสาธารณสุขร่วมส่งผลงานถอดบทเรียน (Best Practice) และนวัตกรรม เพื่อยกระดับระบบบริการ",
    type: "news",
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "แนวทางการเขียนผลงานวิชาการและ KM",
    date: "10 ก.พ. 2569",
    desc: "ดาวน์โหลดคู่มือการเขียนถอดบทเรียน (Knowledge Capture) ฉบับสมบูรณ์",
    type: "download",
    fileType: "PDF"
  },
  {
    id: 3,
    title: "คู่มือการใช้งานระบบ SKMS",
    date: "01 ก.พ. 2569",
    desc: "ขั้นตอนการลงทะเบียนและส่งผลงานเข้าสู่คลังความรู้กลาง",
    type: "download",
    fileType: "PDF"
  }
];

export const LOADING_QUOTES = [
  "Knowledge is power. Knowledge shared is power multiplied.",
  "ต้นน้ำ: รวบรวมองค์ความรู้จากหน้างานจริง",
  "กลางน้ำ: จัดระเบียบและสังเคราะห์ให้เป็นระบบ",
  "ปลายน้ำ: เผยแพร่และนำไปใช้ประโยชน์สูงสุด",
  "SKMS: ขับเคลื่อนสาธารณสุขด้วยปัญญา",
  "การเรียนรู้ไม่มีที่สิ้นสุด พัฒนางาน พัฒนาคน"
];