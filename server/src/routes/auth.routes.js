const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { signToken } = require('../lib/auth');

const router = express.Router();

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'tenant'
  );
}

// Creates a brand new tenant (artist/label/agency) plus its first owner user.
// This is the SaaS signup path - each call makes a fully isolated tenant.
router.post('/signup', async (req, res) => {
  const { tenantName, name, email, password } = req.body;
  if (!tenantName || !name || !email || !password) {
    return res.status(400).json({ error: 'tenantName, name, email and password are required' });
  }
  if (password.length < 10) {
    return res.status(400).json({ error: 'Password must be at least 10 characters' });
  }

  const baseSlug = slugify(tenantName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      slug,
      users: {
        create: { email: email.toLowerCase(), name, passwordHash, role: 'OWNER' },
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0];
  const token = signToken({ id: user.id, tenantId: tenant.id, role: user.role });
  res.status(201).json({ token, tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } });
});

router.post('/login', async (req, res) => {
  const { tenantSlug, email, password } = req.body;
  if (!tenantSlug || !email || !password) {
    return res.status(400).json({ error: 'tenantSlug, email and password are required' });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return res.status(401).json({ error: 'Invalid credentials' });

  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
  });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user);
  res.json({ token, tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } });
});

module.exports = router;
