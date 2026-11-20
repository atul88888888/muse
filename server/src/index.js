require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth.routes');
const tenantsRoutes = require('./routes/tenants.routes');
const tracksRoutes = require('./routes/tracks.routes');
const rightsRoutes = require('./routes/rights.routes');
const contactsRoutes = require('./routes/contacts.routes');
const companiesRoutes = require('./routes/companies.routes');
const opportunitiesRoutes = require('./routes/opportunities.routes');
const matchesRoutes = require('./routes/matches.routes');
const outreachRoutes = require('./routes/outreach.routes');
const dealsRoutes = require('./routes/deals.routes');
const publicRoutes = require('./routes/public.routes');
const scheduler = require('./services/scheduler');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);

// Everything below this line is tenant-scoped and requires a valid JWT.
app.use('/api/tenants', requireAuth, tenantsRoutes);
app.use('/api/tracks', requireAuth, tracksRoutes);
app.use('/api/rights', requireAuth, rightsRoutes);
app.use('/api/contacts', requireAuth, contactsRoutes);
app.use('/api/companies', requireAuth, companiesRoutes);
app.use('/api/opportunities', requireAuth, opportunitiesRoutes);
app.use('/api/matches', requireAuth, matchesRoutes);
app.use('/api/outreach', requireAuth, outreachRoutes);
app.use('/api/deals', requireAuth, dealsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`sync-licensing-server listening on :${PORT}`);
  scheduler.start();
});
