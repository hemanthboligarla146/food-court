const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { verifyPassword, hashPassword } = require('../utils/hash');
const serializeData = require('../utils/serialize');

const JWT_SECRET = process.env.JWT_SECRET || 'django-insecure-5vboyrda1qm*e%g+u3+q2w9_c#01z5vwa^v+s-6tr5f-9-9xik';

function generateTokens(user) {
  const payload = {
    user_id: Number(user.id),
    username: user.username,
    email: user.email,
    is_staff: user.is_staff
  };
  const access = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  const refresh = jwt.sign({ user_id: Number(user.id) }, JWT_SECRET, { expiresIn: '30d' });
  return { access, refresh };
}

function formatUserResponse(user) {
  return {
    id: Number(user.id),
    username: user.username,
    email: user.email,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone_number: user.phone_number || '',
    address: user.address || '',
    profile_picture: user.profile_picture ? `/media/${user.profile_picture}` : null,
    is_staff: user.is_staff || false
  };
}

async function register(req, res, next) {
  try {
    const { username, email, password, first_name, last_name, phone_number, address } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ detail: 'Username, email, and password are required.' });
    }

    const existingUser = await prisma.users_user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ detail: 'A user with that username or email already exists.' });
    }

    let profile_picture = null;
    if (req.file) {
      profile_picture = `profiles/${req.file.filename}`;
    }

    const hashedPassword = hashPassword(password);
    const user = await prisma.users_user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        first_name: first_name || '',
        last_name: last_name || '',
        phone_number: phone_number || '',
        address: address || '',
        profile_picture,
        is_staff: false,
        is_superuser: false,
        is_active: true,
        date_joined: new Date(),
        last_login: new Date()
      }
    });

    const tokens = generateTokens(user);
    res.status(201).json({
      user: formatUserResponse(user),
      ...tokens
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password are required.' });
    }

    const user = await prisma.users_user.findUnique({
      where: { username }
    });

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ detail: 'No active account found with the given credentials', code: 'no_active_account' });
    }

    await prisma.users_user.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    const tokens = generateTokens(user);
    res.status(200).json({
      user: formatUserResponse(user),
      ...tokens
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refresh } = req.body;
    if (!refresh) {
      return res.status(400).json({ detail: 'Refresh token is required.' });
    }

    jwt.verify(refresh, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ detail: 'Invalid or expired refresh token.' });
      }

      const user = await prisma.users_user.findUnique({
        where: { id: BigInt(decoded.user_id) }
      });

      if (!user) {
        return res.status(401).json({ detail: 'User not found.' });
      }

      const payload = {
        user_id: Number(user.id),
        username: user.username,
        email: user.email,
        is_staff: user.is_staff
      };
      const access = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
      res.status(200).json({ access });
    });
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    res.status(200).json(formatUserResponse(req.user));
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { first_name, last_name, phone_number, address } = req.body;
    
    // Handle optional file upload if present
    let profile_picture = req.user.profile_picture;
    if (req.file) {
      profile_picture = `profiles/${req.file.filename}`;
    }

    const updatedUser = await prisma.users_user.update({
      where: { id: req.user.id },
      data: {
        first_name: first_name !== undefined ? first_name : req.user.first_name,
        last_name: last_name !== undefined ? last_name : req.user.last_name,
        phone_number: phone_number !== undefined ? phone_number : req.user.phone_number,
        address: address !== undefined ? address : req.user.address,
        profile_picture
      }
    });

    res.status(200).json(formatUserResponse(updatedUser));
  } catch (err) {
    next(err);
  }
}

async function listAddresses(req, res, next) {
  try {
    const addresses = await prisma.users_address.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json(serializeData(addresses));
  } catch (err) {
    next(err);
  }
}

async function createAddress(req, res, next) {
  try {
    const { title, street_address, city, zip_code, is_default } = req.body;

    if (is_default) {
      await prisma.users_address.updateMany({
        where: { user_id: req.user.id },
        data: { is_default: false }
      });
    }

    const address = await prisma.users_address.create({
      data: {
        user_id: req.user.id,
        title: title || 'Home',
        street_address,
        city,
        zip_code,
        is_default: !!is_default,
        created_at: new Date()
      }
    });

    res.status(201).json(serializeData(address));
  } catch (err) {
    next(err);
  }
}

async function updateAddress(req, res, next) {
  try {
    const { id } = req.params;
    const { title, street_address, city, zip_code, is_default } = req.body;

    if (is_default) {
      await prisma.users_address.updateMany({
        where: { user_id: req.user.id },
        data: { is_default: false }
      });
    }

    const address = await prisma.users_address.update({
      where: { id: BigInt(id), user_id: req.user.id },
      data: {
        title,
        street_address,
        city,
        zip_code,
        is_default: !!is_default
      }
    });

    res.status(200).json(serializeData(address));
  } catch (err) {
    next(err);
  }
}

async function deleteAddress(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.users_address.delete({
      where: { id: BigInt(id), user_id: req.user.id }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    const payments = await prisma.users_paymentmethod.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json(serializeData(payments));
  } catch (err) {
    next(err);
  }
}

async function createPayment(req, res, next) {
  try {
    const { card_type, last_four_digits, expiry_date, is_default } = req.body;

    if (is_default) {
      await prisma.users_paymentmethod.updateMany({
        where: { user_id: req.user.id },
        data: { is_default: false }
      });
    }

    const payment = await prisma.users_paymentmethod.create({
      data: {
        user_id: req.user.id,
        card_type: card_type || 'Visa',
        last_four_digits,
        expiry_date,
        is_default: !!is_default,
        created_at: new Date()
      }
    });

    res.status(201).json(serializeData(payment));
  } catch (err) {
    next(err);
  }
}

async function updatePayment(req, res, next) {
  try {
    const { id } = req.params;
    const { card_type, last_four_digits, expiry_date, is_default } = req.body;

    if (is_default) {
      await prisma.users_paymentmethod.updateMany({
        where: { user_id: req.user.id },
        data: { is_default: false }
      });
    }

    const payment = await prisma.users_paymentmethod.update({
      where: { id: BigInt(id), user_id: req.user.id },
      data: {
        card_type,
        last_four_digits,
        expiry_date,
        is_default: !!is_default
      }
    });

    res.status(200).json(serializeData(payment));
  } catch (err) {
    next(err);
  }
}

async function deletePayment(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.users_paymentmethod.delete({
      where: { id: BigInt(id), user_id: req.user.id }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  refresh,
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  listPayments,
  createPayment,
  updatePayment,
  deletePayment
};
