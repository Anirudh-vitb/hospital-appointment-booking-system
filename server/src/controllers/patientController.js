import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';

export function getProfile(req, res) {
  ok(res, req.user.toSafeJSON());
}

export async function updateProfile(req, res) {
  const { name, phone, patientProfile } = req.valid.body;
  const user = req.user;
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (patientProfile) {
    for (const [key, value] of Object.entries(patientProfile)) {
      user.patientProfile[key] = value === null || value === '' ? undefined : value;
    }
  }
  await user.save();
  ok(res, user.toSafeJSON());
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.valid.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.checkPassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect.', [{ field: 'currentPassword', message: 'Incorrect password' }]);
  }
  await user.setPassword(newPassword);
  await user.save();
  ok(res, { updated: true });
}
