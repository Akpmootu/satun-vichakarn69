import React, { useState } from 'react';

const ScheduleSection: React.FC = () => {
    const [day, setDay] = useState<11 | 12>(11);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 md:p-10 shadow-lg border border-slate-100 dark:border-slate-700 animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center text-3xl shadow-sm">
                        <i className="fa-regular fa-calendar-days"></i>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">กำหนดการนำเสนอผลงาน</h2>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                11-12 พฤษภาคม 2569 ณ สำนักงานสาธารณสุขจังหวัดสตูล และโรงพยาบาลสตูล
                            </p>
                            <a href="https://drive.google.com/file/d/105xdsev0tyhwOKWf25x7SoqHrCyEXjB-/view" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-lg border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition self-start">
                                <i className="fa-solid fa-file-pdf"></i> ดาวน์โหลดเอกสาร (PDF)
                            </a>
                        </div>
                    </div>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl shrink-0">
                    <button 
                        onClick={() => setDay(11)}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${day === 11 ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        11 พ.ค. 69
                    </button>
                    <button 
                        onClick={() => setDay(12)}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${day === 12 ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        12 พ.ค. 69
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto pb-4">
                {day === 11 && (
                    <div className="min-w-[800px]">
                        <table className="w-full text-sm text-center border-collapse">
                            <thead>
                                <tr>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300 w-32">เวลา</th>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300">ห้องประชุมแก้วโกเมน<br/><span className="text-xs font-normal text-slate-500">(รพ.สตูล)</span></th>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300">ห้องประชุมทับทิม<br/><span className="text-xs font-normal text-slate-500">(รพ.สตูล)</span></th>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300">ห้องไพลิน<br/><span className="text-xs font-normal text-slate-500">(รพ.สตูล)</span></th>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300">ห้องประชุมนครี<br/><span className="text-xs font-normal text-slate-500">(สสจ.สตูล)</span></th>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300">ห้องประชุมสะโตย<br/><span className="text-xs font-normal text-slate-500">(สสจ.สตูล)</span></th>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300">ห้องมำบัง<br/><span className="text-xs font-normal text-slate-500">(สสจ.สตูล)</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-slate-200 dark:border-slate-700 p-3 font-bold whitespace-nowrap text-slate-600 dark:text-slate-400">08.30 - 09.00</td>
                                    <td colSpan={6} className="border border-slate-200 dark:border-slate-700 p-3 text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/10 font-bold">
                                        ลงทะเบียนผู้เข้าร่วมประชุม ณ ห้องประชุมแก้วโกเมน ชั้น 4 รพ.สตูล
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 dark:border-slate-700 p-3 font-bold whitespace-nowrap text-slate-600 dark:text-slate-400">09.00 - 10.00</td>
                                    <td colSpan={6} className="border border-slate-200 dark:border-slate-700 p-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-400 font-bold">
                                        <div>พิธีเปิด โดย นายแพทย์สาธารณสุขจังหวัดสตูล</div>
                                        <div className="font-normal mt-1">กล่าวรายงานโดย แพทย์หญิงอมรรัตน์ พันธ์คีรี รองนายแพทย์สาธารณสุขจังหวัดสตูล</div>
                                        <div className="font-normal mt-1">ผู้เข้าร่วมงาน/วิทยากรทุกคนเข้าร่วมพิธีเปิดพร้อมกัน ณ ห้องประชุมแก้วโกเมน</div>
                                        <div className="text-indigo-600 dark:text-indigo-400 mt-2 font-normal text-xs md:text-sm">หลังพิธีเปิดประธานและผู้บริหารร่วมเดินชมบริเวณจุดนำเสนอผลงานโปสเตอร์ นวัตกรรม/สิ่งประดิษฐ์ ณ ห้องประชุมแก้วโกเมน</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 dark:border-slate-700 p-3 font-bold whitespace-nowrap text-slate-600 dark:text-slate-400 align-top">10.00 - 12.00</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 5<br/>การพยาบาลระดับปฐมภูมิ ทุติยภูมิ</div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 4<br/>เภสัชกรรมและการคุ้มครองผู้บริโภค</div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 11<br/>การส่งเสริมสุขภาพและอนามัยสิ่งแวดล้อม</div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 12<br/>การป้องกันและควบคุมโรค</div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 14<br/>บริหารสาธารณสุข สาธารณสุขทั่วไป หลักประกันสุขภาพ และเศรษฐกิจสุขภาพ</div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div className="mb-3">สาขาที่ 1 การแพทย์ทั่วไป</div>
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                            <div className="font-bold mb-1">เวลา 10.00 น.</div>
                                            <div>สาขาที่ 2 การแพทย์เฉพาะทาง</div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 dark:border-slate-700 p-3 font-bold whitespace-nowrap text-slate-600 dark:text-slate-400">12.00 - 13.00</td>
                                    <td colSpan={6} className="border border-slate-200 dark:border-slate-700 p-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 font-bold">
                                        พักรับประทานอาหาร
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 dark:border-slate-700 p-3 font-bold whitespace-nowrap text-slate-600 dark:text-slate-400 align-top">13.00 - 16.30</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 5 การพยาบาลระดับปฐมภูมิ ทุติยภูมิ <span className="text-sky-500">(ต่อ)</span></div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 4 เภสัชกรรมและการคุ้มครองผู้บริโภค <span className="text-sky-500">(ต่อ)</span></div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 11 การส่งเสริมสุขภาพและอนามัยสิ่งแวดล้อม <span className="text-sky-500">(ต่อ)</span></div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 12 การป้องกันและควบคุมโรค <span className="text-sky-500">(ต่อ)</span></div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 14 <span className="text-sky-500">(ต่อ)</span></div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 3 ทันตสาธารณสุข</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {day === 12 && (
                    <div className="min-w-[800px]">
                        <table className="w-full text-sm text-center border-collapse">
                            <thead>
                                <tr>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300 w-32">เวลา</th>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300">ห้องประชุมแก้วโกเมน<br/><span className="text-xs font-normal text-slate-500">(รพ.สตูล)</span></th>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300">ห้องประชุมนครี<br/><span className="text-xs font-normal text-slate-500">(สสจ.สตูล)</span></th>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300">ห้องประชุมสะโตย<br/><span className="text-xs font-normal text-slate-500">(สสจ.สตูล)</span></th>
                                    <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 font-bold text-slate-700 dark:text-slate-300">ห้องมำบัง<br/><span className="text-xs font-normal text-slate-500">(สสจ.สตูล)</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-slate-200 dark:border-slate-700 p-3 font-bold whitespace-nowrap text-slate-600 dark:text-slate-400">08.30 - 09.00</td>
                                    <td colSpan={4} className="border border-slate-200 dark:border-slate-700 p-3 text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/10 font-bold">
                                        ลงทะเบียนผู้เข้าร่วมประชุม ณ ห้องประชุมแก้วโกเมน ชั้น 4 รพ.สตูล
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 dark:border-slate-700 p-3 font-bold whitespace-nowrap text-slate-600 dark:text-slate-400 align-top">09.00 - 12.00</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300 w-[20%]">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 9 สหเวชศาสตร์</div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300 w-[30%]">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div className="mb-4">สาขาที่ 13 สุขภาพจิต ยาเสพติด</div>
                                        
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-left mt-4 border border-indigo-100 dark:border-indigo-800">
                                            <div className="font-bold text-indigo-700 dark:text-indigo-400 mb-1">เวลา 09.30 น.</div>
                                            <div className="text-sm">กรรมการสาขา 8 ประกวดโปสเตอร์ ณ โถงหน้าห้องนครี</div>
                                        </div>
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-left mt-2 border border-emerald-100 dark:border-emerald-800">
                                            <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">เวลา 11.00 น.</div>
                                            <div className="font-bold text-emerald-600 dark:text-emerald-500 mb-1">นำเสนอผลงาน Oral Presentation</div>
                                            <div className="text-sm">สาขาที่ 8 งานวิทยาศาสตร์การแพทย์</div>
                                        </div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300 w-[20%]">
                                        <div className="font-bold text-sky-600 dark:text-sky-400 mb-2">นำเสนอผลงาน</div>
                                        <div>สาขาที่ 15 ดิจิทัลสุขภาพ</div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300 w-[30%]">
                                        <div className="mb-4">
                                            <div>สาขาที่ 6 การพยาบาลระดับตติยภูมิดีเลิศ</div>
                                            <div className="mt-2 text-rose-600 dark:text-rose-400 font-bold">สาขาที่ 7 การบริหารการพยาบาล (ระดับM)</div>
                                        </div>
                                        
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-left mt-4 border border-indigo-100 dark:border-indigo-800">
                                            <div className="font-bold text-indigo-700 dark:text-indigo-400 mb-1">เวลา 09.00 น.</div>
                                            <div className="text-sm">กรรมการสาขา 10 ประกวดโปสเตอร์ ณ โถงหน้าห้องประชุม</div>
                                        </div>
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-left mt-2 border border-emerald-100 dark:border-emerald-800">
                                            <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">เวลา 10.30 น.</div>
                                            <div className="font-bold text-emerald-600 dark:text-emerald-500 mb-1">นำเสนอผลงาน Oral Presentation</div>
                                            <div className="text-sm">สาขาที่ 10 การแพทย์แผนไทยและการแพทย์ทางเลือก</div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 dark:border-slate-700 p-3 font-bold whitespace-nowrap text-slate-600 dark:text-slate-400">12.00 - 13.00</td>
                                    <td colSpan={4} className="border border-slate-200 dark:border-slate-700 p-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 font-bold">
                                        พักรับประทานอาหาร
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 dark:border-slate-700 p-3 font-bold whitespace-nowrap text-slate-600 dark:text-slate-400 align-top">13.00 - 15.00</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">นำเสนอผลงาน Oral Presentation</div>
                                        <div>สาขาที่ 8 งานวิทยาศาสตร์การแพทย์ <span className="text-emerald-500">(ต่อ)</span></div>
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                    </td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-4 align-top text-slate-700 dark:text-slate-300">
                                        <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">นำเสนอผลงาน Oral Presentation</div>
                                        <div>สาขาที่ 10 การแพทย์แผนไทยและการแพทย์ทางเลือก <span className="text-emerald-500">(ต่อ)</span></div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 dark:border-slate-700 p-3 font-bold whitespace-nowrap text-slate-600 dark:text-slate-400">15.00 - 16.00</td>
                                    <td colSpan={4} className="border border-slate-200 dark:border-slate-700 p-4 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10 font-bold">
                                        พิธีมอบเกียรติบัตรมหกรรมวิชาการ
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 dark:border-slate-700 p-3 font-bold whitespace-nowrap text-slate-600 dark:text-slate-400">16.00 - 16.30</td>
                                    <td colSpan={4} className="border border-slate-200 dark:border-slate-700 p-4 font-bold text-slate-600 dark:text-slate-400">
                                        ปิดการประชุม
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs border border-slate-100 dark:border-slate-800 flex gap-3 items-start">
                <i className="fa-solid fa-circle-info text-sky-500 mt-0.5"></i>
                <div className="space-y-1 w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p><b>หมายเหตุ:</b> เวลา 10.30 - 10.45 น. และ เวลา 15.00 - 15.15 น. พักรับประทานอาหารว่าง</p>
                        <p className="mt-1">เวลา 12.00 - 13.00 น. พักรับประทานอาหารกลางวัน</p>
                    </div>
                    <div className="text-slate-400 text-right italic">* กำหนดการอาจเปลี่ยนแปลงได้ตามความเหมาะสม</div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleSection;
