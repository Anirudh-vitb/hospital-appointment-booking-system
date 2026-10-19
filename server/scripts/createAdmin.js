// Creates (or resets) the administrator account. Administrator accounts can
// only be created this way — by someone with access to the server environment
// and database — never through public registration.
//
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-pass1' npm run create-admin
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import { passwordBody } from '../src/validators/schemas.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.');
  passwordBody.shape.newPassword.parse(password);
  await connectDB();
  await User.init();
  let user = await User.findOne({ email });
  if (user && user.role !== 'admin') throw new Error(`${email} already belongs to a ${user.role} account.`);
  if (!user) user = new User({ email, name: 'CarePoint Administrator', role: 'admin' });
  user.isActive = true;
  await user.setPassword(password);
  await user.save();
  console.log(`[admin] administrator ready: ${email}`);
}

main()
  .catch((error) => {
    console.error('[admin] failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
