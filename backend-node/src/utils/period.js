/**
 * Utility functions for date calculations matching Django's period filters.
 */
function getPeriodDates(period = 'daily') {
  const now = new Date();
  // Strip time for clean date comparisons
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let start_date;
  let current_period_start;
  let previous_period_start;

  if (period === 'yearly') {
    start_date = new Date(today);
    start_date.setDate(start_date.getDate() - 365 * 5);
    current_period_start = new Date(today.getFullYear(), 0, 1);
    previous_period_start = new Date(today.getFullYear() - 1, 0, 1);
  } else if (period === 'monthly') {
    start_date = new Date(today);
    start_date.setDate(start_date.getDate() - 365);
    current_period_start = new Date(today.getFullYear(), today.getMonth(), 1);
    previous_period_start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  } else if (period === 'weekly') {
    start_date = new Date(today);
    start_date.setDate(start_date.getDate() - 28);
    
    // JS getDay(): 0 is Sunday, 1 is Monday. Convert to Monday-start (0-6)
    const day = today.getDay();
    const distanceToMonday = day === 0 ? 6 : day - 1;
    
    current_period_start = new Date(today);
    current_period_start.setDate(today.getDate() - distanceToMonday);
    
    previous_period_start = new Date(current_period_start);
    previous_period_start.setDate(previous_period_start.getDate() - 7);
  } else { // daily
    start_date = new Date(today);
    start_date.setDate(start_date.getDate() - 6);
    current_period_start = new Date(today);
    previous_period_start = new Date(today);
    previous_period_start.setDate(previous_period_start.getDate() - 1);
  }

  return { start_date, current_period_start, previous_period_start };
}

/**
 * Filter an array or return prisma where clauses based on dates
 */
function getPeriodFilter(dateField, period, isCurrent = true) {
  const { current_period_start, previous_period_start } = getPeriodDates(period);
  const target = isCurrent ? current_period_start : previous_period_start;

  if (period === 'yearly') {
    return {
      [dateField]: {
        gte: new Date(target.getFullYear(), 0, 1),
        lt: new Date(target.getFullYear() + 1, 0, 1)
      }
    };
  } else if (period === 'monthly') {
    return {
      [dateField]: {
        gte: new Date(target.getFullYear(), target.getMonth(), 1),
        lt: new Date(target.getFullYear(), target.getMonth() + 1, 1)
      }
    };
  } else if (period === 'weekly') {
    const end = new Date(target);
    end.setDate(end.getDate() + 7);
    return {
      [dateField]: {
        gte: target,
        lt: end
      }
    };
  } else { // daily
    const end = new Date(target);
    end.setDate(end.getDate() + 1);
    return {
      [dateField]: {
        gte: target,
        lt: end
      }
    };
  }
}

module.exports = {
  getPeriodDates,
  getPeriodFilter
};
