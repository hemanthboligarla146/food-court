const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { formatCartItem, formatWishlistItem, formatOrder } = require('../utils/formatters');
const serializeData = require('../utils/serialize');

// Helper to include complete food details with category and reviews
const foodInclude = {
  include: {
    foods_food: {
      include: {
        foods_category: true,
        foods_review: {
          include: {
            users_user: true
          }
        }
      }
    }
  }
};

const orderInclude = {
  include: {
    orders_orderitem: {
      include: {
        foods_food: {
          include: {
            foods_category: true,
            foods_review: {
              include: {
                users_user: true
              }
            }
          }
        }
      }
    }
  }
};

async function listCart(req, res, next) {
  try {
    const items = await prisma.orders_cart.findMany({
      where: { user_id: req.user.id },
      ...foodInclude,
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json(items.map(formatCartItem));
  } catch (err) {
    next(err);
  }
}

async function addToCart(req, res, next) {
  try {
    const { food, size, quantity } = req.body;

    if (!food) {
      return res.status(400).json({ detail: 'Food ID is required.' });
    }

    const foodItem = await prisma.foods_food.findUnique({
      where: { id: BigInt(food) }
    });
    if (!foodItem) {
      return res.status(404).json({ detail: 'Food item not found.' });
    }

    // Check if item already in cart
    const existing = await prisma.orders_cart.findFirst({
      where: {
        user_id: req.user.id,
        food_id: BigInt(food),
        size: size || 'Medium'
      },
      ...foodInclude
    });

    let cartItem;
    if (existing) {
      cartItem = await prisma.orders_cart.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (parseInt(quantity, 10) || 1) },
        ...foodInclude
      });
    } else {
      cartItem = await prisma.orders_cart.create({
        data: {
          user_id: req.user.id,
          food_id: BigInt(food),
          size: size || 'Medium',
          quantity: parseInt(quantity, 10) || 1,
          created_at: new Date()
        },
        ...foodInclude
      });
    }

    res.status(201).json(formatCartItem(cartItem));
  } catch (err) {
    next(err);
  }
}

