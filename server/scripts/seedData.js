// Fictional demo data. No real people, patients or hospitals are represented.
// Email addresses use the reserved .example domain so they can never reach a
// real inbox.

export const departments = [
  { slug: 'cardiology', name: 'Cardiology', icon: 'heart-pulse', floor: 'Block A, 2nd floor', description: 'Chest pain review, blood pressure management, ECG and echo referrals, follow-up after cardiac procedures.' },
  { slug: 'dermatology', name: 'Dermatology', icon: 'scan-face', floor: 'Block B, ground floor', description: 'Skin, hair and nail conditions — acne, eczema, fungal infections, allergies and mole checks.' },
  { slug: 'orthopaedics', name: 'Orthopaedics', icon: 'bone', floor: 'Block A, 1st floor', description: 'Joint pain, fractures, back and neck problems, sports injuries and post-surgery reviews.' },
  { slug: 'paediatrics', name: 'Paediatrics', icon: 'baby', floor: 'Block C, ground floor', description: 'Care for children up to 16 years: fever, growth checks, vaccinations and newborn follow-up.' },
  { slug: 'general-medicine', name: 'General Medicine', icon: 'stethoscope', floor: 'Block B, 1st floor', description: 'First consultation for adults — fever, infections, diabetes, thyroid and long-term conditions.' },
  { slug: 'ent', name: 'ENT', icon: 'ear', floor: 'Block B, 2nd floor', description: 'Ear, nose and throat: hearing problems, sinusitis, tonsillitis and voice complaints.' },
  { slug: 'obstetrics-gynaecology', name: 'Obstetrics & Gynaecology', icon: 'flower-2', floor: 'Block C, 1st floor', description: 'Antenatal check-ups, menstrual health, fertility consultations and post-natal care.' },
  { slug: 'ophthalmology', name: 'Ophthalmology', icon: 'eye', floor: 'Block A, ground floor', description: 'Vision tests, cataract assessment, diabetic eye screening and eye infections.' },
];

const week = (days, start, end) => days.map((dayOfWeek) => ({ dayOfWeek, start, end }));
const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6;

