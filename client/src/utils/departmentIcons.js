import { Baby, Bone, Ear, Eye, Flower2, HeartPulse, ScanFace, Stethoscope } from 'lucide-react';

// The API stores an icon name per department; this maps it to a component.
export const DEPARTMENT_ICONS = {
  'heart-pulse': HeartPulse,
  'scan-face': ScanFace,
  bone: Bone,
  baby: Baby,
  stethoscope: Stethoscope,
  ear: Ear,
  'flower-2': Flower2,
  eye: Eye,
};

export const DEPARTMENT_ICON_NAMES = Object.keys(DEPARTMENT_ICONS);