async function deleteCartItem(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.orders_cart.delete({
      where: { id: BigInt(id), user_id: req.user.id }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listWishlist(req, res, next) {
  try {
    const items = await prisma.orders_wishlist.findMany({
      where: { user_id: req.user.id },
      ...foodInclude,
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json(items.map(formatWishlistItem));
  } catch (err) {
    next(err);
  }
}

async function addToWishlist(req, res, next) {
  try {
    const { food } = req.body;

    if (!food) {
      return res.status(400).json({ detail: 'Food ID is required.' });
    }

    const foodItem = await prisma.foods_food.findUnique({
      where: { id: BigInt(food) }
    });
    if (!foodItem) {
      return res.status(404).json({ detail: 'Food item not found.' });
    }

    const existing = await prisma.orders_wishlist.findFirst({
      where: {
        user_id: req.user.id,
        food_id: BigInt(food)
      },
      ...foodInclude
    });

    if (existing) {
      return res.status(200).json(formatWishlistItem(existing));
    }

    const item = await prisma.orders_wishlist.create({
      data: {
        user_id: req.user.id,
        food_id: BigInt(food),
        created_at: new Date()
      },
      ...foodInclude
    });

    res.status(201).json(formatWishlistItem(item));
  } catch (err) {
    next(err);
  }
}

async function deleteWishlistItem(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.orders_wishlist.delete({
      where: { id: BigInt(id), user_id: req.user.id }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listOrders(req, res, next) {
  try {
    const orders = await prisma.orders_order.findMany({
      where: { user_id: req.user.id },
      ...orderInclude,
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json(orders.map(formatOrder));
  } catch (err) {
    next(err);
  }
}

async function createOrder(req, res, next) {
  try {
    const { address, payment_method, delivery_fee, discount } = req.body;

    const cartItems = await prisma.orders_cart.findMany({
      where: { user_id: req.user.id },
      include: {
        foods_food: true
      }
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ detail: 'Cart is empty' });
    }

    let totalFoodAmount = 0;
    for (const item of cartItems) {
      const multiplier = item.size === 'Small' ? 0.8 : (item.size === 'Large' ? 1.2 : 1.0);
      const itemPrice = Number(item.foods_food.price) * multiplier;
      totalFoodAmount += itemPrice * item.quantity;
    }

    const dFee = Number(delivery_fee || 0);
    const disc = Number(discount || 0);
    const totalAmount = totalFoodAmount + dFee - disc;

    const order = await prisma.orders_order.create({
      data: {
        user_id: req.user.id,
        status: 'Pending',
        total_amount: totalAmount,
        delivery_fee: dFee,
        discount: disc,
        address: address || '',
        payment_method: payment_method || 'Cash on Delivery',
        is_reviewed: false,
        created_at: new Date()
      }
    });

    // Create Order Items
    for (const item of cartItems) {
      const multiplier = item.size === 'Small' ? 0.8 : (item.size === 'Large' ? 1.2 : 1.0);
      const itemPrice = Number(item.foods_food.price) * multiplier;
      
      await prisma.orders_orderitem.create({
        data: {
          order_id: order.id,
          food_id: item.food_id,
          size: item.size,
          quantity: item.quantity,
          price: itemPrice
        }
      });
    }

    // Clear Cart
    await prisma.orders_cart.deleteMany({
      where: { user_id: req.user.id }
    });

    const fullOrder = await prisma.orders_order.findUnique({
      where: { id: order.id },
      ...orderInclude
    });

    res.status(201).json(formatOrder(fullOrder));
  } catch (err) {
    next(err);
  }
}

async function getOrderDetail(req, res, next) {
  try {
    const { id } = req.params;
    const order = await prisma.orders_order.findUnique({
      where: { id: BigInt(id), user_id: req.user.id },
      ...orderInclude
    });

    if (!order) {
      return res.status(404).json({ detail: 'Order not found.' });
    }

    res.status(200).json(formatOrder(order));
  } catch (err) {
    next(err);
  }
}

async function reviewOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({ detail: 'Rating is required.' });
    }

    const order = await prisma.orders_order.findUnique({
      where: { id: BigInt(id), user_id: req.user.id },
      include: {
        orders_orderitem: true
      }
    });

    if (!order) {
      return res.status(404).json({ detail: 'Order not found.' });
    }
    if (order.status !== 'Completed') {
      return res.status(400).json({ detail: 'You can only review completed orders.' });
    }
    if (order.is_reviewed) {
      return res.status(400).json({ detail: 'This order has already been reviewed.' });
    }

    // Get unique foods in this order
    const foodIds = [...new Set(order.orders_orderitem.map(item => item.food_id).filter(Boolean))];

    let reviewsCreated = 0;
    for (const foodId of foodIds) {
      await prisma.foods_review.create({
        data: {
          user_id: req.user.id,
          food_id: foodId,
          rating: parseInt(rating, 10),
          comment: comment || '',
          created_at: new Date()
        }
      });
      reviewsCreated++;
    }

    if (reviewsCreated > 0) {
      await prisma.orders_order.update({
        where: { id: order.id },
        data: { is_reviewed: true }
      });
    }

    res.status(201).json({ detail: `Successfully reviewed ${reviewsCreated} items.` });
  } catch (err) {
    next(err);
  }
}

// --------------------- Admin Methods ---------------------

async function adminListOrders(req, res, next) {
  try {
    const orders = await prisma.orders_order.findMany({
      ...orderInclude,
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json(orders.map(formatOrder));
  } catch (err) {
    next(err);
  }
}

async function adminUpdateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ detail: 'Status is required.' });
    }

    const updated = await prisma.orders_order.update({
      where: { id: BigInt(id) },
      data: { status },
      ...orderInclude
    });

    res.status(200).json(formatOrder(updated));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCart,
  addToCart,
  deleteCartItem,
  listWishlist,
  addToWishlist,
  deleteWishlistItem,
  listOrders,
  createOrder,
  getOrderDetail,
  reviewOrder,
  adminListOrders,
  adminUpdateOrderStatus
};