export const doctors = [
  {
    name: 'Kavya Raman', email: 'kavya.raman@carepoint.example', department: 'cardiology', gender: 'female',
    specialty: 'Interventional Cardiology', qualifications: ['MBBS', 'MD (General Medicine)', 'DM (Cardiology)'],
    experienceYears: 14, consultationFee: 800, slotMinutes: 20, room: 'A-214', languages: ['English', 'Telugu', 'Tamil'], isFeatured: true,
    bio: 'Sees patients with chest pain, breathlessness and high blood pressure, and follows up patients after angioplasty.',
    weeklySchedule: week([MON, WED, FRI], '09:00', '13:00'),
  },
  {
    name: 'Arjun Varma', email: 'arjun.varma@carepoint.example', department: 'cardiology', gender: 'male',
    specialty: 'Clinical Cardiology', qualifications: ['MBBS', 'MD (Medicine)', 'DNB (Cardiology)'],
    experienceYears: 9, consultationFee: 700, slotMinutes: 20, room: 'A-216', languages: ['English', 'Telugu', 'Hindi'],
    bio: 'Focuses on heart-rhythm problems, cholesterol management and cardiac risk assessment before surgery.',
    weeklySchedule: week([TUE, THU, SAT], '10:00', '14:00'),
  },
  {
    name: 'Meera Iyer', email: 'meera.iyer@carepoint.example', department: 'dermatology', gender: 'female',
    specialty: 'Dermatology', qualifications: ['MBBS', 'MD (Dermatology, Venereology & Leprosy)'],
    experienceYears: 8, consultationFee: 500, slotMinutes: 15, room: 'B-012', languages: ['English', 'Tamil', 'Hindi'], isFeatured: true,
    bio: 'Treats acne, eczema, psoriasis and fungal infections. Evening clinic suits college students and working patients.',
    weeklySchedule: week([MON, TUE, WED, THU, FRI], '15:00', '18:00'),
  },
  {
    name: 'Siddharth Rao', email: 'siddharth.rao@carepoint.example', department: 'orthopaedics', gender: 'male',
    specialty: 'Joint Replacement', qualifications: ['MBBS', 'MS (Orthopaedics)', 'Fellowship in Arthroplasty'],
    experienceYears: 16, consultationFee: 750, slotMinutes: 15, room: 'A-108', languages: ['English', 'Telugu'],
    bio: 'Assesses knee and hip arthritis and reviews patients before and after joint replacement.',
    weeklySchedule: [...week([MON, TUE, THU], '09:30', '12:30'), ...week([SAT], '09:30', '11:30')],
  },
  {
    name: 'Farah Khan', email: 'farah.khan@carepoint.example', department: 'orthopaedics', gender: 'female',
    specialty: 'Sports Injuries', qualifications: ['MBBS', 'MS (Orthopaedics)'],
    experienceYears: 7, consultationFee: 600, slotMinutes: 20, room: 'A-110', languages: ['English', 'Hindi', 'Urdu'],
    bio: 'Sees ligament sprains, shoulder injuries and overuse pain in athletes and active adults.',
    weeklySchedule: week([WED, FRI], '14:00', '17:00'),
  },
  {
    name: 'Lakshmi Narayana', email: 'lakshmi.narayana@carepoint.example', department: 'paediatrics', gender: 'female',
    specialty: 'Paediatrics', qualifications: ['MBBS', 'DCH', 'MD (Paediatrics)'],
    experienceYears: 20, consultationFee: 450, slotMinutes: 15, room: 'C-004', languages: ['English', 'Telugu'], isFeatured: true,
    bio: 'General paediatric consultations, growth and development checks, and the childhood vaccination schedule.',
    weeklySchedule: week([MON, TUE, WED, THU, FRI, SAT], '09:00', '12:00'),
  },
  {
    name: 'Rohan Mehta', email: 'rohan.mehta@carepoint.example', department: 'paediatrics', gender: 'male',
    specialty: 'Neonatology', qualifications: ['MBBS', 'MD (Paediatrics)', 'DM (Neonatology)'],
    experienceYears: 6, consultationFee: 550, slotMinutes: 20, room: 'C-006', languages: ['English', 'Hindi', 'Gujarati'],
    bio: 'Follows up newborns after discharge, including preterm babies and feeding concerns.',
    weeklySchedule: week([TUE, THU], '16:00', '19:00'),
  },
  {
    name: 'Anitha Reddy', email: 'anitha.reddy@carepoint.example', department: 'general-medicine', gender: 'female',
    specialty: 'Internal Medicine', qualifications: ['MBBS', 'MD (General Medicine)'],
    experienceYears: 11, consultationFee: 400, slotMinutes: 15, room: 'B-104', languages: ['English', 'Telugu', 'Kannada'], isFeatured: true,
    bio: 'First point of contact for adults with fever, infections, fatigue or unexplained symptoms.',
    weeklySchedule: week([MON, TUE, WED, THU, FRI, SAT], '08:30', '12:30'),
  },
  {
    name: 'Vikram Chowdary', email: 'vikram.chowdary@carepoint.example', department: 'general-medicine', gender: 'male',
    specialty: 'Diabetology', qualifications: ['MBBS', 'MD (General Medicine)', 'Fellowship in Diabetology'],
    experienceYears: 13, consultationFee: 500, slotMinutes: 15, room: 'B-108', languages: ['English', 'Telugu'],
    bio: 'Manages type 1 and type 2 diabetes, insulin adjustment and thyroid disorders.',
    weeklySchedule: week([MON, WED, FRI], '16:00', '19:00'),
  },
  {
    name: 'Priya Subramanian', email: 'priya.subramanian@carepoint.example', department: 'ent', gender: 'female',
    specialty: 'ENT Surgery', qualifications: ['MBBS', 'MS (ENT)'],
    experienceYears: 10, consultationFee: 500, slotMinutes: 15, room: 'B-210', languages: ['English', 'Tamil', 'Telugu'],
    bio: 'Sinus problems, recurrent tonsillitis, ear infections and hearing assessment referrals.',
    weeklySchedule: week([TUE, WED, SAT], '10:00', '13:00'),
  },
  {
    name: 'Sneha Kulkarni', email: 'sneha.kulkarni@carepoint.example', department: 'obstetrics-gynaecology', gender: 'female',
    specialty: 'Obstetrics', qualifications: ['MBBS', 'MS (Obstetrics & Gynaecology)'],
    experienceYears: 12, consultationFee: 650, slotMinutes: 20, room: 'C-112', languages: ['English', 'Marathi', 'Hindi'],
    bio: 'Antenatal check-ups through each trimester, menstrual concerns and post-natal reviews.',
    weeklySchedule: week([MON, TUE, THU, FRI], '10:00', '13:00'),
  },
  {
    name: 'Naveen Prasad', email: 'naveen.prasad@carepoint.example', department: 'ophthalmology', gender: 'male',
    specialty: 'Cataract & Refractive Surgery', qualifications: ['MBBS', 'MS (Ophthalmology)'],
    experienceYears: 15, consultationFee: 550, slotMinutes: 15, room: 'A-022', languages: ['English', 'Telugu', 'Hindi'],
    bio: 'Cataract evaluation, spectacle power checks and diabetic retinopathy screening.',
    weeklySchedule: week([MON, WED, THU, SAT], '09:00', '12:00'),
  },
];

export const samplePatients = [
  { name: 'Ravi Teja (sample)', email: 'patient@carepoint.example', phone: '9876500001', patientProfile: { gender: 'male', dateOfBirth: new Date('1998-04-12'), address: 'Bhimavaram (fictional)' } },
  { name: 'Divya Sri (sample)', email: 'divya.sample@carepoint.example', phone: '9876500002', patientProfile: { gender: 'female', dateOfBirth: new Date('2001-09-30') } },
  { name: 'Mahesh Babu K (sample)', email: 'mahesh.sample@carepoint.example', phone: '9876500003', patientProfile: { gender: 'male', dateOfBirth: new Date('1975-01-18') } },
  { name: 'Haritha P (sample)', email: 'haritha.sample@carepoint.example', phone: '9876500004', patientProfile: { gender: 'female', dateOfBirth: new Date('1989-06-05') } },
];

export const sampleReasons = [
  'Follow-up after blood test results',
  'Recurring headache for two weeks',
  'Knee pain while climbing stairs',
  'Skin rash on both arms',
  'Routine check-up and BP review',
  'Child has fever since yesterday',
  'Blurred vision while reading',
  'Ear pain and blocked feeling',
];
