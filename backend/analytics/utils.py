from datetime import timedelta
from django.utils import timezone
import calendar

def get_period_dates(period='daily'):
    """
    Returns start_date, current_period_start, previous_period_start based on the filter.
    """
    now = timezone.now()
    today = now.date()

    if period == 'yearly':
        start_date = (now - timedelta(days=365*5)).date()
        current_period_start = today.replace(day=1, month=1)
        previous_period_start = current_period_start.replace(year=current_period_start.year - 1)
    elif period == 'monthly':
        start_date = (now - timedelta(days=365)).date()
        current_period_start = today.replace(day=1)
        # Handle january edge case for previous month
        try:
            previous_period_start = (current_period_start - timedelta(days=1)).replace(day=1)
        except ValueError:
            previous_period_start = current_period_start.replace(month=12, year=current_period_start.year-1, day=1)
    elif period == 'weekly':
        start_date = (now - timedelta(days=28)).date()
        current_period_start = today - timedelta(days=today.weekday())
        previous_period_start = current_period_start - timedelta(days=7)
    else: # daily
        start_date = today - timedelta(days=6)
        current_period_start = today
        previous_period_start = today - timedelta(days=1)
        
    return start_date, current_period_start, previous_period_start

def filter_by_period(qs, date_field, period, is_current=True):
    """
    Filter queryset based on period string.
    """
    _, current_start, prev_start = get_period_dates(period)
    target = current_start if is_current else prev_start
    
    if period == 'yearly':
        return qs.filter(**{f"{date_field}__year": target.year})
    elif period == 'monthly':
        return qs.filter(**{f"{date_field}__year": target.year, f"{date_field}__month": target.month})
    elif period == 'weekly':
        if is_current:
            return qs.filter(**{f"{date_field}__date__gte": current_start})
        else:
            return qs.filter(**{f"{date_field}__date__gte": prev_start, f"{date_field}__date__lt": current_start})
    else:
        return qs.filter(**{f"{date_field}__date": target})

def cap_funnel_stages(*args):
    """
    Enforces Step(N+1) <= Step(N).
    Takes a list of values from top of funnel to bottom.
    Returns capped list.
    """
    if not args:
        return []
    
    result = [args[0]]
    for val in args[1:]:
        result.append(min(val, result[-1]))
    return result
