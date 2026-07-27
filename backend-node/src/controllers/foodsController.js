const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const serializeData = require('../utils/serialize');

const { formatFood, formatReview } = require('../utils/formatters');

async function listCategories(req, res, next) {
  try {
    const categories = await prisma.foods_category.findMany({
      orderBy: { id: 'asc' }
    });
    const formatted = categories.map(cat => ({
      id: Number(cat.id),
      name: cat.name,
      description: cat.description || '',
      image: cat.image ? `/media/${cat.image}` : null,
      created_at: cat.created_at
    }));
    res.status(200).json(formatted);
  } catch (err) {
    next(err);
  }
}

async function listFoods(req, res, next) {
  try {
    const { category, is_featured, is_trending, search, ordering } = req.query;

    const where = {};

    if (category) {
      where.category_id = BigInt(category);
    }
    if (is_featured !== undefined) {
      where.is_featured = is_featured === 'true';
    }
    if (is_trending !== undefined) {
      where.is_trending = is_trending === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          foods_category: {
            name: { contains: search, mode: 'insensitive' }
          }
        }
      ];
    }

    let orderBy = { created_at: 'desc' };
    if (ordering) {
      if (ordering === 'price') orderBy = { price: 'asc' };
      else if (ordering === '-price') orderBy = { price: 'desc' };
      else if (ordering === 'created_at') orderBy = { created_at: 'asc' };
      else if (ordering === '-created_at') orderBy = { created_at: 'desc' };
    }

    const foods = await prisma.foods_food.findMany({
      where,
      orderBy,
      include: {
        foods_category: true,
        foods_review: {
          include: {
            users_user: true
          }
        }
      }
    });

    res.status(200).json(foods.map(formatFood));
  } catch (err) {
    next(err);
  }
}

async function getFoodDetail(req, res, next) {
  try {
    const { id } = req.params;
    const food = await prisma.foods_food.findUnique({
      where: { id: BigInt(id) },
      include: {
        foods_category: true,
        foods_review: {
          include: {
            users_user: true
          }
        }
      }
    });

    if (!food) {
      return res.status(404).json({ detail: 'Not found.' });
    }

    res.status(200).json(formatFood(food));
  } catch (err) {
    next(err);
  }
}

async function createReview(req, res, next) {
  try {
    const { id } = req.params; // food ID
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({ detail: 'Rating is required.' });
    }

    const review = await prisma.foods_review.create({
      data: {
        user_id: req.user.id,
        food_id: BigInt(id),
        rating: parseInt(rating, 10),
        comment: comment || '',
        created_at: new Date()
      },
      include: {
        users_user: true
      }
    });

    res.status(201).json(formatReview(review));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCategories,
  listFoods,
  getFoodDetail,
  createReview
};
