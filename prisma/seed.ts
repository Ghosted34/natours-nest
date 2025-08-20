import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';
import { Role } from 'src/auth/dto';
import { generateEmployeeId, setDefaultPermissions } from 'src/utils/staff';

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = process.env.SUPER_EMAIL;
  const superAdminPassword = process.env.SUPER_PWD;

  // Hash the password
  const hashedPassword: string = await hash(superAdminPassword);

  // Upsert super admin in staff table
  await prisma.staff.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: superAdminEmail,
      password: hashedPassword,
      role: 'admin', // Adjust according to your schema
      isActive: true,
      employeeId: generateEmployeeId({
        firstName: 'Super',
        lastName: 'Admin',
      }),
      department: 'Administration',
      permissions: setDefaultPermissions(Role.admin),
    },
  });

  console.log('Super admin seeded successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0); // success exit
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1); // error exit
  });
