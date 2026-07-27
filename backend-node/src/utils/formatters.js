function formatReview(review) {
  if (!review) return null;
  return {
    id: Number(review.id),
    user: Number(review.user_id),
    user_name: review.users_user ? review.users_user.first_name || '' : '',
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at
  };
}

function formatFood(food) {
  if (!food) return null;
  return {
    id: Number(food.id),
    name: food.name,
    category: Number(food.category_id),
    category_name: food.foods_category ? food.foods_category.name : '',
    description: food.description || '',
    price: food.price.toString(),
    image: food.image ? `/media/${food.image}` : null,
    is_available: food.is_available,
    is_featured: food.is_featured,
    is_trending: food.is_trending,
    has_3d_model: food.has_3d_model,
    created_at: food.created_at,
    reviews: food.foods_review ? food.foods_review.map(formatReview) : []
  };
}

function formatCartItem(item) {
  if (!item) return null;
  return {
    id: Number(item.id),
    user: Number(item.user_id),
    food: Number(item.food_id),
    food_details: formatFood(item.foods_food),
    size: item.size,
    quantity: item.quantity,
    created_at: item.created_at
  };
}

function formatWishlistItem(item) {
  if (!item) return null;
  return {
    id: Number(item.id),
    user: Number(item.user_id),
    food: Number(item.food_id),
    food_details: formatFood(item.foods_food),
    created_at: item.created_at
  };
}

function formatOrderItem(item) {
  if (!item) return null;
  return {
    id: Number(item.id),
    order: Number(item.order_id),
    food: Number(item.food_id),
    food_details: formatFood(item.foods_food),
    size: item.size,
    quantity: item.quantity,
    price: item.price.toString()
  };
}

function formatOrder(order) {
  if (!order) return null;
  return {
    id: Number(order.id),
    user: Number(order.user_id),
    status: order.status,
    total_amount: order.total_amount.toString(),
    delivery_fee: order.delivery_fee.toString(),
    discount: order.discount.toString(),
    address: order.address,
    payment_method: order.payment_method,
    is_reviewed: order.is_reviewed,
    created_at: order.created_at,
    items: order.orders_orderitem ? order.orders_orderitem.map(formatOrderItem) : []
  };
}

module.exports = {
  formatReview,
  formatFood,
  formatCartItem,
  formatWishlistItem,
  formatOrderItem,
  formatOrder
};
