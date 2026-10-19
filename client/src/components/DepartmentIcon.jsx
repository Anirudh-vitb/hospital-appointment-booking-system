import { Stethoscope } from 'lucide-react';
import { DEPARTMENT_ICONS } from '../utils/departmentIcons.js';

export default function DepartmentIcon({ name, className = 'size-5' }) {
  const Icon = DEPARTMENT_ICONS[name] || Stethoscope;
  return <Icon className={className} aria-hidden="true" />;
}
