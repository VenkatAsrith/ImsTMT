const validateEmail = (email) => {
  const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(String(email).toLowerCase());
};

const validateIntern = (req, res, next) => {
  const { name, email, phone, department, joinDate, role } = req.body;
  const errors = [];

  if (!name || name.trim() === '') errors.push('Name is required');
  if (!email || !validateEmail(email)) errors.push('Valid email is required');
  if (!phone || phone.trim() === '') errors.push('Phone number is required');
  if (!department) errors.push('Department is required');
  if (!joinDate) errors.push('Join date is required');
  if (!role || role.trim() === '') errors.push('Role/title is required');

  if (errors.length > 0) {
    return res.status(400).json({ data: null, error: errors.join(', ') });
  }
  next();
};

const validateClient = (req, res, next) => {
  const { companyName } = req.body;
  const errors = [];

  if (!companyName || companyName.trim() === '') errors.push('Company name is required');

  if (errors.length > 0) {
    return res.status(400).json({ data: null, error: errors.join(', ') });
  }
  next();
};

const validateStudent = (req, res, next) => {
  const { name, email, phone } = req.body;
  const errors = [];

  if (!name || name.trim() === '') errors.push('Name is required');
  if (!email || !validateEmail(email)) errors.push('Valid email is required');
  if (!phone || phone.trim() === '') errors.push('Phone number is required');

  if (errors.length > 0) {
    return res.status(400).json({ data: null, error: errors.join(', ') });
  }
  next();
};

module.exports = {
  validateIntern,
  validateClient,
  validateStudent,
};
